import { AI_SHORTLIST_THRESHOLDS, AI_SHORTLIST_WEIGHTS } from "@/lib/ai-shortlist/config"
import { DeterministicMatch } from "@/lib/ai-shortlist/deterministic"
import { ShortlistEvaluation } from "@/lib/ai/shortlist-evaluator"

export type RecommendationType = "SHORTLIST" | "MAYBE" | "REJECT"

export interface CombinedScoreResult {
  overallScore: number
  skillsScore: number
  educationScore: number
  experienceScore: number
  successCriteriaScore: number
  assessmentScore: number | null
  mandatoryRequirementsMet: boolean
  aiConfidence: number
  recommendation: RecommendationType
}

export function combineShortlistScore(
  deterministic: DeterministicMatch,
  ai: ShortlistEvaluation,
  weights = AI_SHORTLIST_WEIGHTS,
  thresholds = AI_SHORTLIST_THRESHOLDS
): CombinedScoreResult {
  const reqSkillsScore = deterministic.requiredSkillCoverage * 100
  const prefSkillsScore = deterministic.preferredSkillCoverage * 100
  const eduScore = ai.educationScore
  const expScore = ai.experienceScore
  const succScore = ai.successCriteriaScore
  const assessScore = deterministic.assessmentAggregate.averagePercentage

  // Blended skills score reported to UI
  const blendedSkillsScore = Math.round(0.75 * reqSkillsScore + 0.25 * ai.skillsScore)

  // Weight redistribution if assessment score is null/unassessed
  let wReq: number = weights.requiredSkills
  let wPref: number = weights.preferredSkills
  let wEdu: number = weights.education
  let wExp: number = weights.experience
  let wSucc: number = weights.successCriteria
  let wAssess: number = weights.assessment

  let overallScoreRaw: number

  if (assessScore === null || deterministic.assessmentAggregate.assessedSkillCount === 0) {
    wAssess = 0
    const sumActiveWeights = wReq + wPref + wEdu + wExp + wSucc
    wReq = wReq / sumActiveWeights
    wPref = wPref / sumActiveWeights
    wEdu = wEdu / sumActiveWeights
    wExp = wExp / sumActiveWeights
    wSucc = wSucc / sumActiveWeights

    overallScoreRaw =
      reqSkillsScore * wReq +
      prefSkillsScore * wPref +
      eduScore * wEdu +
      expScore * wExp +
      succScore * wSucc
  } else {
    overallScoreRaw =
      reqSkillsScore * wReq +
      prefSkillsScore * wPref +
      assessScore * wAssess +
      eduScore * wEdu +
      expScore * wExp +
      succScore * wSucc
  }

  // Confidence dampening: score * (0.5 + 0.5 * (confidence / 100))
  const dampenedScore = Math.round(
    overallScoreRaw * (0.5 + 0.5 * (ai.confidence / 100))
  )
  const finalOverallScore = Math.min(100, Math.max(0, dampenedScore))

  // Mandatory requirements check
  const hasNoMissingReqSkills = deterministic.missingRequiredSkills.length === 0
  const isEduSatisfied = ai.educationSatisfied === true || ai.educationSatisfied === null

  const requiredChecklistItems = ai.mandatoryChecklist.filter(
    (item) => item.priority === "REQUIRED"
  )
  const allRequiredChecklistMet = requiredChecklistItems.every(
    (item) => item.met === true
  )

  const mandatoryRequirementsMet =
    hasNoMissingReqSkills && isEduSatisfied && allRequiredChecklistMet

  // Recommendation decision
  let recommendation: RecommendationType
  if (
    finalOverallScore >= thresholds.shortlistMinScore &&
    ai.confidence >= thresholds.minConfidenceForShortlist
  ) {
    recommendation = "SHORTLIST"
  } else if (finalOverallScore >= thresholds.maybeMinScore) {
    recommendation = "MAYBE"
  } else {
    recommendation = "REJECT"
  }

  return {
    overallScore: finalOverallScore,
    skillsScore: blendedSkillsScore,
    educationScore: eduScore,
    experienceScore: expScore,
    successCriteriaScore: succScore,
    assessmentScore: assessScore,
    mandatoryRequirementsMet,
    aiConfidence: ai.confidence,
    recommendation,
  }
}
