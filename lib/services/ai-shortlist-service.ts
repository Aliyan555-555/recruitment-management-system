import { getEnabledQuickTest } from "@/lib/services/quick-test-service"
import { prisma } from "@/lib/prisma"
import { getAiConfig, getAiModelName } from "@/lib/ai/ai-config"
import { checkRateLimit } from "@/lib/rate-limit"
import {
  eligibilityFromApplication,
  SHORTLIST_PIPELINE_SELECT,
} from "@/lib/admin/shortlist-eligibility"
import {
  AI_SHORTLIST_CONCURRENCY,
  AI_SHORTLIST_RUN_RATE_LIMIT,
  AI_SHORTLIST_STALE_RUN_SECONDS,
} from "@/lib/ai-shortlist/config"
import { runWithConcurrency } from "@/lib/ai-shortlist/concurrency"
import {
  buildAiPromptPayload,
  CandidateProfileBundle,
  computeDeterministicMatch,
  JobRequirementBundle,
} from "@/lib/ai-shortlist/deterministic"
import {
  CandidateFilterFacts,
  computeCandidateFacts,
  evaluateFilters,
  sanitizeFilters,
  ShortlistFilters,
} from "@/lib/ai-shortlist/filters"
import { loadInstituteRefs } from "@/lib/services/candidate-filter-facts"
import { combineShortlistScore } from "@/lib/ai-shortlist/scoring"
import { evaluateCandidateForJob } from "@/lib/ai/shortlist-evaluator"
import { buildSkillPercentageMap } from "@/lib/assessments/skill-percentage"
import { notifyAiShortlistComplete } from "@/lib/notifications"

export const AI_NOT_CONFIGURED_MESSAGE =
  "AI is not set up yet, so candidates cannot be scored. An admin must add an AI token under Settings → AI Configuration (or set AI_INFERENCE_TOKEN in the server environment)."

async function loadActionableShortlistApplications(jobId: bigint) {
  const applications = await prisma.jobsApplied.findMany({
    where: {
      jobId,
      status: { in: ["APPLIED", "SUBMITTED"] },
    },
    select: {
      id: true,
      userId: true,
      status: true,
      pipeline: {
        select: SHORTLIST_PIPELINE_SELECT,
      },
    },
  })

  return applications.filter((app) => eligibilityFromApplication(app).actionable)
}

export async function startShortlistRun(
  jobId: bigint,
  adminUserId: bigint,
  rawFilters?: unknown
): Promise<
  | { success: true; run: any }
  | { success: false; error: string; code: string; retryAfterSeconds?: number }
