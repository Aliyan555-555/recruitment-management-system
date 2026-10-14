// Deterministic ATS score (0-100) for every candidate that passes the hard filters. Pure (no DB / AI):
// it ranks the whole applicant pool for free so only the best candidates are sent to the AI.
import { ATS_WEIGHTS } from "@/lib/ai-shortlist/config"
import { DeterministicMatch } from "@/lib/ai-shortlist/deterministic"

export interface AtsJobInput {
  title: string
  requiredSkills: string[]
  minExperienceYears: number | null
  minEducationRank: number | null
  /** Fields of study named in the job's education requirements (e.g. "Computer Science"). */
  educationFields: string[]
}

export interface AtsCandidateInput {
  experienceYears: number | null
  experienceTitles: string[]
  highestEducationRank: number | null
  majors: string[]
  skillCount: number
  educationCount: number
  hasBio: boolean
  hasCertifications: boolean
}

export type AtsComponent = keyof typeof ATS_WEIGHTS
/** Per-component score 0-100; null when the component has no data and was left out. */
export type AtsBreakdown = Record<AtsComponent, number | null>

export interface AtsResult {
  atsScore: number
  breakdown: AtsBreakdown
}

const STOP_WORDS = new Set([
  "and", "the", "for", "with", "of", "in", "at", "to", "a", "an", "or",
  "senior", "junior", "sr", "jr", "lead", "intern", "trainee", "associate", "assistant", "officer", "executive", "staff",
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))
}

/** Share (0-1) of the job's title/skill keywords that appear in the candidate's past job titles. */
export function titleRelevance(job: Pick<AtsJobInput, "title" | "requiredSkills">, experienceTitles: string[]): number {
  const jobTokens = new Set([...tokenize(job.title), ...job.requiredSkills.flatMap(tokenize)])
  if (jobTokens.size === 0 || experienceTitles.length === 0) return 0
  const candTokens = new Set(experienceTitles.flatMap(tokenize))
  const titleTokens = tokenize(job.title)
  // A past title that shares a word with the job title is a strong signal on its own.
  const titleHit = titleTokens.some((t) => candTokens.has(t))
  let hits = 0
  jobTokens.forEach((t) => {
    if (candTokens.has(t)) hits++
  })
  return Math.min(1, (titleHit ? 0.6 : 0) + hits / jobTokens.size)
}

const clamp = (n: number) => Math.max(0, Math.min(100, n))

function experienceComponent(job: AtsJobInput, cand: AtsCandidateInput): number {
  const years = cand.experienceYears ?? 0
  const min = job.minExperienceYears ?? 0
  const yearsScore = min > 0 ? clamp((years / min) * 100) : clamp(50 + years * 10)
  const relevance = titleRelevance(job, cand.experienceTitles) * 100
  return Math.round(0.6 * yearsScore + 0.4 * relevance)
}

function educationComponent(job: AtsJobInput, cand: AtsCandidateInput): number | null {
  if (cand.educationCount === 0) return job.minEducationRank ? 0 : null
  let level: number
  if (job.minEducationRank && job.minEducationRank > 0) {
    if (cand.highestEducationRank == null) level = 50
    else if (cand.highestEducationRank >= job.minEducationRank) level = 100
    else level = clamp((cand.highestEducationRank / job.minEducationRank) * 70)
  } else {
    level = cand.highestEducationRank != null ? 80 : 60
  }
  const fieldTokens = new Set(job.educationFields.flatMap(tokenize))
  if (fieldTokens.size === 0) return Math.round(level)
  const fieldMatch = cand.majors.flatMap(tokenize).some((t) => fieldTokens.has(t))
  return Math.round(0.7 * level + 0.3 * (fieldMatch ? 100 : 30))
}

export function computeAtsScore(
  match: DeterministicMatch,
  job: AtsJobInput,
  cand: AtsCandidateInput,
  weights: Record<AtsComponent, number> = ATS_WEIGHTS
): AtsResult {
  const reqCount = match.matchedRequiredSkills.length + match.missingRequiredSkills.length
  const prefCount = match.matchedPreferredSkills.length + match.missingPreferredSkills.length
  const assessed = match.assessmentAggregate.assessedSkillCount > 0 ? match.assessmentAggregate.averagePercentage : null
  const completenessParts = [
    cand.skillCount > 0,
    cand.experienceTitles.length > 0,
    cand.educationCount > 0,
    cand.hasBio,
    cand.hasCertifications,
  ]

  const breakdown: AtsBreakdown = {
    requiredSkills: reqCount > 0 ? Math.round(match.requiredSkillCoverage * 100) : null,
    preferredSkills: prefCount > 0 ? Math.round(match.preferredSkillCoverage * 100) : null,
    assessment: assessed,
    quickTest: match.quickTestScore ?? null,
    experience: experienceComponent(job, cand),
    education: educationComponent(job, cand),
    completeness: Math.round((completenessParts.filter(Boolean).length / completenessParts.length) * 100),
  }

  // Components without data are dropped and the remaining weights renormalised (a missing
  // assessment never counts as zero), matching combineShortlistScore.
  let sum = 0
  let weightSum = 0
  for (const key of Object.keys(weights) as AtsComponent[]) {
    const v = breakdown[key]
    if (v === null) continue
    sum += v * weights[key]
    weightSum += weights[key]
  }
  const atsScore = weightSum > 0 ? Math.round(clamp(sum / weightSum)) : 0
  return { atsScore, breakdown }
}

/** Highest ATS first; ties broken by required-skill coverage, then assessment score. */
export function compareAts(a: AtsResult, b: AtsResult): number {
  return (
    b.atsScore - a.atsScore ||
    (b.breakdown.requiredSkills ?? -1) - (a.breakdown.requiredSkills ?? -1) ||
    (b.breakdown.assessment ?? -1) - (a.breakdown.assessment ?? -1)
  )
}

/** Picks who goes to the AI: the best `topK` candidates with at least `minScore`. */
export function selectForAi<T extends { ats: AtsResult }>(ranked: T[], topK: number, minScore: number): T[] {
  return [...ranked].sort((a, b) => compareAts(a.ats, b.ats)).filter((r) => r.ats.atsScore >= minScore).slice(0, topK)
}
