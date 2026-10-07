import { getCanonicalSkill, normalizeSkillName } from "@/lib/skills"

export type JobSkillPriorityType = "REQUIRED" | "PREFERRED"

export interface JobSkillRequirement {
  skillName: string
  priority: JobSkillPriorityType
}

export interface JobEducationRequirementItem {
  educationLevel: string
  field?: string | null
  minimumGpa?: string | null
}

export interface JobRequirementBundle {
  id: string
  title: string
  company: string
  description?: string | null
  successCriteria?: string | null
  minimumExperience?: string | null
  certification?: string | null
  skills: JobSkillRequirement[]
  educationRequirements: JobEducationRequirementItem[]
}

export interface CandidateSkillItem {
  skillName: string
  level: number
  verifiedLevel?: string | null
  lastAssessmentId?: bigint | string | null
}

export interface CandidateEducationItem {
  degreeTitle: string
  levelName?: string | null
  institute?: string | null
  majorSubject?: string | null
  grade?: string | null
  passingYear?: string | null
}

export interface CandidateExperienceItem {
  jobTitle: string
  company?: string | null
  location?: string | null
  startDate?: string | null
  endDate?: string | null
  isCurrent?: boolean
}

export interface CandidateProfileDetailItem {
  bio?: string | null
  certifications?: string | null
  achievements?: string | null
  noticePeriod?: string | null
  availability?: string | null
}

export interface CandidateProfileBundle {
  id: string
  firstname: string
  lastname: string
  email: string
  skills: CandidateSkillItem[]
  educations: CandidateEducationItem[]
  experiences: CandidateExperienceItem[]
  profileDetail?: CandidateProfileDetailItem | null
  assessmentPercentageMap?: Map<string, number | null>
  /** Candidate's quick test score (0-100) for this job, when the job has a quick test and they took it. */
  quickTestPercentage?: number | null
}

export interface DeterministicMatch {
  matchedRequiredSkills: string[]
  missingRequiredSkills: string[]
  matchedPreferredSkills: string[]
  missingPreferredSkills: string[]
  requiredSkillCoverage: number
  preferredSkillCoverage: number
  assessmentAggregate: {
    averagePercentage: number | null
    assessedSkillCount: number
    totalRelevantSkillCount: number
  }
  quickTestScore?: number | null
}

export interface ShortlistAiPromptPayload {
  job: {
    title: string
    company: string
    description: string
    successCriteria: string
    minimumExperience: string
    certification: string
    requiredSkills: string[]
    preferredSkills: string[]
    educationRequirements: string[]
  }
  candidate: {
    name: string
    email: string
    skills: Array<{ skillName: string; verifiedLevel: string; assessmentScore: string }>
    education: string[]
    experience: string[]
    bio: string
    certifications: string
    achievements: string
    noticePeriod: string
    availability: string
  }
  deterministic: {
    matchedRequiredSkills: string[]
    missingRequiredSkills: string[]
    matchedPreferredSkills: string[]
    missingPreferredSkills: string[]
    requiredSkillCoveragePercent: number
    preferredSkillCoveragePercent: number
    assessmentAverageScore: string
    quickTestScore: string
  }
}

/**
 * Checks if a candidate's background text (experiences, bio, certifications)
 * mentions a required or preferred job skill.
 */
function textContainsSkill(corpus: string, rawSkillName: string): boolean {
  if (!corpus || !rawSkillName) return false
  const canon = getCanonicalSkill(rawSkillName)
  const norm = normalizeSkillName(rawSkillName)

  // Test raw name
  const rawEscaped = rawSkillName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  if (rawEscaped.length >= 2) {
    const rawRegex = new RegExp(`(^|[^A-Za-z0-9+#])${rawEscaped}([^A-Za-z0-9+#]|$)`, "i")
    if (rawRegex.test(corpus)) return true
  }

  // Test canonical name
  if (canon && canon !== rawSkillName) {
    const canonEscaped = canon.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const canonRegex = new RegExp(`(^|[^A-Za-z0-9+#])${canonEscaped}([^A-Za-z0-9+#]|$)`, "i")
    if (canonRegex.test(corpus)) return true
  }

  // Test normalized name
  if (norm && norm !== rawSkillName && norm !== canon) {
    const normEscaped = norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const normRegex = new RegExp(`(^|[^A-Za-z0-9+#])${normEscaped}([^A-Za-z0-9+#]|$)`, "i")
    if (normRegex.test(corpus)) return true
  }

  return false
}

