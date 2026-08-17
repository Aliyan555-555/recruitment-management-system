import { normalizeSkillName } from "@/lib/skills"

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
  }
}

export function computeDeterministicMatch(
  job: JobRequirementBundle,
  candidate: CandidateProfileBundle
): DeterministicMatch {
  const candidateSkillsSet = new Map<string, CandidateSkillItem>()
  for (const cs of candidate.skills) {
    const norm = normalizeSkillName(cs.skillName)
    if (norm) {
      candidateSkillsSet.set(norm, cs)
    }
  }

  const requiredSkills = job.skills.filter((s) => s.priority === "REQUIRED")
  const preferredSkills = job.skills.filter((s) => s.priority === "PREFERRED")

  const matchedRequiredSkills: string[] = []
  const missingRequiredSkills: string[] = []
  for (const s of requiredSkills) {
    const norm = normalizeSkillName(s.skillName)
    if (candidateSkillsSet.has(norm)) {
      matchedRequiredSkills.push(s.skillName)
    } else {
      missingRequiredSkills.push(s.skillName)
    }
  }

  const matchedPreferredSkills: string[] = []
  const missingPreferredSkills: string[] = []
  for (const s of preferredSkills) {
    const norm = normalizeSkillName(s.skillName)
    if (candidateSkillsSet.has(norm)) {
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
  const jobSkillNorms = new Set(job.skills.map((s) => normalizeSkillName(s.skillName)))
  let totalScoreSum = 0
  let assessedCount = 0

  if (candidate.assessmentPercentageMap && jobSkillNorms.size > 0) {
    for (const s of job.skills) {
      const norm = normalizeSkillName(s.skillName)
      const cs = candidateSkillsSet.get(norm)
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
    },
  }
}
