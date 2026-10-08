import type { SerializedAiCandidateShortlistResult } from "@/lib/ai-shortlist/serializers"
import type { CandidateFilterFacts } from "@/lib/ai-shortlist/filters"

export type Decision = "select" | "reject" | "maybe" | "unmaybe"

export interface ApplicantDetail {
  candidate: {
    id: string
    name: string
    email: string
    phone: string | null
    phone2: string | null
    city: string | null
    country: string | null
    address: string | null
    avatar: string | null
    age: number | null
    dateOfBirth: string | null
    profile: {
      title: string | null
      gender: string | null
      nationality: string | null
      maritalStatus: string | null
      preferredCity: string | null
      professionalGrade: string | null
      linkedinUrl: string | null
      portfolioUrl: string | null
      githubUrl: string | null
      websiteUrl: string | null
      bio: string | null
      availability: string | null
      expectedSalary: string | null
      noticePeriod: string | null
      languages: string | null
      certifications: string | null
      achievements: string | null
    } | null
    jobPreference: { firstPriority: string | null; secondPriority: string | null; thirdPriority: string | null; summary: string | null } | null
    educations: { id: string; level: string | null; degree: string; institute: string | null; major: string | null; grade: string | null; passingYear: string | null }[]
    experiences: { id: string; title: string; company: string | null; location: string | null; startDate: string | null; endDate: string | null; isCurrent: boolean }[]
    experienceYears: number | null
    skills: { id: string; name: string; level: number; verifiedLevel: string | null; assessmentPercent: number | null }[]
  }
  application: {
    id: string
    status: string
    appliedAt: string
    note: string | null
    reviewFlag: string | null
    reviewedAt: string | null
    reviewedBy: string | null
    actionable: boolean
    actionBlockedReason: string | null
    statusLabel: string
  }
  quickTest: { status: string; scorePercent: number | null; scoredPoints: number | null; maxPoints: number; questionCount: number; submittedAt: string | null } | null
  ai: SerializedAiCandidateShortlistResult | null
  filterFacts: CandidateFilterFacts | null
}
