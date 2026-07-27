import { calculateScorePercentage } from "@/lib/assessments/scoring"

type AssessmentScoreFields = {
  scoredPoints: number | null
  maxPoints: number
}

export function getSkillPercentageFromAssessment(
  assessment: AssessmentScoreFields | null | undefined
): number | null {
  if (!assessment) return null
  return calculateScorePercentage(assessment.scoredPoints, assessment.maxPoints)
}

export function buildSkillPercentageMap(
  assessments: Array<{ id: bigint } & AssessmentScoreFields>
): Map<string, number | null> {
  return new Map(
    assessments.map((assessment) => [
      assessment.id.toString(),
      getSkillPercentageFromAssessment(assessment),
    ])
  )
}
