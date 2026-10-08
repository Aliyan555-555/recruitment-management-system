import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { requireCandidate } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { getAiModelName } from "@/lib/ai/ai-config"
import { checkRateLimit } from "@/lib/rate-limit"
import { ensureJobStatusCurrent } from "@/lib/middleware/job-status-check"
import {
  QuickTestGenerationError,
  generateQuickTestQuestions,
} from "@/lib/ai/quick-test-generator"
import {
  getCurrentAttempt,
  getEnabledQuickTest,
} from "@/lib/services/quick-test-service"
import {
  serializeCandidateAttempt,
  serializeQuickTestQuestion,
  serializeSavedAnswers,
} from "@/lib/quick-test/serializers"
import {
  QUICK_TEST_LIMITS,
  computeExpiresAt,
  isFinalStatus,
  nowSeconds,
} from "@/lib/quick-test/rules"

export const runtime = "nodejs"
export const maxDuration = 60

async function buildAttemptResponse(attemptId: bigint) {
  const attempt = await prisma.quickTestAttempt.findUnique({
    where: { id: attemptId },
    include: {
      questions: { orderBy: { order: "asc" } },
      answers: { select: { questionId: true, selectedOption: true } },
    },
  })
  if (!attempt) return null

  const final = isFinalStatus(attempt.status)
  return {
    attempt: serializeCandidateAttempt(attempt),
    // Finished tests never re-expose their questions.
    questions: final ? [] : attempt.questions.map(serializeQuickTestQuestion),
    savedAnswers: final ? {} : serializeSavedAnswers(attempt.answers),
  }
}

/**
 * Starts (or resumes) the candidate's single quick test attempt for a job.
 * Idempotent: calling it again returns the same attempt with the remaining time.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCandidate()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Candidate access required" }, { status: 401 })
    }

    let jobId: bigint
    try {
      jobId = BigInt(params.id)
    } catch {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 })
    }
    const userId = BigInt(user.id)

    const config = await getEnabledQuickTest(jobId)
    if (!config) {
      return NextResponse.json({ error: "This job does not have a quick test" }, { status: 404 })
    }

    // Resume or report an existing attempt before any eligibility checks that could block it.
    const existing = await getCurrentAttempt(jobId, userId)
    if (existing) {
      const response = await buildAttemptResponse(existing.id)
      return NextResponse.json({ ...response, resumed: true })
    }

    await ensureJobStatusCurrent(jobId)
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        description: true,
        successCriteria: true,
        minimumExperience: true,
        status: true,
        jobStatus: true,
        deletedAt: true,
        skills: { select: { skillName: true, priority: true } },
      },
    })

    if (!job || job.deletedAt != null || !job.status) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }
    if (job.jobStatus !== "ACTIVE") {
      return NextResponse.json(
        { error: "This job is no longer accepting applications", code: "JOB_CLOSED" },
        { status: 400 }
      )
    }

    const alreadyApplied = await prisma.jobsApplied.findUnique({
      where: { jobId_userId: { jobId, userId } },
      select: { id: true },
    })
    if (alreadyApplied) {
      return NextResponse.json(
        { error: "You have already applied for this job", code: "ALREADY_APPLIED" },
        { status: 409 }
      )
    }

    const rateLimit = checkRateLimit(
      `quick-test-start:${user.id}`,
      QUICK_TEST_LIMITS.startRateLimit.maxRequests,
      QUICK_TEST_LIMITS.startRateLimit.windowMs
    )
    if (rateLimit.limited) {
      return NextResponse.json(
        { error: "Too many quick test requests. Please try again later.", code: "RATE_LIMITED" },
        { status: 429 }
      )
    }

    // Generate before creating the attempt so a failure never consumes the candidate's single attempt
    // and generation latency does not count against their time limit.
    let generated
    try {
      generated = await generateQuickTestQuestions(
        {
          title: job.title,
          description: job.description,
          successCriteria: job.successCriteria,
          minimumExperience: job.minimumExperience,
          skills: job.skills.map((skill) => ({ name: skill.skillName, priority: skill.priority })),
        },
        config.questionCount
      )
    } catch (error) {
      console.error("[Quick Test] Question generation failed:", error)
      const message =
        error instanceof QuickTestGenerationError
          ? error.message
          : "Question generation is temporarily unavailable"
      return NextResponse.json(
        {
          error: `We could not prepare your quick test (${message}). Please try again in a moment. Your attempt has not been used.`,
          code: "QUICK_TEST_GENERATION_FAILED",
        },
        { status: 503 }
      )
    }

    const startedAt = nowSeconds()
    const now = BigInt(startedAt)

    try {
      const attempt = await prisma.quickTestAttempt.create({
        data: {
          jobId,
          userId,
          status: "IN_PROGRESS",
          questionCount: generated.questions.length,
          timeLimitMinutes: config.timeLimitMinutes,
          maxPoints: QUICK_TEST_LIMITS.maxPoints,
          aiModel: generated.source === "ai" ? await getAiModelName() : "curated",
          startedAt: now,
          expiresAt: BigInt(computeExpiresAt(startedAt, config.timeLimitMinutes)),
          createdAt: now,
          updatedAt: now,
          questions: {
            create: generated.questions.map((question, index) => ({
              question: question.question,
              options: question.options,
              correctOption: question.correct,
              points: question.points,
              order: index + 1,
            })),
          },
        },
        select: { id: true },
      })

      const response = await buildAttemptResponse(attempt.id)
      return NextResponse.json({ ...response, resumed: false }, { status: 201 })
    } catch (error) {
      // Two tabs started at once: the unique (jobId, userId) index lets only one win.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const winner = await getCurrentAttempt(jobId, userId)
        if (winner) {
          const response = await buildAttemptResponse(winner.id)
          return NextResponse.json({ ...response, resumed: true })
        }
      }
      throw error
    }
  } catch (error) {
    console.error("[Quick Test] Failed to start:", error)
    const detail = error instanceof Error && error.message ? error.message.split("\n").pop()?.trim() : ""
    return NextResponse.json(
      { error: `Failed to start the quick test${detail ? `: ${detail}` : ""}`, code: "QUICK_TEST_START_FAILED" },
      { status: 500 }
    )
  }
}