> {
  const rateLimitKey = `ai-shortlist:${jobId.toString()}`
  const rateCheck = checkRateLimit(
    rateLimitKey,
    AI_SHORTLIST_RUN_RATE_LIMIT.maxRequests,
    AI_SHORTLIST_RUN_RATE_LIMIT.windowMs
  )

  if (rateCheck.limited) {
    return {
      success: false,
      error: "Rate limit exceeded. Too many shortlisting runs triggered for this job.",
      code: "RATE_LIMITED",
      retryAfterSeconds: Math.max(0, Math.ceil((rateCheck.resetTime - Date.now()) / 1000)),
    }
  }

  // Fail fast with a clear message instead of creating a run where every candidate fails
  if (!(await getAiConfig()).token) {
    return { success: false, error: AI_NOT_CONFIGURED_MESSAGE, code: "AI_NOT_CONFIGURED" }
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, title: true },
  })

  if (!job) {
    return {
      success: false,
      error: "Job not found",
      code: "JOB_NOT_FOUND",
    }
  }

  const nowSec = Math.floor(Date.now() / 1000)
  const activeRun = await prisma.aiShortlistRun.findFirst({
    where: {
      jobId,
      status: "RUNNING",
    },
    orderBy: { startedAt: "desc" },
  })

  let resumeFromRunId: bigint | null = null

  if (activeRun) {
    const elapsedSeconds = nowSec - Number(activeRun.startedAt)
    if (elapsedSeconds < AI_SHORTLIST_STALE_RUN_SECONDS) {
      return {
        success: false,
        error: "An AI shortlisting run is currently in progress for this job.",
        code: "RUN_IN_PROGRESS",
        retryAfterSeconds: AI_SHORTLIST_STALE_RUN_SECONDS - elapsedSeconds,
      }
    }
    // Stale RUNNING row from a crashed/restarted process — mark it FAILED so it
    // stops showing as "in progress"; the new run below resumes from it in place,
    // keeping already-evaluated candidates instead of re-processing everyone.
    await prisma.aiShortlistRun.update({
      where: { id: activeRun.id },
      data: { status: "FAILED", completedAt: BigInt(nowSec) },
    })
    resumeFromRunId = activeRun.id
  }

  const candidateApps = await loadActionableShortlistApplications(jobId)

  if (candidateApps.length === 0) {
    return {
      success: false,
      error: "No candidate applications found to evaluate for this job.",
      code: "NO_CANDIDATES",
    }
  }

  const nowBigInt = BigInt(nowSec)
  const filters = sanitizeFilters(rawFilters)
  const filtersJson = Object.keys(filters).length > 0 ? (filters as any) : undefined
  const run = resumeFromRunId
    ? await prisma.aiShortlistRun.update({
        where: { id: resumeFromRunId },
        data: {
          status: "RUNNING",
          totalCandidates: candidateApps.length,
          startedAt: nowBigInt,
          completedAt: null,
          filters: filtersJson ?? null,
        },
      })
    : await prisma.aiShortlistRun.create({
        data: {
          jobId,
          triggeredBy: adminUserId,
          status: "RUNNING",
          totalCandidates: candidateApps.length,
          aiModel: await getAiModelName(),
          filters: filtersJson,
          startedAt: nowBigInt,
          createdAt: nowBigInt,
        },
      })

  // Fire-and-forget: safe under PM2/Docker's long-lived process, and resumable
  // across restarts — a stale RUNNING run is resumed in place above, and
  // processShortlistRun skips candidates already COMPLETED for this run.
  void processShortlistRun(run.id).catch((err) => {
    console.error(`Error in processShortlistRun background task (runId: ${run.id}):`, err)
  })

  return { success: true, run }
}

/**
 * Scores candidates that were excluded by hard filters (admin relaxed a filter chip and
 * explicitly asked for AI scoring). Already-scored candidates are never re-scored.
 */
export async function scoreRemainingCandidates(
  jobId: bigint,
  runId: bigint,
  candidateIds: bigint[]
): Promise<{ success: true; count: number } | { success: false; error: string; code: string }> {
  const run = await prisma.aiShortlistRun.findFirst({ where: { id: runId, jobId } })
  if (!run) return { success: false, error: "Run not found", code: "RUN_NOT_FOUND" }
  if (!(await getAiConfig()).token) {
    return { success: false, error: AI_NOT_CONFIGURED_MESSAGE, code: "AI_NOT_CONFIGURED" }
  }
  if (run.status === "RUNNING")
    return { success: false, error: "This run is still in progress.", code: "RUN_IN_PROGRESS" }

  const pending = await prisma.aiCandidateShortlistResult.findMany({
    where: { runId, candidateId: { in: candidateIds }, status: "FILTERED_OUT" },
    select: { candidateId: true },
  })
  if (pending.length === 0)
    return { success: false, error: "No unscored candidates selected.", code: "NOTHING_TO_SCORE" }

  await prisma.aiShortlistRun.update({
    where: { id: runId },
    data: { status: "RUNNING", startedAt: BigInt(Math.floor(Date.now() / 1000)), completedAt: null },
  })
  void processShortlistRun(runId, { candidateIds: pending.map((p) => p.candidateId) }).catch((err) => {
    console.error(`Error scoring remaining candidates (runId: ${runId}):`, err)
  })
  return { success: true, count: pending.length }
}

