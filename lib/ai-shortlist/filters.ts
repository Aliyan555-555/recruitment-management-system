// Deterministic hard filters for AI shortlisting. Pure (no DB / AI) so the same code
// runs on the server (initial run) and in the browser (instant recompute when an admin
// removes or edits a filter chip).

import { InstituteRef, matchInstitute } from "../institutes"

export interface ShortlistFilters {
  ageRange?: { min?: number; max?: number; asOf: string } // asOf: YYYY-MM-DD
  minEducation?: { rank: number; name: string } // highest education level must be at least this
  institutes?: { ids: string[]; names?: string[] } // candidate must have studied at one of these
  minCgpa?: { value: number; scale: number }
}

export type FilterKey = keyof ShortlistFilters

/** Facts stored per candidate; independent of the filters so they can be re-evaluated. */
export interface CandidateFilterFacts {
  dob: string | null // normalized YYYY-MM-DD
  hasEducation?: boolean // at least one education entry on the profile
  highestEducationRank?: number | null // highest level rank (null: entries exist but level unknown)
  highestEducationName?: string | null
  instituteIds: string[] // known institutes the candidate's educations resolve to
  hasInstituteText: boolean // typed an institute (even if it could not be resolved)
  cgpa: { value: number; scale: number } | null // best grade across educations
}

export type FilterOutcome = "PASS" | "FAIL" | "UNKNOWN"
export type FilterBucket = "PASSED" | "NEEDS_REVIEW" | "FILTERED_OUT"

export interface FilterEvaluation {
  bucket: FilterBucket
  checks: { key: FilterKey; outcome: FilterOutcome; reason: string }[]
}

export function parseDateOfBirth(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  let y: number, m: number, d: number
  let match = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (match) {
    y = +match[1]; m = +match[2]; d = +match[3]
  } else if ((match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) {
    d = +match[1]; m = +match[2]; y = +match[3]
  } else {
    return null
  }
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

export function computeAge(dob: string, asOf: string): number | null {
  const b = dob.split("-").map(Number)
  const a = asOf.split("-").map(Number)
  if (b.length !== 3 || a.length !== 3 || [...a, ...b].some(Number.isNaN)) return null
  let age = a[0] - b[0]
  if (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])) age -= 1
  return age
}

/** Parses "3.5", "3.5/4", "85%", "85" into {value, scale}; letter grades return null. */
export function parseGrade(raw: string | null | undefined): { value: number; scale: number } | null {
  if (!raw) return null
  const s = raw.trim()
  let m = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)
  if (m) {
    const value = +m[1], scale = +m[2]
    return scale > 0 && value <= scale ? { value, scale } : null
  }
  m = s.match(/^(\d+(?:\.\d+)?)\s*%$/)
  if (m) return +m[1] <= 100 ? { value: +m[1], scale: 100 } : null
  m = s.match(/^(\d+(?:\.\d+)?)$/)
  if (!m) return null
  const n = +m[1]
  if (n <= 4) return { value: n, scale: 4 }
  if (n <= 5) return { value: n, scale: 5 }
  if (n <= 10) return { value: n, scale: 10 }
  if (n <= 100) return { value: n, scale: 100 }
  return null
}

export interface EducationFactInput {
  institute?: string | null
  instituteId?: bigint | string | null
  grade?: string | null
  levelRank?: number | null
  levelName?: string | null
}

export function computeCandidateFacts(
  input: { dateOfBirth?: string | null; educations: EducationFactInput[] },
  institutes: InstituteRef[] = []
): CandidateFilterFacts {
  const grades = input.educations
    .map((e) => parseGrade(e.grade))
    .filter((g): g is { value: number; scale: number } => g !== null)
  const cgpa = grades.length
    ? grades.reduce((best, g) => (g.value / g.scale > best.value / best.scale ? g : best))
    : null

  const ids = new Set<string>()
  let hasInstituteText = false
  for (const e of input.educations) {
    if (e.instituteId != null) {
      ids.add(String(e.instituteId))
      hasInstituteText = true
    }
    if (e.institute && e.institute.trim()) {
      hasInstituteText = true
      const matched = matchInstitute(e.institute, institutes)
      if (matched) ids.add(matched)
    }
  }

  let highest: { rank: number; name: string | null } | null = null
  for (const e of input.educations) {
    if (e.levelRank != null && (!highest || e.levelRank > highest.rank))
      highest = { rank: e.levelRank, name: e.levelName ?? null }
  }

  return {
    dob: parseDateOfBirth(input.dateOfBirth),
    hasEducation: input.educations.length > 0,
    highestEducationRank: highest ? highest.rank : null,
    highestEducationName: highest ? highest.name : null,
    instituteIds: Array.from(ids),
    hasInstituteText,
    cgpa,
  }
}

