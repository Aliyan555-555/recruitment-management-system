// Shapes returned by the Applicants APIs (BigInt -> string, timestamps -> string seconds).
import type { CandidateFilterFacts, ShortlistFilters } from "../ai-shortlist/filters"
import type { ShortlistBlockedReason } from "./shortlist-eligibility"
import type { ApplicantTab } from "./applicant-buckets"

export interface ApplicantAiSummary {
  runId: string
  status: string // COMPLETED | FAILED | FILTERED_OUT | ATS_ONLY | PENDING
  overallScore: number | null
  recommendation: string | null // SHORTLIST | MAYBE | REJECT
  aiConfidence: number | null
  skillsScore: number | null
  experienceScore: number | null
  educationScore: number | null
  mandatoryRequirementsMet: boolean | null
  /** Deterministic ATS score (0-100); set for everyone the run screened. */
  atsScore: number | null
  /** Why an ATS_ONLY candidate was not AI-scored (e.g. quota reached); null when simply below the cut-off. */
  note: string | null
}

export interface ApplicantRow {
  applicationId: string
  candidateId: string
  name: string
  email: string
  phone: string | null
  city: string | null
  avatar: string | null
  appliedAt: string
  tab: ApplicantTab
  actionable: boolean
  actionBlockedReason: ShortlistBlockedReason | null
  statusLabel: string
  reviewFlag: string | null
  hasNote: boolean
  age: number | null
  highestEducation: { level: string; degree: string; institute: string | null } | null
  latestRole: { title: string; company: string | null; isCurrent: boolean } | null
  experienceYears: number | null
  topSkills: { name: string; verified: boolean }[]
  quickTestScore: number | null
  ai: ApplicantAiSummary | null
  filterFacts: CandidateFilterFacts | null
}

export interface ApplicantAiRun {
  id: string
  status: string
  totalCandidates: number
  completedCount: number
  failedCount: number
  atsOnlyCount: number
  filteredOutCount: number
  aiCandidateLimit: number | null
  aiRequestCount: number
  filters: ShortlistFilters | null
  startedAt: string
  completedAt: string | null
  isStale: boolean
  lastError: string | null // reason the most recent failed candidate gave (e.g. AI not configured)
}

export interface ApplicantsResponse {
  job: { id: string; title: string; firstRound: { id: string; stepName: string } | null }
  defaultFilters: ShortlistFilters
  aiRun: ApplicantAiRun | null
  aiRuns: { id: string; status: string; startedAt: string }[]
  applicants: ApplicantRow[]
}

/** Parses "2021-03", "2021-03-15", "Mar 2021", "2021" into a Date; null when unknown. */
export function parseLooseDate(raw: string | null | undefined): Date | null {
  if (!raw) return null
  const s = raw.trim()
  const ym = s.match(/^(\d{4})(?:[-/.](\d{1,2}))?(?:[-/.](\d{1,2}))?$/)
  if (ym) return new Date(Date.UTC(+ym[1], ym[2] ? +ym[2] - 1 : 0, ym[3] ? +ym[3] : 1))
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Total years of experience across roles (rounded to 0.5); null when no dates are usable.
 * Overlapping roles (e.g. a part-time job during a full-time one) are counted once.
 */
export function experienceYears(
  exps: { startDate: string | null; endDate: string | null; isCurrent: boolean }[],
  now: Date = new Date()
): number | null {
  const monthIndex = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth()
  const ranges: [number, number][] = []
  for (const e of exps) {
    const start = parseLooseDate(e.startDate)
    const end = e.isCurrent ? now : parseLooseDate(e.endDate)
    if (!start || !end || end < start) continue
    ranges.push([monthIndex(start), monthIndex(end)])
  }
  if (ranges.length === 0) return null
  ranges.sort((a, b) => a[0] - b[0])
  let months = 0
  let [curStart, curEnd] = ranges[0]
  for (const [s, e] of ranges.slice(1)) {
    if (s <= curEnd) {
      curEnd = Math.max(curEnd, e)
    } else {
      months += curEnd - curStart
      ;[curStart, curEnd] = [s, e]
    }
  }
  months += curEnd - curStart
  return Math.round((months / 12) * 2) / 2
}

export function ageFromDob(dob: string | null | undefined, now: Date = new Date()): number | null {
  if (!dob) return null
  const m = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  let age = now.getUTCFullYear() - +m[1]
  const monthDiff = now.getUTCMonth() + 1 - +m[2]
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < +m[3])) age--
  return age
}
