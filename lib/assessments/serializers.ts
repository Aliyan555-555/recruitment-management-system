import type {
  AssessmentQuestion,
  SkillAssessment,
  SkillAssessmentStatus,
} from "@prisma/client"
import { calculateScorePercentage } from "@/lib/assessments/scoring"

type QuestionWithOptions = Pick<
  AssessmentQuestion,
  "id" | "question" | "options" | "points" | "order"
>

export function serializeAssessmentQuestion(question: QuestionWithOptions) {
  return {
    id: question.id.toString(),
    question: question.question,
    options: question.options as string[],
    points: question.points,
    order: question.order,
  }
}

export function serializeAssessmentSummary(assessment: SkillAssessment) {
  return {
    id: assessment.id.toString(),
    userSkillId: assessment.userSkillId.toString(),
    userId: assessment.userId.toString(),
    skillName: assessment.skillName,
    status: assessment.status,
    attemptNumber: assessment.attemptNumber,
    minPoints: assessment.minPoints,
    maxPoints: assessment.maxPoints,
    totalPoints: assessment.totalPoints,
    scoredPoints: assessment.scoredPoints,
    scorePercentage: calculateScorePercentage(
      assessment.scoredPoints,
      assessment.maxPoints
    ),
    level: assessment.level,
    passed: assessment.status === "PASSED",
    startedAt: assessment.startedAt.toString(),
    submittedAt: assessment.submittedAt?.toString() ?? null,
    expiresAt: assessment.expiresAt?.toString() ?? null,
    createdAt: assessment.createdAt.toString(),
    updatedAt: assessment.updatedAt.toString(),
  }
}

export function getCandidateResultMessage(
  status: SkillAssessmentStatus,
  scorePercentage: number | null
): string {
  if (status === "PASSED" && scorePercentage != null) {
    if (scorePercentage >= 40) {
      return `Great work. You scored ${scorePercentage}% on this skill assessment.`
    }

    return `You passed with ${scorePercentage}%. Keep practicing and use your remaining attempts to improve your score.`
  }

  if (status === "PASSED") {
    return "Great work. You passed this skill assessment."
  }

  if (status === "FAILED") {
    if (scorePercentage != null) {
      return `You scored ${scorePercentage}%, which is below the minimum required. Review the material and try again when you're ready.`
    }

    return "You didn't meet the minimum score for this skill yet. Review the material and try again when you're ready."
  }

  if (status === "EXPIRED") {
    return "This assessment session expired. You can start a fresh attempt when eligible."
  }

  return "Your assessment is in progress."
}