export function computeDeterministicMatch(
  job: JobRequirementBundle,
  candidate: CandidateProfileBundle
): DeterministicMatch {
  // Build lookup sets for candidate skills (raw normalized + canonical aliases)
  const candidateSkillsSet = new Map<string, CandidateSkillItem>()
  const candidateCanonicalSkills = new Set<string>()

  for (const cs of candidate.skills) {
    const norm = normalizeSkillName(cs.skillName)
    const canon = getCanonicalSkill(cs.skillName)
    if (norm) {
      candidateSkillsSet.set(norm, cs)
    }
    if (canon) {
      candidateSkillsSet.set(canon, cs)
      candidateCanonicalSkills.add(canon)
    }
  }

  // Build searchable text corpus from candidate experiences, bio, certifications
  const expText = candidate.experiences
    .map((e) => `${e.jobTitle} ${e.company ?? ""} ${e.location ?? ""}`)
    .join(" ")
  const eduText = candidate.educations
    .map((e) => `${e.degreeTitle} ${e.majorSubject ?? ""}`)
    .join(" ")
  const detailText = `${candidate.profileDetail?.bio ?? ""} ${candidate.profileDetail?.certifications ?? ""} ${candidate.profileDetail?.achievements ?? ""}`
  const candidateCorpus = `${expText} ${eduText} ${detailText}`.trim()

  const requiredSkills = job.skills.filter((s) => s.priority === "REQUIRED")
  const preferredSkills = job.skills.filter((s) => s.priority === "PREFERRED")

  const matchedRequiredSkills: string[] = []
  const missingRequiredSkills: string[] = []
  for (const s of requiredSkills) {
    const norm = normalizeSkillName(s.skillName)
    const canon = getCanonicalSkill(s.skillName)

    if (
      candidateSkillsSet.has(norm) ||
      candidateSkillsSet.has(canon) ||
      candidateCanonicalSkills.has(canon) ||
      textContainsSkill(candidateCorpus, s.skillName)
    ) {
      matchedRequiredSkills.push(s.skillName)
    } else {
      missingRequiredSkills.push(s.skillName)
    }
  }

  const matchedPreferredSkills: string[] = []
  const missingPreferredSkills: string[] = []
  for (const s of preferredSkills) {
    const norm = normalizeSkillName(s.skillName)
    const canon = getCanonicalSkill(s.skillName)

    if (
      candidateSkillsSet.has(norm) ||
      candidateSkillsSet.has(canon) ||
      candidateCanonicalSkills.has(canon) ||
      textContainsSkill(candidateCorpus, s.skillName)
    ) {
      matchedPreferredSkills.push(s.skillName)
    } else {
      missingPreferredSkills.push(s.skillName)
    }
  }

  const requiredSkillCoverage =
    requiredSkills.length === 0 ? 1.0 : matchedRequiredSkills.length / requiredSkills.length
  const preferredSkillCoverage =
    preferredSkills.length === 0 ? 1.0 : matchedPreferredSkills.length / preferredSkills.length

  // Assessment Aggregate calculation
  let totalScoreSum = 0
  let assessedCount = 0

  if (candidate.assessmentPercentageMap && job.skills.length > 0) {
    for (const s of job.skills) {
      const norm = normalizeSkillName(s.skillName)
      const canon = getCanonicalSkill(s.skillName)
      const cs = candidateSkillsSet.get(norm) ?? candidateSkillsSet.get(canon)
      if (cs && cs.lastAssessmentId) {
        const score = candidate.assessmentPercentageMap.get(cs.lastAssessmentId.toString())
        if (score !== undefined && score !== null) {
          totalScoreSum += score
          assessedCount++
        }
      }
    }
  }

  const averagePercentage =
    assessedCount > 0 ? Math.round(totalScoreSum / assessedCount) : null

  return {
    matchedRequiredSkills,
    missingRequiredSkills,
    matchedPreferredSkills,
    missingPreferredSkills,
    requiredSkillCoverage,
    preferredSkillCoverage,
    assessmentAggregate: {
      averagePercentage,
      assessedSkillCount: assessedCount,
      totalRelevantSkillCount: job.skills.length,
    },
    quickTestScore: candidate.quickTestPercentage ?? null,
  }
}

function truncateString(str: string | null | undefined, maxLen: number): string {
  if (!str || !str.trim()) return "Not Provided"
  const trimmed = str.trim()
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) + "..." : trimmed
}

