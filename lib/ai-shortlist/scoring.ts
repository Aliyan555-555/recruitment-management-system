import {
  AI_SHORTLIST_QUICK_TEST_WEIGHT,
  AI_SHORTLIST_THRESHOLDS,
  AI_SHORTLIST_WEIGHTS,
} from "@/lib/ai-shortlist/config"
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
  quickTestScore: number | null
  mandatoryRequirementsMet: boolean
  aiConfidence: number
  recommendation: RecommendationType
}

export function combineShortlistScore(
  deterministic: DeterministicMatch,
  ai: ShortlistEvaluation,
  weights = AI_SHORTLIST_WEIGHTS,
  thresholds = AI_SHORTLIST_THRESHOLDS,
  quickTestWeight: number = AI_SHORTLIST_QUICK_TEST_WEIGHT
): CombinedScoreResult {
  const reqSkillsScore = deterministic.requiredSkillCoverage * 100
  const prefSkillsScore = deterministic.preferredSkillCoverage * 100
  const eduScore = ai.educationScore
  const expScore = ai.experienceScore
  const succScore = ai.successCriteriaScore
  const assessScore = deterministic.assessmentAggregate.averagePercentage
  const quickTestScore = deterministic.quickTestScore ?? null

  // Blended skills score reported to UI with resilience against missing explicit profile tags
  const effectiveReqSkillsScore =
    reqSkillsScore > 0 ? reqSkillsScore : Math.round(ai.skillsScore * 0.8)
  const blendedSkillsScore = Math.min(
    100,
    Math.round(0.75 * effectiveReqSkillsScore + 0.25 * ai.skillsScore)
  )

  // Components without data are dropped and the remaining weights are renormalised, so a missing
  // assessment (or quick test) never counts as a zero. A present quick test always carries
  // `quickTestWeight` of the total; the other components share the rest.
  const hasAssessment = assessScore !== null && deterministic.assessmentAggregate.assessedSkillCount > 0
  const baseComponents: Array<{ score: number; weight: number }> = [
    { score: effectiveReqSkillsScore, weight: weights.requiredSkills },
    { score: prefSkillsScore, weight: weights.preferredSkills },
    ...(hasAssessment ? [{ score: assessScore as number, weight: weights.assessment }] : []),
    { score: eduScore, weight: weights.education },
    { score: expScore, weight: weights.experience },
    { score: succScore, weight: weights.successCriteria },
  ]
  const rawWeightSum = baseComponents.reduce((sum, component) => sum + component.weight, 0)
  // Skip normalisation when the weights already sum to 1 so results stay identical to the original formula.
  const baseWeightDivisor = Math.abs(rawWeightSum - 1) < 1e-9 ? 1 : rawWeightSum
  const baseShare = quickTestScore !== null ? 1 - quickTestWeight : 1

  let overallScoreRaw = baseComponents.reduce(
    (sum, component) => sum + component.score * (component.weight / baseWeightDivisor) * baseShare,
    0
  )
  if (quickTestScore !== null) {
    overallScoreRaw += quickTestScore * quickTestWeight
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
    quickTestScore,
    mandatoryRequirementsMet,
    aiConfidence: ai.confidence,
    recommendation,
  }
}
