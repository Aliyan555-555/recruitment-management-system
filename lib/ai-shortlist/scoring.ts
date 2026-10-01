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

  // Blended skills score reported to UI with resilience against missing explicit profile tags
  const effectiveReqSkillsScore =
    reqSkillsScore > 0 ? reqSkillsScore : Math.round(ai.skillsScore * 0.8)
  const blendedSkillsScore = Math.min(
    100,
    Math.round(0.75 * effectiveReqSkillsScore + 0.25 * ai.skillsScore)
  )

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
      effectiveReqSkillsScore * wReq +
      prefSkillsScore * wPref +
      eduScore * wEdu +
      expScore * wExp +
      succScore * wSucc
  } else {
    overallScoreRaw =
      effectiveReqSkillsScore * wReq +
      prefSkillsScore * wPref +
      assessScore * wAssess +
      eduScore * wEdu +
      expScore * wExp +
      succScore * wSucc
  }

  // Confidence dampening (calibration based on profile data completeness)
  const confidenceMultiplier = 0.5 + 0.5 * (ai.confidence / 100)
  const dampenedScore = Math.round(overallScoreRaw * confidenceMultiplier)
  const finalOverallScore = Math.min(100, Math.max(0, dampenedScore))

  // Mandatory requirements check (flexible & realistic criteria)
  const hasAdequateReqSkills =
    deterministic.missingRequiredSkills.length === 0 ||
    deterministic.requiredSkillCoverage >= 0.35 ||
    blendedSkillsScore >= 40

  const isEduSatisfied = ai.educationSatisfied !== false

  const requiredChecklistItems = ai.mandatoryChecklist.filter(
    (item) => item.priority === "REQUIRED"
  )
  const metRequiredChecklistCount = requiredChecklistItems.filter(
    (item) => item.met === true
  ).length
  const isChecklistAdequate =
    requiredChecklistItems.length === 0 ||
    metRequiredChecklistCount / requiredChecklistItems.length >= 0.4

  const mandatoryRequirementsMet =
    hasAdequateReqSkills && isEduSatisfied && isChecklistAdequate

  // Recommendation decision: SHORTLIST requires overall score >= shortlistMinScore,
  // AI confidence >= minConfidenceForShortlist, and mandatory requirements met
  // (see docs/AI_SHORTLISTING_CALCULATION_GUIDE.md §3B).
  let recommendation: RecommendationType
  if (!isEduSatisfied) {
    recommendation = "REJECT"
  } else if (
    finalOverallScore >= thresholds.shortlistMinScore &&
    ai.confidence >= thresholds.minConfidenceForShortlist &&
    mandatoryRequirementsMet
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
