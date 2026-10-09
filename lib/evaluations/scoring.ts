/**
 * Scoring + aggregation of interviewer scorecards (StageEvaluation.formData). Pure and unit-tested.
 *
 * Supported shapes:
 *  - skills scorecard (screening / final interview): { skills: { key: { rating, max? } }, recommendedToHire, comments }
 *  - panel behaviours (focus group, current):        { focusGroup: { panel: { behaviors: [{ rating 1-4 }] } }, recommendedToHire }
 *  - legacy focus group (admin-entered):             { focusGroup: { internal, external } } (each with score/maxScore)
 */

export const DEFAULT_SKILL_MAX: Record<string, number> = {
  appearance: 10,
  education: 10,
  intellectual: 10,
  leadership: 10,
  principles: 10,
  itSkills: 10,
  communication: 10,
  commitment: 10,
  assertiveness: 10,
  versatility: 10,
  professionalKnowledge: 25,
  experience: 25,
}

export const BEHAVIOR_MAX_RATING = 4

export type Recommendation = "HIRE" | "NO_HIRE"

export interface ScoreResult {
  total: number
  max: number
  percentage: number
}

export function isRecommended(value: unknown): boolean {
  return value === "Recommended" || value === "yes" || value === "HIRE" || value === true
}

function pct(total: number, max: number): number {
  return max > 0 ? Math.round((total / max) * 100) : 0
}

export function scoreSkillsForm(formData: any): ScoreResult {
  let total = 0
  let max = 0
  for (const [key, skill] of Object.entries<any>(formData?.skills ?? {})) {
    total += Number(skill?.rating ?? 0)
    max += Number(skill?.max ?? DEFAULT_SKILL_MAX[key] ?? 10)
  }
  return { total, max, percentage: pct(total, max) }
}

export function scoreBehaviors(behaviors: Array<{ rating?: unknown }> | undefined): ScoreResult {
  const list = behaviors ?? []
  const total = list.reduce((sum, b) => sum + Number(b?.rating ?? 0), 0)
  const max = list.length * BEHAVIOR_MAX_RATING
  return { total, max, percentage: pct(total, max) }
}

/** Score of one scorecard of any supported shape, or null if the form has no scoreable content. */
export function scoreFormData(formData: any): (ScoreResult & { kind: "skills" | "panel" | "legacy-focus-group" }) | null {
  if (!formData || typeof formData !== "object") return null

  const panel = formData.focusGroup?.panel
  if (panel?.behaviors) return { ...scoreBehaviors(panel.behaviors), kind: "panel" }

  const internal = formData.focusGroup?.internal
  const external = formData.focusGroup?.external
  if (internal || external) {
    const total = Number(internal?.score ?? 0) + Number(external?.score ?? 0)
    const max = Number(internal?.maxScore ?? 0) + Number(external?.maxScore ?? 0)
    return { total, max, percentage: pct(total, max), kind: "legacy-focus-group" }
  }

  if (formData.skills) return { ...scoreSkillsForm(formData), kind: "skills" }
  return null
}

export interface EvaluationLike {
  evaluatorName?: string
  submittedAt: bigint | number | null
  recommendation?: string | null
  formData: unknown
}

export interface AggregatedEvaluation {
  /** scorecards that are submitted (drafts do not count) */
  submittedCount: number
  /** average of submitted scorecards */
  score: number
  maxScore: number
  scorePercentage: number
  recommendation: Recommendation | null
  /** submitted scorecards disagree and no side has a majority */
  isSplit: boolean
  hireVotes: number
  noHireVotes: number
}

function recommendationOf(e: EvaluationLike, scored: ReturnType<typeof scoreFormData>): Recommendation | null {
  const fd = e.formData as any
  if (fd?.recommendedToHire !== undefined && fd?.recommendedToHire !== null && fd?.recommendedToHire !== "") {
    return isRecommended(fd.recommendedToHire) ? "HIRE" : "NO_HIRE"
  }
  if (e.recommendation === "HIRE" || e.recommendation === "STRONG_HIRE") return "HIRE"
  if (e.recommendation === "NO_HIRE" || e.recommendation === "STRONG_NO_HIRE") return "NO_HIRE"
  if (scored?.kind === "legacy-focus-group") {
    const both = fd.focusGroup?.internal?.submittedAt && fd.focusGroup?.external?.submittedAt
    return both ? (scored.percentage >= 50 ? "HIRE" : "NO_HIRE") : null
  }
  return null
}

export function aggregateEvaluations(evaluations: EvaluationLike[]): AggregatedEvaluation {
  const submitted = evaluations.filter((e) => e.submittedAt !== null && e.submittedAt !== undefined)
  let score = 0
  let maxScore = 0
  let hire = 0
  let noHire = 0
  let counted = 0

  for (const e of submitted) {
    const scored = scoreFormData(e.formData)
    if (scored) {
      score += scored.total
      maxScore += scored.max
      counted++
    }
    const rec = recommendationOf(e, scored)
    if (rec === "HIRE") hire++
    else if (rec === "NO_HIRE") noHire++
  }

  const avgScore = counted > 0 ? Math.round((score / counted) * 10) / 10 : 0
  const avgMax = counted > 0 ? Math.round((maxScore / counted) * 10) / 10 : 0
  const isSplit = hire > 0 && hire === noHire
  return {
    submittedCount: submitted.length,
    score: avgScore,
    maxScore: avgMax,
    scorePercentage: pct(score, maxScore),
    recommendation: hire === noHire ? null : hire > noHire ? "HIRE" : "NO_HIRE",
    isSplit,
    hireVotes: hire,
    noHireVotes: noHire,
  }
}

export function validateSkillsForm(formData: any): string | null {
  if (!formData) return "Form data is required"
  if (!formData.skills || Object.keys(formData.skills).length === 0) return "Skills are required"
  for (const key of Object.keys(DEFAULT_SKILL_MAX)) {
    const rating = formData.skills?.[key]?.rating
    if (rating === undefined || rating === null) return "All skill ratings are required"
    const max = Number(formData.skills?.[key]?.max ?? DEFAULT_SKILL_MAX[key])
    if (!Number.isFinite(Number(rating)) || Number(rating) < 0 || Number(rating) > max) {
      return "Ratings must be within the allowed range"
    }
  }
  if (!formData.recommendedToHire) return "Recommendation is required"
  return null
}

export function validatePanelForm(formData: any): string | null {
  const behaviors = formData?.focusGroup?.panel?.behaviors
  if (!Array.isArray(behaviors) || behaviors.length === 0) return "Behaviours are required"
  for (const b of behaviors) {
    const rating = Number(b?.rating)
    if (b?.rating === undefined || b?.rating === null || !Number.isInteger(rating) || rating < 1 || rating > BEHAVIOR_MAX_RATING) {
      return `Each behaviour needs a rating from 1 to ${BEHAVIOR_MAX_RATING}`
    }
  }
  if (!formData.recommendedToHire) return "Recommendation is required"
  return null
}
