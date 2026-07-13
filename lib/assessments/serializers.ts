import type {
  AssessmentQuestion,
  SkillAssessment,
  SkillAssessmentStatus,
  VerifiedSkillLevel,
} from "@prisma/client"

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
  level: VerifiedSkillLevel | null
): string {
  if (status === "PASSED" && level) {
    if (level === "BEGINNER") {
      return "You passed, but your skill is still at Beginner level. Keep practicing and use your remaining attempts to improve."
    }

    return `Great work. You verified this skill at the ${level.toLowerCase()} level.`
  }

  if (status === "FAILED") {
    return "You didn't meet the minimum score for this skill yet. Review the material and try again when you're ready."
  }

  if (status === "EXPIRED") {
    return "This assessment session expired. You can start a fresh attempt when eligible."
  }

  return "Your assessment is in progress."
}
