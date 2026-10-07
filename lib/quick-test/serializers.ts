import type { QuickTestAnswer, QuickTestAttempt, QuickTestQuestion } from "@prisma/client"
import { getRemainingSeconds, isFinalStatus, nowSeconds, toCandidateState } from "@/lib/quick-test/rules"

type PublicQuestion = Pick<QuickTestQuestion, "id" | "question" | "options" | "points" | "order">

/** Candidate-facing question. Never include `correctOption`. */
export function serializeQuickTestQuestion(question: PublicQuestion) {
  return {
    id: question.id.toString(),
    question: question.question,
    options: question.options as string[],
    points: question.points,
    order: question.order,
  }
}

/** Candidate-facing attempt. The score is only exposed once the attempt is finalised. */
export function serializeCandidateAttempt(attempt: QuickTestAttempt, nowSec: number = nowSeconds()) {
  const final = isFinalStatus(attempt.status)
  return {
    id: attempt.id.toString(),
    jobId: attempt.jobId.toString(),
    status: attempt.status,
    state: toCandidateState(attempt.status),
    questionCount: attempt.questionCount,
    timeLimitMinutes: attempt.timeLimitMinutes,
    startedAt: attempt.startedAt.toString(),
    expiresAt: attempt.expiresAt.toString(),
    submittedAt: attempt.submittedAt?.toString() ?? null,
    remainingSeconds: final ? 0 : getRemainingSeconds(attempt.expiresAt, nowSec),
    scorePercent: final ? attempt.scorePercent : null,
    scoredPoints: final ? attempt.scoredPoints : null,
    maxPoints: attempt.maxPoints,
  }
}

export function serializeSavedAnswers(answers: Array<Pick<QuickTestAnswer, "questionId" | "selectedOption">>) {
  const saved: Record<string, string> = {}
  for (const answer of answers) {
    saved[answer.questionId.toString()] = answer.selectedOption
  }
  return saved
}

export function serializeQuickTestConfig(config: {
  isEnabled: boolean
  questionCount: number
  timeLimitMinutes: number
}) {
  return {
    enabled: config.isEnabled,
    questionCount: config.questionCount,
    timeLimitMinutes: config.timeLimitMinutes,
  }
}

type AdminAttemptRow = QuickTestAttempt & {
  user: { id: bigint; firstname: string; lastname: string; email: string; avatar: string | null }
  questions?: Array<{ points: number }>
  _correctCount?: number
}

export function serializeAdminAttemptRow(attempt: AdminAttemptRow, applied: boolean) {
  const durationSeconds =
    attempt.submittedAt != null ? Math.max(0, Number(attempt.submittedAt - attempt.startedAt)) : null
  return {
    id: attempt.id.toString(),
    candidateId: attempt.userId.toString(),
    candidateName: `${attempt.user.firstname} ${attempt.user.lastname}`.trim(),
    candidateEmail: attempt.user.email,
    avatar: attempt.user.avatar,
    status: attempt.status,
    scorePercent: isFinalStatus(attempt.status) ? attempt.scorePercent : null,
    correctCount: attempt._correctCount ?? null,
    questionCount: attempt.questionCount,
    timeLimitMinutes: attempt.timeLimitMinutes,
    durationSeconds,
    startedAt: attempt.startedAt.toString(),
    submittedAt: attempt.submittedAt?.toString() ?? null,
    applied,
  }
}

export function serializeAdminAttemptDetail(
  attempt: QuickTestAttempt,
  questions: QuickTestQuestion[],
  answers: QuickTestAnswer[]
) {
  const answerByQuestion = new Map(answers.map((a) => [a.questionId.toString(), a]))
  return {
    id: attempt.id.toString(),
    status: attempt.status,
    scorePercent: attempt.scorePercent,
    scoredPoints: attempt.scoredPoints,
    maxPoints: attempt.maxPoints,
    aiModel: attempt.aiModel,
    startedAt: attempt.startedAt.toString(),
    submittedAt: attempt.submittedAt?.toString() ?? null,
    questions: questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((question) => {
        const answer = answerByQuestion.get(question.id.toString())
        return {
          id: question.id.toString(),
          order: question.order,
          question: question.question,
          options: question.options as string[],
          correctOption: question.correctOption,
          points: question.points,
          selectedOption: answer?.selectedOption ?? null,
          isCorrect: answer ? answer.isCorrect : false,
          pointsAwarded: answer?.pointsAwarded ?? 0,
        }
      }),
  }
}
