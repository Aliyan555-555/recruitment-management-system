import { AiShortlistRun, AiCandidateShortlistResult, User } from "@prisma/client"

export type SerializedAiShortlistRun = {
  id: string
  jobId: string
  triggeredBy: string
  status: string
  totalCandidates: number
  aiModel: string | null
  startedAt: string
  completedAt: string | null
  createdAt: string
  triggeredByUser?: {
    id: string
    firstname: string
    lastname: string
    email: string
  }
}

export type SerializedAiCandidateShortlistResult = {
  id: string
  runId: string
  jobId: string
  candidateId: string
  applicationId: string
  status: string
  errorMessage: string | null
  overallScore: number | null
  skillsScore: number | null
  educationScore: number | null
  experienceScore: number | null
  successCriteriaScore: number | null
  assessmentScore: number | null
  mandatoryRequirementsMet: boolean | null
  aiConfidence: number | null
  recommendation: string | null
  matchedRequirements: any
  missingRequirements: any
  mandatoryChecklist: any
  strengths: any
  concerns: any
  aiReasoning: string | null
  createdAt: string
  updatedAt: string
  candidate?: {
    id: string
    firstname: string
    lastname: string
    email: string
    avatar: string | null
  }
}

export function serializeShortlistRun(
  run: AiShortlistRun & {
    triggeredByUser?: Partial<User> | null
  }
): SerializedAiShortlistRun {
  return {
    id: run.id.toString(),
    jobId: run.jobId.toString(),
    triggeredBy: run.triggeredBy.toString(),
    status: run.status,
    totalCandidates: run.totalCandidates,
    aiModel: run.aiModel ?? null,
    startedAt: run.startedAt.toString(),
    completedAt: run.completedAt ? run.completedAt.toString() : null,
    createdAt: run.createdAt.toString(),
    ...(run.triggeredByUser
      ? {
          triggeredByUser: {
            id: run.triggeredByUser.id?.toString() ?? "",
            firstname: run.triggeredByUser.firstname ?? "",
            lastname: run.triggeredByUser.lastname ?? "",
            email: run.triggeredByUser.email ?? "",
          },
        }
      : {}),
  }
}

export function serializeShortlistResult(
  result: AiCandidateShortlistResult & {
    candidate?: Partial<User> | null
  }
): SerializedAiCandidateShortlistResult {
  return {
    id: result.id.toString(),
    runId: result.runId.toString(),
    jobId: result.jobId.toString(),
    candidateId: result.candidateId.toString(),
    applicationId: result.applicationId.toString(),
    status: result.status,
    errorMessage: result.errorMessage ?? null,
    overallScore: result.overallScore ?? null,
    skillsScore: result.skillsScore ?? null,
    educationScore: result.educationScore ?? null,
    experienceScore: result.experienceScore ?? null,
    successCriteriaScore: result.successCriteriaScore ?? null,
    assessmentScore: result.assessmentScore ?? null,
    mandatoryRequirementsMet: result.mandatoryRequirementsMet ?? null,
    aiConfidence: result.aiConfidence ?? null,
    recommendation: result.recommendation ?? null,
    matchedRequirements: result.matchedRequirements ?? null,
    missingRequirements: result.missingRequirements ?? null,
    mandatoryChecklist: result.mandatoryChecklist ?? null,
    strengths: result.strengths ?? null,
    concerns: result.concerns ?? null,
    aiReasoning: result.aiReasoning ?? null,
    createdAt: result.createdAt.toString(),
    updatedAt: result.updatedAt.toString(),
    ...(result.candidate
      ? {
          candidate: {
            id: result.candidate.id?.toString() ?? "",
            firstname: result.candidate.firstname ?? "",
            lastname: result.candidate.lastname ?? "",
            email: result.candidate.email ?? "",
            avatar: result.candidate.avatar ?? null,
          },
        }
      : {}),
  }
}