export function buildAiPromptPayload(
  job: JobRequirementBundle,
  deterministic: DeterministicMatch,
  candidate: CandidateProfileBundle
): ShortlistAiPromptPayload {
  const jobReqSkills = job.skills
    .filter((s) => s.priority === "REQUIRED")
    .map((s) => s.skillName)
  const jobPrefSkills = job.skills
    .filter((s) => s.priority === "PREFERRED")
    .map((s) => s.skillName)

  const eduReqs =
    job.educationRequirements.length > 0
      ? job.educationRequirements.map(
          (e) =>
            `${e.educationLevel}${e.field ? ` in ${e.field}` : ""}${
              e.minimumGpa ? ` (Min GPA: ${e.minimumGpa})` : ""
            }`
        )
      : ["Not Specified"]

  // Candidate summary bounds
  const candSkillsSummary = candidate.skills.slice(0, 15).map((cs) => {
    let scoreStr = "Not Assessed"
    if (cs.lastAssessmentId && candidate.assessmentPercentageMap) {
      const p = candidate.assessmentPercentageMap.get(cs.lastAssessmentId.toString())
      if (p !== undefined && p !== null) scoreStr = `${p}%`
    }
    return {
      skillName: cs.skillName,
      verifiedLevel: cs.verifiedLevel ?? "Unverified",
      assessmentScore: scoreStr,
    }
  })

  const candEduSummary =
    candidate.educations.length > 0
      ? candidate.educations.slice(0, 5).map((e) =>
          `${e.degreeTitle}${e.levelName ? ` (${e.levelName})` : ""}${
            e.institute ? ` at ${e.institute}` : ""
          }${e.majorSubject ? `, Major: ${e.majorSubject}` : ""}${
            e.grade ? `, Grade: ${e.grade}` : ""
          }${e.passingYear ? `, Year: ${e.passingYear}` : ""}`
        )
      : ["Not Provided"]

  const candExpSummary =
    candidate.experiences.length > 0
      ? candidate.experiences.slice(0, 10).map((exp) =>
          `${exp.jobTitle}${exp.company ? ` at ${exp.company}` : ""}${
            exp.location ? ` (${exp.location})` : ""
          } [${exp.startDate ?? "N/A"} - ${exp.isCurrent ? "Present" : exp.endDate ?? "N/A"}]`
        )
      : ["Not Provided"]

  return {
    job: {
      title: job.title,
      company: job.company,
      description: truncateString(job.description, 1000),
      successCriteria: truncateString(job.successCriteria, 500),
      minimumExperience: truncateString(job.minimumExperience, 200),
      certification: truncateString(job.certification, 200),
      requiredSkills: jobReqSkills.length > 0 ? jobReqSkills : ["None Specified"],
      preferredSkills: jobPrefSkills.length > 0 ? jobPrefSkills : ["None Specified"],
      educationRequirements: eduReqs,
    },
    candidate: {
      name: `${candidate.firstname} ${candidate.lastname}`.trim(),
      email: candidate.email,
      skills: candSkillsSummary,
      education: candEduSummary,
      experience: candExpSummary,
      bio: truncateString(candidate.profileDetail?.bio, 500),
      certifications: truncateString(candidate.profileDetail?.certifications, 300),
      achievements: truncateString(candidate.profileDetail?.achievements, 300),
      noticePeriod: truncateString(candidate.profileDetail?.noticePeriod, 100),
      availability: truncateString(candidate.profileDetail?.availability, 100),
    },
    deterministic: {
      matchedRequiredSkills: deterministic.matchedRequiredSkills,
      missingRequiredSkills: deterministic.missingRequiredSkills,
      matchedPreferredSkills: deterministic.matchedPreferredSkills,
      missingPreferredSkills: deterministic.missingPreferredSkills,
      requiredSkillCoveragePercent: Math.round(deterministic.requiredSkillCoverage * 100),
      preferredSkillCoveragePercent: Math.round(deterministic.preferredSkillCoverage * 100),
      assessmentAverageScore:
        deterministic.assessmentAggregate.averagePercentage !== null
          ? `${deterministic.assessmentAggregate.averagePercentage}%`
          : "Not Assessed",
      quickTestScore:
        deterministic.quickTestScore != null ? `${deterministic.quickTestScore}%` : "Not Taken",
    },
  }
}