export async function processShortlistRun(
  runId: bigint,
  opts?: { candidateIds?: bigint[] }
): Promise<void> {
  const run = await prisma.aiShortlistRun.findUnique({
    where: { id: runId },
    include: {
      job: {
        include: {
          skills: true,
          educationRequirements: {
            include: {
              educationLevel: true,
            },
          },
        },
      },
    },
  })

  if (!run || run.status !== "RUNNING") {
    return
  }

  const applications = await loadActionableShortlistApplications(run.jobId)

  const candidateIds = Array.from(new Set(applications.map((a) => a.userId)))

  if (candidateIds.length === 0) {
    const nowTs = BigInt(Math.floor(Date.now() / 1000))
    await prisma.aiShortlistRun.update({
      where: { id: run.id },
      data: { status: "COMPLETED", completedAt: nowTs },
    })
    return
  }

  // Bulk pre-fetch all candidate profiles to prevent N+1 queries
  const [users, userSkills, userEdus, userExps, userProfiles] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: candidateIds } },
      select: { id: true, firstname: true, lastname: true, email: true },
    }),
    prisma.userSkills.findMany({
      where: { userId: { in: candidateIds } },
      select: {
        userId: true,
        skillName: true,
        level: true,
        verifiedLevel: true,
        lastAssessmentId: true,
      },
    }),
    prisma.userEducation.findMany({
      where: { userId: { in: candidateIds } },
      select: {
        userId: true,
        degreeTitle: true,
        institute: true,
        instituteId: true,
        majorSubject: true,
        grade: true,
        passingYear: true,
        educationLevel: { select: { name: true, rank: true } },
      },
    }),
    prisma.userExperience.findMany({
      where: { userId: { in: candidateIds } },
      select: {
        userId: true,
        jobTitle: true,
        company: true,
        location: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
      },
    }),
    prisma.userProfileDetail.findMany({
      where: { userId: { in: candidateIds } },
      select: {
        userId: true,
        dateOfBirth: true,
        bio: true,
        certifications: true,
        achievements: true,
        noticePeriod: true,
        availability: true,
      },
    }),
  ])

  // Collect assessment IDs for verified candidate skills
  const lastAssessmentIds = userSkills
    .map((s) => s.lastAssessmentId)
    .filter((id): id is bigint => id != null)

  const lastAssessments =
    lastAssessmentIds.length > 0
      ? await prisma.skillAssessment.findMany({
          where: { id: { in: lastAssessmentIds } },
          select: {
            id: true,
            scoredPoints: true,
            maxPoints: true,
          },
        })
      : []

  const assessmentPercentageMap = buildSkillPercentageMap(lastAssessments)

  // Quick test scores (one query for all candidates). Only used while the job's quick test is enabled.
  const quickTestScoreMap = new Map<string, number>()
  if (await getEnabledQuickTest(run.jobId)) {
    const quickTestAttempts = await prisma.quickTestAttempt.findMany({
      where: {
        jobId: run.jobId,
        userId: { in: candidateIds },
        status: { in: ["SUBMITTED", "EXPIRED"] },
      },
      select: { userId: true, scorePercent: true },
    })
    for (const attempt of quickTestAttempts) {
      if (attempt.scorePercent != null) {
        quickTestScoreMap.set(attempt.userId.toString(), attempt.scorePercent)
      }
    }
  }

  // Map pre-fetched candidate data by stringified user ID
  const usersMap = new Map(users.map((u) => [u.id.toString(), u]))
  const skillsMap = new Map<string, typeof userSkills>()
  for (const s of userSkills) {
    const key = s.userId.toString()
    const arr = skillsMap.get(key) ?? []
    arr.push(s)
    skillsMap.set(key, arr)
  }

  const edusMap = new Map<string, typeof userEdus>()
  for (const e of userEdus) {
    const key = e.userId.toString()
    const arr = edusMap.get(key) ?? []
    arr.push(e)
    edusMap.set(key, arr)
  }

  const expsMap = new Map<string, typeof userExps>()
  for (const x of userExps) {
    const key = x.userId.toString()
    const arr = expsMap.get(key) ?? []
    arr.push(x)
    expsMap.set(key, arr)
  }

  const profilesMap = new Map(userProfiles.map((p) => [p.userId.toString(), p]))

  const jobBundle: JobRequirementBundle = {
    id: run.job.id.toString(),
    title: run.job.title,
    company: run.job.company,
    description: run.job.description,
    successCriteria: run.job.successCriteria,
    minimumExperience: run.job.minimumExperience,
    certification: run.job.certification,
    skills: run.job.skills.map((s) => ({
      skillName: s.skillName,
      priority: s.priority as any,
    })),
    educationRequirements: run.job.educationRequirements.map((e) => ({
      educationLevel: e.educationLevel.name,
      field: e.field,
      minimumGpa: e.minimumGpa,
    })),
  }

  // Skip candidates already COMPLETED for this run (resumed runs only re-evaluate
  // the pending/previously-failed candidates, not everyone from scratch).
  const alreadyCompleted = await prisma.aiCandidateShortlistResult.findMany({
    where: { runId: run.id, status: "COMPLETED" },
    select: { candidateId: true },
  })
  const completedIdSet = new Set(alreadyCompleted.map((r) => r.candidateId.toString()))
  const requestedIds = opts?.candidateIds
    ? new Set(opts.candidateIds.map((id) => id.toString()))
    : null

  // Hard filters: deterministic facts for everyone, and filtered-out candidates skip the AI
  // entirely. Targeted scoring (opts.candidateIds) bypasses filtering by design.
  const activeFilters = (run.filters ?? {}) as ShortlistFilters
  const instituteRefs = await loadInstituteRefs()
  const factsMap = new Map<string, CandidateFilterFacts>()
  for (const app of applications) {
    const key = app.userId.toString()
    factsMap.set(
      key,
      computeCandidateFacts({
        dateOfBirth: profilesMap.get(key)?.dateOfBirth,
        educations: (edusMap.get(key) ?? []).map((e) => ({
          ...e,
          levelRank: e.educationLevel?.rank ?? null,
          levelName: e.educationLevel?.name ?? null,
        })),
      }, instituteRefs)
    )
  }

  const pendingApplications: typeof applications = []
  for (const app of applications) {
    const key = app.userId.toString()
    if (completedIdSet.has(key)) continue
    if (requestedIds) {
      if (requestedIds.has(key)) pendingApplications.push(app)
      continue
    }
    if (evaluateFilters(factsMap.get(key), activeFilters).bucket === "FILTERED_OUT") {
      const nowTs = BigInt(Math.floor(Date.now() / 1000))
      await prisma.aiCandidateShortlistResult.upsert({
        where: { runId_candidateId: { runId: run.id, candidateId: app.userId } },
        create: {
          runId: run.id,
          jobId: run.jobId,
          candidateId: app.userId,
          applicationId: app.id,
          status: "FILTERED_OUT",
          filterFacts: factsMap.get(key) as any,
          createdAt: nowTs,
          updatedAt: nowTs,
        },
        update: { status: "FILTERED_OUT", filterFacts: factsMap.get(key) as any, updatedAt: nowTs },
      })
      continue
    }
    pendingApplications.push(app)
  }

  // Run evaluation with concurrency limit
  await runWithConcurrency(pendingApplications, AI_SHORTLIST_CONCURRENCY, async (app) => {
    const userIdStr = app.userId.toString()
    const u = usersMap.get(userIdStr)
    if (!u) return

    const candidateBundle: CandidateProfileBundle = {
      id: userIdStr,
      firstname: u.firstname,
      lastname: u.lastname,
      email: u.email,
      skills: skillsMap.get(userIdStr) ?? [],
      educations: (edusMap.get(userIdStr) ?? []).map((e) => ({
        degreeTitle: e.degreeTitle,
        levelName: e.educationLevel?.name,
        institute: e.institute,
        majorSubject: e.majorSubject,
        grade: e.grade,
        passingYear: e.passingYear,
      })),
      experiences: expsMap.get(userIdStr) ?? [],
      profileDetail: profilesMap.get(userIdStr) ?? null,
      assessmentPercentageMap,
      quickTestPercentage: quickTestScoreMap.get(userIdStr) ?? null,
    }

    try {
      const deterministicMatch = computeDeterministicMatch(jobBundle, candidateBundle)
      const promptPayload = buildAiPromptPayload(jobBundle, deterministicMatch, candidateBundle)
      const aiEvaluation = await evaluateCandidateForJob(promptPayload)
      const combined = combineShortlistScore(deterministicMatch, aiEvaluation)

      const nowTs = BigInt(Math.floor(Date.now() / 1000))
      await prisma.aiCandidateShortlistResult.upsert({
        where: {
          runId_candidateId: {
            runId: run.id,
            candidateId: app.userId,
          },
        },
        create: {
          runId: run.id,
          jobId: run.jobId,
          candidateId: app.userId,
          applicationId: app.id,
          status: "COMPLETED",
          errorMessage: null,
          overallScore: combined.overallScore,
          skillsScore: combined.skillsScore,
          educationScore: combined.educationScore,
          experienceScore: combined.experienceScore,
          successCriteriaScore: combined.successCriteriaScore,
          assessmentScore: combined.assessmentScore,
          quickTestScore: combined.quickTestScore,
          mandatoryRequirementsMet: combined.mandatoryRequirementsMet,
          aiConfidence: combined.aiConfidence,
          recommendation: combined.recommendation,
          matchedRequirements: aiEvaluation.matchedRequirements,
          missingRequirements: aiEvaluation.missingRequirements,
          mandatoryChecklist: aiEvaluation.mandatoryChecklist as any,
          strengths: aiEvaluation.strengths,
          concerns: aiEvaluation.concerns,
          aiReasoning: aiEvaluation.reasoning,
          filterFacts: factsMap.get(userIdStr) as any,
          createdAt: nowTs,
          updatedAt: nowTs,
        },
        update: {
          status: "COMPLETED",
          errorMessage: null,
          overallScore: combined.overallScore,
          skillsScore: combined.skillsScore,
          educationScore: combined.educationScore,
          experienceScore: combined.experienceScore,
          successCriteriaScore: combined.successCriteriaScore,
          assessmentScore: combined.assessmentScore,
          quickTestScore: combined.quickTestScore,
          mandatoryRequirementsMet: combined.mandatoryRequirementsMet,
          aiConfidence: combined.aiConfidence,
          recommendation: combined.recommendation,
          matchedRequirements: aiEvaluation.matchedRequirements,
          missingRequirements: aiEvaluation.missingRequirements,
          mandatoryChecklist: aiEvaluation.mandatoryChecklist as any,
          strengths: aiEvaluation.strengths,
          concerns: aiEvaluation.concerns,
          aiReasoning: aiEvaluation.reasoning,
          filterFacts: factsMap.get(userIdStr) as any,
          updatedAt: nowTs,
        },
      })
    } catch (err: any) {
      console.error(`Candidate shortlisting evaluation failed for candidate ${userIdStr}:`, err)
      const nowTs = BigInt(Math.floor(Date.now() / 1000))
      const errMessage = (err.message ?? "Evaluation failed").slice(0, 500)

      await prisma.aiCandidateShortlistResult.upsert({
        where: {
          runId_candidateId: {
            runId: run.id,
            candidateId: app.userId,
          },
        },
        create: {
          runId: run.id,
          jobId: run.jobId,
          candidateId: app.userId,
          applicationId: app.id,
          status: "FAILED",
          errorMessage: errMessage,
          createdAt: nowTs,
          updatedAt: nowTs,
        },
        update: {
          status: "FAILED",
          errorMessage: errMessage,
          updatedAt: nowTs,
        },
      })
    }
  })

  // Final run status derivation
  const grouped = await prisma.aiCandidateShortlistResult.groupBy({
    by: ["status"],
    where: { runId: run.id },
    _count: true,
  })

  let completedCount = 0
  let failedCount = 0
  for (const item of grouped) {
    if (item.status === "COMPLETED") completedCount = item._count
    if (item.status === "FAILED") failedCount = item._count
  }

  let finalStatus: "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED" = "COMPLETED"
  if (completedCount === 0 && failedCount > 0) {
    finalStatus = "FAILED"
  } else if (failedCount > 0) {
    finalStatus = "COMPLETED_WITH_ERRORS"
  }

  const nowTs = BigInt(Math.floor(Date.now() / 1000))
  await prisma.aiShortlistRun.update({
    where: { id: run.id },
    data: {
      status: finalStatus,
      completedAt: nowTs,
    },
  })

  // Send notification to admin
  try {
    const runSummary = `${completedCount} evaluated successfully${
      failedCount > 0 ? `, ${failedCount} failed` : ""
    }`
    await notifyAiShortlistComplete(run.triggeredBy, run.job.title, runSummary, run.jobId)
  } catch (notifErr) {
    console.error("Failed to send AI shortlisting completion notification:", notifErr)
  }
}
