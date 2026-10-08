// Parsing/validation of a job's hiring criteria (age range, min CGPA, allowed institutes).

export interface HiringCriteriaInput {
  minAge?: number | string | null
  maxAge?: number | string | null
  minCgpa?: number | string | null
  cgpaScale?: number | string | null
  instituteIds?: (string | number)[] | null
}

export type ParsedHiringCriteria =
  | {
      valid: true
      data: {
        minAge: number | null
        maxAge: number | null
        minCgpa: number | null
        cgpaScale: number | null
        instituteIds: bigint[]
      }
    }
  | { valid: false; error: string }

function toNumberOrNull(v: unknown): number | null | typeof NaN {
  if (v === undefined || v === null || v === "") return null
  return Number(v)
}

export function parseHiringCriteria(input: HiringCriteriaInput | undefined | null): ParsedHiringCriteria {
  const i = input ?? {}
  const minAge = toNumberOrNull(i.minAge)
  const maxAge = toNumberOrNull(i.maxAge)
  const minCgpa = toNumberOrNull(i.minCgpa)
  const cgpaScale = toNumberOrNull(i.cgpaScale)

  for (const [label, v] of [["Minimum age", minAge], ["Maximum age", maxAge]] as const) {
    if (v !== null && (!Number.isInteger(v) || v < 14 || v > 80)) {
      return { valid: false, error: `${label} must be a whole number between 14 and 80` }
    }
  }
  if (minAge !== null && maxAge !== null && minAge > maxAge) {
    return { valid: false, error: "Minimum age cannot be greater than maximum age" }
  }
  if (minCgpa !== null || cgpaScale !== null) {
    if (minCgpa !== null && (!Number.isFinite(minCgpa) || minCgpa <= 0)) {
      return { valid: false, error: "Minimum CGPA must be a positive number" }
    }
    if (cgpaScale !== null && (!Number.isFinite(cgpaScale) || cgpaScale <= 0)) {
      return { valid: false, error: "CGPA scale must be a positive number" }
    }
    if (minCgpa !== null && minCgpa > (cgpaScale ?? 4)) {
      return { valid: false, error: "Minimum CGPA cannot exceed the CGPA scale" }
    }
  }

  const instituteIds: bigint[] = []
  for (const raw of i.instituteIds ?? []) {
    if (!/^\d+$/.test(String(raw))) return { valid: false, error: "Invalid institute selected" }
    const id = BigInt(raw)
    if (!instituteIds.includes(id)) instituteIds.push(id)
  }

  return {
    valid: true,
    data: {
      minAge: minAge as number | null,
      maxAge: maxAge as number | null,
      minCgpa: minCgpa as number | null,
      cgpaScale: minCgpa !== null ? ((cgpaScale as number | null) ?? 4) : null,
      instituteIds,
    },
  }
}
