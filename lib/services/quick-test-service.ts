import type { Prisma, QuickTestAttempt } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { scoreAnswers } from "@/lib/assessments/scoring"
import {
  calculatePercent,
  isFinalStatus,
  isPastDeadline,
  nowSeconds,
  quickTestConfigSchema,
  type QuickTestConfigInput,
} from "@/lib/quick-test/rules"

/** Returns the enabled quick test config for a job, or null when the job has none. */
export async function getEnabledQuickTest(jobId: bigint) {
  const config = await prisma.jobQuickTest.findUnique({ where: { jobId } })
  return config?.isEnabled ? config : null
}

/**
 * Scores the saved answers and moves the attempt to a final status.
 * Idempotent: only the caller that wins the IN_PROGRESS -> final transition writes results.
 */
export async function finalizeAttempt(
  attemptId: bigint,
  finalStatus: "SUBMITTED" | "EXPIRED"
): Promise<QuickTestAttempt | null> {
  const attempt = await prisma.quickTestAttempt.findUnique({
    where: { id: attemptId },
    include: { questions: true, answers: true },
  })

  if (!attempt) return null
  if (isFinalStatus(attempt.status)) {
    const { questions: _q, answers: _a, ...plain } = attempt
    return plain
  }

  const questionsById = new Map(attempt.questions.map((question) => [question.id.toString(), question]))
  const scored = scoreAnswers(
    attempt.answers.flatMap((answer) => {
      const question = questionsById.get(answer.questionId.toString())
      return question
        ? [
            {
              questionId: answer.questionId,
              selectedOption: answer.selectedOption,
              correctOption: question.correctOption,
              points: question.points,
            },
          ]
        : []
    })
  )

  const maxPoints = attempt.questions.reduce((sum, question) => sum + question.points, 0) || attempt.maxPoints
  const now = BigInt(nowSeconds())

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const claim = await tx.quickTestAttempt.updateMany({
      where: { id: attemptId, status: "IN_PROGRESS" },
      data: {
        status: finalStatus,
        maxPoints,
        scoredPoints: scored.scoredPoints,
        scorePercent: calculatePercent(scored.scoredPoints, maxPoints),
        submittedAt: now,
        updatedAt: now,
      },
    })

    if (claim.count === 0) return

    await Promise.all(
      scored.results.map((result) =>
        tx.quickTestAnswer.updateMany({
          where: { attemptId, questionId: result.questionId },
          data: { isCorrect: result.isCorrect, pointsAwarded: result.pointsAwarded, updatedAt: now },
        })
      )
    )
  })

  return prisma.quickTestAttempt.findUnique({ where: { id: attemptId } })
}

/**
 * Lazily finalises an abandoned attempt once its deadline (plus grace) has passed,
 * scoring whatever answers were autosaved. Returns the up-to-date attempt.
 */
export async function ensureAttemptCurrent(attempt: QuickTestAttempt): Promise<QuickTestAttempt> {
  if (isFinalStatus(attempt.status)) return attempt
  if (!isPastDeadline(attempt.expiresAt)) return attempt
  return (await finalizeAttempt(attempt.id, "EXPIRED")) ?? attempt
}

export async function getCurrentAttempt(jobId: bigint, userId: bigint): Promise<QuickTestAttempt | null> {
  const attempt = await prisma.quickTestAttempt.findUnique({
    where: { jobId_userId: { jobId, userId } },
  })
  return attempt ? ensureAttemptCurrent(attempt) : null
}

/** True when the candidate has a finished (submitted or expired) quick test for this job. */
export async function hasCompletedQuickTest(jobId: bigint, userId: bigint): Promise<boolean> {
  const attempt = await getCurrentAttempt(jobId, userId)
  return attempt != null && isFinalStatus(attempt.status)
}

/** Links the candidate's finished attempt to their application. Never throws. */
export async function linkAttemptToApplication(jobId: bigint, userId: bigint, applicationId: bigint) {
  try {
    await prisma.quickTestAttempt.updateMany({
      where: { jobId, userId, applicationId: null },
      data: { applicationId, updatedAt: BigInt(nowSeconds()) },
    })
  } catch (error) {
    console.error("[Quick Test] Failed to link attempt to application:", error)
  }
}

export type SaveAnswerInput = { questionId: string; selectedOption: string }

export class QuickTestAnswerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "QuickTestAnswerError"
  }
}

/**
 * Validates and upserts answers for an in-progress attempt. Each answer must reference a question
 * of this attempt and one of its options. Correctness is only computed when the attempt is finalised.
 */
export async function saveAnswers(attemptId: bigint, answers: SaveAnswerInput[]): Promise<void> {
  if (answers.length === 0) return

  const questions = await prisma.quickTestQuestion.findMany({
    where: { attemptId },
    select: { id: true, options: true },
  })
  const questionsById = new Map(questions.map((question) => [question.id.toString(), question]))
  const now = BigInt(nowSeconds())

  for (const answer of answers) {
    const question = questionsById.get(answer.questionId)
    if (!question) {
      throw new QuickTestAnswerError("Answer references a question that does not belong to this test")
    }
    if (!(question.options as string[]).includes(answer.selectedOption)) {
      throw new QuickTestAnswerError("Selected option is not one of the question's options")
    }
  }

  await prisma.$transaction(
    answers.map((answer) =>
      prisma.quickTestAnswer.upsert({
        where: {
          attemptId_questionId: { attemptId, questionId: BigInt(answer.questionId) },
        },
        create: {
          attemptId,
          questionId: BigInt(answer.questionId),
          selectedOption: answer.selectedOption,
          createdAt: now,
          updatedAt: now,
        },
        update: { selectedOption: answer.selectedOption, updatedAt: now },
      })
    )
  )
}

export type QuickTestConfigParseResult =
  | { ok: true; value: QuickTestConfigInput | null }
  | { ok: false; error: string }

/** Validates the optional `quickTest` payload of the admin job create/update requests. */
export function parseQuickTestConfigInput(raw: unknown): QuickTestConfigParseResult {
  if (raw === undefined || raw === null) return { ok: true, value: null }
  const parsed = quickTestConfigSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: `Quick test: ${parsed.error.errors[0]?.message ?? "invalid configuration"}` }
  }
  return { ok: true, value: parsed.data }
}

/** Creates or updates the job's quick test config. Disabling an unconfigured job is a no-op. */
export async function upsertJobQuickTest(
  tx: Prisma.TransactionClient,
  jobId: bigint,
  config: QuickTestConfigInput
) {
  const now = BigInt(nowSeconds())
  const existing = await tx.jobQuickTest.findUnique({ where: { jobId }, select: { id: true } })

  if (!existing && !config.enabled) return

  const data = {
    isEnabled: config.enabled,
    questionCount: config.questionCount,
    timeLimitMinutes: config.timeLimitMinutes,
    updatedAt: now,
  }

  if (existing) {
    await tx.jobQuickTest.update({ where: { jobId }, data })
  } else {
    await tx.jobQuickTest.create({ data: { jobId, ...data, createdAt: now } })
  }
}