export function evaluateFilters(
  facts: CandidateFilterFacts | null | undefined,
  filters: ShortlistFilters | null | undefined
): FilterEvaluation {
  const checks: FilterEvaluation["checks"] = []
  const f = filters ?? {}
  const facts_ = facts ?? { dob: null, instituteIds: [], hasInstituteText: false, cgpa: null }

  if (f.minEducation && f.minEducation.rank > 0) {
    const need = f.minEducation
    if (facts_.hasEducation === false)
      checks.push({ key: "minEducation", outcome: "FAIL", reason: `No education on profile, needs ${need.name}` })
    else if (facts_.highestEducationRank == null)
      checks.push({ key: "minEducation", outcome: "UNKNOWN", reason: "Education level not recorded" })
    else if (facts_.highestEducationRank < need.rank)
      checks.push({
        key: "minEducation",
        outcome: "FAIL",
        reason: `Highest education ${facts_.highestEducationName ?? "lower"}, needs ${need.name}`,
      })
    else checks.push({ key: "minEducation", outcome: "PASS", reason: facts_.highestEducationName ?? "Meets level" })
  }

  if (f.ageRange && (f.ageRange.min != null || f.ageRange.max != null)) {
    const { min, max, asOf } = f.ageRange
    const age = facts_.dob ? computeAge(facts_.dob, asOf) : null
    if (age === null) checks.push({ key: "ageRange", outcome: "UNKNOWN", reason: "Date of birth missing/invalid" })
    else if (max != null && age > max)
      checks.push({ key: "ageRange", outcome: "FAIL", reason: `Age ${age} is above ${max}` })
    else if (min != null && age < min)
      checks.push({ key: "ageRange", outcome: "FAIL", reason: `Age ${age} is below ${min}` })
    else checks.push({ key: "ageRange", outcome: "PASS", reason: `Age ${age}` })
  }

  if (f.institutes && f.institutes.ids.length > 0) {
    const allowed = new Set(f.institutes.ids)
    if (facts_.instituteIds.some((id) => allowed.has(id)))
      checks.push({ key: "institutes", outcome: "PASS", reason: "Allowed institute" })
    else if (facts_.instituteIds.length > 0)
      checks.push({ key: "institutes", outcome: "FAIL", reason: "Institute not in the allowed list" })
    else
      checks.push({
        key: "institutes",
        outcome: "UNKNOWN",
        reason: facts_.hasInstituteText ? "Institute name not recognized" : "No institute information",
      })
  }

  if (f.minCgpa) {
    if (!facts_.cgpa)
      checks.push({ key: "minCgpa", outcome: "UNKNOWN", reason: "CGPA missing or not numeric" })
    else {
      const ratio = facts_.cgpa.value / facts_.cgpa.scale
      const min = f.minCgpa.value / f.minCgpa.scale
      const label = `${facts_.cgpa.value}/${facts_.cgpa.scale}`
      if (ratio + 1e-9 < min)
        checks.push({ key: "minCgpa", outcome: "FAIL", reason: `CGPA ${label} below ${f.minCgpa.value}/${f.minCgpa.scale}` })
      else checks.push({ key: "minCgpa", outcome: "PASS", reason: `CGPA ${label}` })
    }
  }

  const bucket: FilterBucket = checks.some((c) => c.outcome === "FAIL")
    ? "FILTERED_OUT"
    : checks.some((c) => c.outcome === "UNKNOWN")
      ? "NEEDS_REVIEW"
      : "PASSED"
  return { bucket, checks }
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Default filters from a job's saved hiring criteria. */
export function filtersFromJob(criteria: {
  minEducation?: { id?: string; name: string; rank: number } | null
  minAge?: number | null
  maxAge?: number | null
  minCgpa?: number | null
  cgpaScale?: number | null
  allowedInstitutes?: { id: string; name: string }[] | null
}): ShortlistFilters {
  const f: ShortlistFilters = {}
  if (criteria.minEducation && criteria.minEducation.rank > 0)
    f.minEducation = { rank: criteria.minEducation.rank, name: criteria.minEducation.name }
  if (criteria.minAge != null || criteria.maxAge != null)
    f.ageRange = {
      ...(criteria.minAge != null ? { min: criteria.minAge } : {}),
      ...(criteria.maxAge != null ? { max: criteria.maxAge } : {}),
      asOf: todayIso(),
    }
  if (criteria.allowedInstitutes && criteria.allowedInstitutes.length > 0)
    f.institutes = {
      ids: criteria.allowedInstitutes.map((i) => i.id),
      names: criteria.allowedInstitutes.map((i) => i.name),
    }
  if (criteria.minCgpa != null && criteria.minCgpa > 0)
    f.minCgpa = { value: criteria.minCgpa, scale: criteria.cgpaScale || 4 }
  return f
}

/** Light validation for filters arriving over the API. */
export function sanitizeFilters(raw: unknown): ShortlistFilters {
  const out: ShortlistFilters = {}
  if (!raw || typeof raw !== "object") return out
  const r = raw as any
  if (r.minEducation && Number.isFinite(+r.minEducation.rank) && +r.minEducation.rank > 0)
    out.minEducation = { rank: +r.minEducation.rank, name: String(r.minEducation.name ?? "").slice(0, 100) }
  const ar = r.ageRange
  if (ar && /^\d{4}-\d{2}-\d{2}$/.test(ar.asOf ?? "")) {
    const min = ar.min != null && ar.min !== "" ? Number(ar.min) : undefined
    const max = ar.max != null && ar.max !== "" ? Number(ar.max) : undefined
    const okMin = min === undefined || (Number.isFinite(min) && min >= 0)
    const okMax = max === undefined || (Number.isFinite(max) && max > 0)
    if (okMin && okMax && (min !== undefined || max !== undefined) && !(min !== undefined && max !== undefined && min > max))
      out.ageRange = { ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}), asOf: ar.asOf }
  }
  if (r.institutes && Array.isArray(r.institutes.ids)) {
    const ids = r.institutes.ids.map(String).filter((id: string) => /^\d+$/.test(id))
    if (ids.length > 0) {
      const names = Array.isArray(r.institutes.names) ? r.institutes.names.map(String).slice(0, ids.length) : undefined
      out.institutes = { ids, ...(names ? { names } : {}) }
    }
  }
  if (r.minCgpa && +r.minCgpa.value > 0 && +r.minCgpa.scale > 0 && +r.minCgpa.value <= +r.minCgpa.scale)
    out.minCgpa = { value: +r.minCgpa.value, scale: +r.minCgpa.scale }
  return out
}
