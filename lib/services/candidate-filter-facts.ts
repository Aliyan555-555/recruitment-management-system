import { prisma } from "@/lib/prisma"
import {
  CandidateFilterFacts,
  computeCandidateFacts,
  filtersFromJob,
  parseMinExperienceYears,
  ShortlistFilters,
} from "@/lib/ai-shortlist/filters"
import { computeDeterministicMatch, JobSkillRequirement } from "@/lib/ai-shortlist/deterministic"
import type { InstituteRef } from "@/lib/institutes"

export async function loadInstituteRefs(): Promise<InstituteRef[]> {
  const rows = await prisma.institute.findMany({
    where: { deletedAt: null, visible: true },
    select: { id: true, name: true, aliases: true },
  })
  return rows.map((r) => ({ id: r.id.toString(), name: r.name, aliases: r.aliases }))
}

/** Share (0-1) of the job's required skills found on the profile; null when the job lists none. */
export function requiredSkillCoverage(
  jobSkills: JobSkillRequirement[],
  candidate: {
    skills: { skillName: string; level?: number | null }[]
    experiences: { jobTitle: string; company?: string | null; location?: string | null }[]
    educations: { degreeTitle: string; majorSubject?: string | null }[]
    profileDetail?: { bio?: string | null; certifications?: string | null; achievements?: string | null } | null
  }
): number | null {
  if (!jobSkills.some((s) => s.priority === "REQUIRED")) return null
  const match = computeDeterministicMatch(
    { id: "", title: "", company: "", skills: jobSkills, educationRequirements: [] },
    {
      id: "",
      firstname: "",
      lastname: "",
      email: "",
      skills: candidate.skills.map((s) => ({ skillName: s.skillName, level: s.level ?? 0 })),
      educations: candidate.educations,
      experiences: candidate.experiences,
      profileDetail: candidate.profileDetail ?? null,
    }
  )
  return match.requiredSkillCoverage
}

/**
 * Batch-loads the profile data the hard filters need and returns filter facts keyed by user id.
 * Pass `jobId` to also compute the required-skill coverage for that job.
 */
export async function loadCandidateFilterFacts(
  userIds: bigint[],
  opts: { jobId?: bigint; institutes?: InstituteRef[] } = {}
): Promise<Map<string, CandidateFilterFacts>> {
  const refs = opts.institutes ?? (await loadInstituteRefs())
  const [profiles, educations, experiences, skills, jobSkills] = await Promise.all([
    prisma.userProfileDetail.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, dateOfBirth: true, bio: true, certifications: true, achievements: true },
    }),
    prisma.userEducation.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        degreeTitle: true,
        majorSubject: true,
        institute: true,
        instituteId: true,
        grade: true,
        educationLevel: { select: { name: true, rank: true } },
      },
    }),
    prisma.userExperience.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, jobTitle: true, company: true, location: true, startDate: true, endDate: true, isCurrent: true },
    }),
    opts.jobId
      ? prisma.userSkills.findMany({ where: { userId: { in: userIds } }, select: { userId: true, skillName: true, level: true } })
      : Promise.resolve([]),
    opts.jobId
      ? prisma.jobSkill.findMany({ where: { jobId: opts.jobId }, select: { skillName: true, priority: true } })
      : Promise.resolve(null),
  ])
  const byUser = <T extends { userId: bigint }>(rows: T[]) => {
    const m = new Map<string, T[]>()
    for (const r of rows) {
      const key = r.userId.toString()
      const arr = m.get(key) ?? []
      arr.push(r)
      m.set(key, arr)
    }
    return m
  }
  const profileByUser = new Map(profiles.map((p) => [p.userId.toString(), p]))
  const eduByUser = byUser(educations)
  const expByUser = byUser(experiences)
  const skillsByUser = byUser(skills)
  const reqs = jobSkills?.map((s) => ({ skillName: s.skillName, priority: s.priority as JobSkillRequirement["priority"] }))

  const out = new Map<string, CandidateFilterFacts>()
  for (const id of userIds) {
    const key = id.toString()
    const edus = eduByUser.get(key) ?? []
    const exps = expByUser.get(key) ?? []
    const profile = profileByUser.get(key)
    out.set(
      key,
      computeCandidateFacts(
        {
          dateOfBirth: profile?.dateOfBirth,
          educations: edus.map((e) => ({
            ...e,
            levelRank: e.educationLevel?.rank ?? null,
            levelName: e.educationLevel?.name ?? null,
          })),
          experiences: exps,
          ...(reqs
            ? {
                requiredSkillCoverage: requiredSkillCoverage(reqs, {
                  skills: skillsByUser.get(key) ?? [],
                  experiences: exps,
                  educations: edus,
                  profileDetail: profile,
                }),
              }
            : {}),
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
  minimumExperience: true,
  educationRequirements: {
    take: 1,
    orderBy: { id: "asc" },
    select: { educationLevel: { select: { id: true, name: true, rank: true } } },
  },
  allowedInstitutes: { select: { institute: { select: { id: true, name: true } } } },
  skills: { where: { priority: "REQUIRED" }, select: { id: true } },
} as const

/** Serializable hiring criteria + the default shortlist filters derived from them. */
export function serializeJobCriteria(job: {
  minAge: number | null
  maxAge: number | null
  minCgpa: number | null
  cgpaScale: number | null
  minimumExperience?: string | null
  educationRequirements?: { educationLevel: { id: bigint; name: string; rank: number } }[]
  allowedInstitutes: { institute: { id: bigint; name: string } }[]
  skills?: unknown[]
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
    minExperienceYears: parseMinExperienceYears(job.minimumExperience),
    requiredSkillCount: job.skills?.length ?? 0,
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
  minExperienceYears: number | null
  requiredSkillCount: number
}
