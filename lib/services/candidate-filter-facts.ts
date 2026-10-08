import { prisma } from "@/lib/prisma"
import { CandidateFilterFacts, computeCandidateFacts, filtersFromJob, ShortlistFilters } from "@/lib/ai-shortlist/filters"
import type { InstituteRef } from "@/lib/institutes"

export async function loadInstituteRefs(): Promise<InstituteRef[]> {
  const rows = await prisma.institute.findMany({
    where: { deletedAt: null, visible: true },
    select: { id: true, name: true, aliases: true },
  })
  return rows.map((r) => ({ id: r.id.toString(), name: r.name, aliases: r.aliases }))
}

/** Batch-loads DOB + education for candidates and returns filter facts keyed by user id. */
export async function loadCandidateFilterFacts(
  userIds: bigint[],
  institutes?: InstituteRef[]
): Promise<Map<string, CandidateFilterFacts>> {
  const refs = institutes ?? (await loadInstituteRefs())
  const [profiles, educations] = await Promise.all([
    prisma.userProfileDetail.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, dateOfBirth: true },
    }),
    prisma.userEducation.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        institute: true,
        instituteId: true,
        grade: true,
        educationLevel: { select: { name: true, rank: true } },
      },
    }),
  ])
  const dobByUser = new Map(profiles.map((p) => [p.userId.toString(), p.dateOfBirth]))
  const eduByUser = new Map<string, typeof educations>()
  for (const e of educations) {
    const key = e.userId.toString()
    const arr = eduByUser.get(key) ?? []
    arr.push(e)
    eduByUser.set(key, arr)
  }
  const out = new Map<string, CandidateFilterFacts>()
  for (const id of userIds) {
    const key = id.toString()
    out.set(
      key,
      computeCandidateFacts(
        {
          dateOfBirth: dobByUser.get(key),
          educations: (eduByUser.get(key) ?? []).map((e) => ({
            ...e,
            levelRank: e.educationLevel?.rank ?? null,
            levelName: e.educationLevel?.name ?? null,
          })),
        },
        refs
      )
    )
  }
  return out
}

export const JOB_CRITERIA_SELECT = {
  minAge: true,
  maxAge: true,
  minCgpa: true,
  cgpaScale: true,
  educationRequirements: {
    take: 1,
    orderBy: { id: "asc" },
    select: { educationLevel: { select: { id: true, name: true, rank: true } } },
  },
  allowedInstitutes: { select: { institute: { select: { id: true, name: true } } } },
} as const

/** Serializable hiring criteria + the default shortlist filters derived from them. */
export function serializeJobCriteria(job: {
  minAge: number | null
  maxAge: number | null
  minCgpa: number | null
  cgpaScale: number | null
  educationRequirements?: { educationLevel: { id: bigint; name: string; rank: number } }[]
  allowedInstitutes: { institute: { id: bigint; name: string } }[]
}): { criteria: JobCriteria; defaultFilters: ShortlistFilters } {
  const level = job.educationRequirements?.[0]?.educationLevel
  const criteria: JobCriteria = {
    minEducation: level ? { id: level.id.toString(), name: level.name, rank: level.rank } : null,
    minAge: job.minAge,
    maxAge: job.maxAge,
    minCgpa: job.minCgpa,
    cgpaScale: job.cgpaScale,
    allowedInstitutes: job.allowedInstitutes.map((a) => ({
      id: a.institute.id.toString(),
      name: a.institute.name,
    })),
  }
  return { criteria, defaultFilters: filtersFromJob(criteria) }
}

export interface JobCriteria {
  minEducation: { id: string; name: string; rank: number } | null
  minAge: number | null
  maxAge: number | null
  minCgpa: number | null
  cgpaScale: number | null
  allowedInstitutes: { id: string; name: string }[]
}
