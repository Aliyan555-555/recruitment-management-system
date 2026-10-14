import { createHash } from "crypto"
import { Prisma } from "@prisma/client"
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
  AI_SHORTLIST_FUNNEL,
  AI_SHORTLIST_RUN_RATE_LIMIT,
  AI_SHORTLIST_STALE_RUN_SECONDS,
} from "@/lib/ai-shortlist/config"
import { runWithConcurrency } from "@/lib/ai-shortlist/concurrency"
import {
  buildAiPromptPayload,
  CandidateProfileBundle,
  computeDeterministicMatch,
  DeterministicMatch,
  JobRequirementBundle,
  ShortlistAiPromptPayload,
} from "@/lib/ai-shortlist/deterministic"
import {
  CandidateFilterFacts,
  computeCandidateFacts,
  evaluateFilters,
  parseMinExperienceYears,
  sanitizeFilters,
  ShortlistFilters,
} from "@/lib/ai-shortlist/filters"
import { AtsJobInput, AtsResult, computeAtsScore, selectForAi } from "@/lib/ai-shortlist/ats-score"
import { loadInstituteRefs } from "@/lib/services/candidate-filter-facts"
import { combineShortlistScore } from "@/lib/ai-shortlist/scoring"
import { evaluateCandidatesBatch, ShortlistEvaluationError } from "@/lib/ai/shortlist-evaluator"
import { AiQuotaExhaustedError } from "@/lib/ai/ai-client"
import { buildSkillPercentageMap } from "@/lib/assessments/skill-percentage"
import { notifyAiShortlistComplete } from "@/lib/notifications"

// Bump when the evaluator prompt/schema changes so cached results are not reused across versions.
const EVALUATION_VERSION = "3"

function payloadHash(payload: unknown): string {
  return createHash("sha256").update(EVALUATION_VERSION).update(JSON.stringify(payload)).digest("hex")
}

const nowSeconds = () => BigInt(Math.floor(Date.now() / 1000))

export const AI_NOT_CONFIGURED_MESSAGE =
  "AI is not set up yet, so candidates cannot be scored. An admin must add an AI token under Settings → AI Configuration (or set AI_INFERENCE_TOKEN in the server environment)."

export const AI_QUOTA_REACHED_MESSAGE = "AI quota reached: ranked by ATS score only. Score with AI later."

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

/** Clamp an admin-supplied "send top K to AI" value. */
export function sanitizeAiTopK(raw: unknown): number {
  const n = Math.round(Number(raw))
  if (!Number.isFinite(n) || n <= 0) return AI_SHORTLIST_FUNNEL.topK
  return Math.min(AI_SHORTLIST_FUNNEL.maxTopK, n)
}

export async function startShortlistRun(
  jobId: bigint,
  adminUserId: bigint,
  rawFilters?: unknown,
  rawAiTopK?: unknown
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
  const aiCandidateLimit = sanitizeAiTopK(rawAiTopK)
  const run = resumeFromRunId
    ? await prisma.aiShortlistRun.update({
        where: { id: resumeFromRunId },
        data: {
          status: "RUNNING",
          totalCandidates: candidateApps.length,
          startedAt: nowBigInt,
          completedAt: null,
          filters: filtersJson ?? null,
          aiCandidateLimit,
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
          aiCandidateLimit,
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
 * AI-scores candidates the funnel did not send to the AI: those excluded by hard filters (admin
 * relaxed a filter chip) or ranked below the ATS cut-off. Already AI-scored candidates are never re-scored.
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
    where: { runId, candidateId: { in: candidateIds }, status: { in: ["FILTERED_OUT", "ATS_ONLY", "FAILED"] } },
    select: { candidateId: true },
  })
  if (pending.length === 0)
    return { success: false, error: "No unscored candidates selected.", code: "NOTHING_TO_SCORE" }

  await prisma.aiShortlistRun.update({
    where: { id: runId },
    data: { status: "RUNNING", startedAt: nowSeconds(), completedAt: null },
  })
  void processShortlistRun(runId, { candidateIds: pending.map((p) => p.candidateId) }).catch((err) => {
    console.error(`Error scoring remaining candidates (runId: ${runId}):`, err)
  })
  return { success: true, count: pending.length }
}

interface FunnelCandidate {
  app: { id: bigint; userId: bigint }
  key: string
  facts: CandidateFilterFacts
  match: DeterministicMatch
  payload: ShortlistAiPromptPayload
  ats: AtsResult
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
    await prisma.aiShortlistRun.update({
      where: { id: run.id },
      data: { status: "COMPLETED", completedAt: nowSeconds() },
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
  const usersMap = new Map(users.map((u) => [u.id.toString(), u]))
  const skillsMap = byUser(userSkills)
  const edusMap = byUser(userEdus)
  const expsMap = byUser(userExps)
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

  const educationRanks = run.job.educationRequirements.map((e) => e.educationLevel.rank).filter((r) => r > 0)
  const atsJob: AtsJobInput = {
    title: run.job.title,
    requiredSkills: jobBundle.skills.filter((s) => s.priority === "REQUIRED").map((s) => s.skillName),
    minExperienceYears: parseMinExperienceYears(run.job.minimumExperience),
    minEducationRank: educationRanks.length > 0 ? Math.min(...educationRanks) : null,
    educationFields: run.job.educationRequirements.map((e) => e.field).filter((f): f is string => !!f),
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

  // ---- Stage 1 + 2: hard filters and ATS score for everyone (no AI) ----
  const activeFilters = (run.filters ?? {}) as ShortlistFilters
  const instituteRefs = await loadInstituteRefs()
  const passed: FunnelCandidate[] = []
  const forcedToAi: FunnelCandidate[] = []
  let filteredOutCount = 0

  for (const app of applications) {
    const key = app.userId.toString()
    if (completedIdSet.has(key)) continue
    if (requestedIds && !requestedIds.has(key)) continue
    const u = usersMap.get(key)
    if (!u) continue

    const edus = edusMap.get(key) ?? []
    const exps = expsMap.get(key) ?? []
    const profile = profilesMap.get(key) ?? null
    const skills = skillsMap.get(key) ?? []
    const candidateBundle: CandidateProfileBundle = {
      id: key,
      firstname: u.firstname,
      lastname: u.lastname,
      email: u.email,
      skills,
      educations: edus.map((e) => ({
        degreeTitle: e.degreeTitle,
        levelName: e.educationLevel?.name,
        institute: e.institute,
        majorSubject: e.majorSubject,
        grade: e.grade,
        passingYear: e.passingYear,
      })),
      experiences: exps,
      profileDetail: profile,
      assessmentPercentageMap,
      quickTestPercentage: quickTestScoreMap.get(key) ?? null,
    }
    const match = computeDeterministicMatch(jobBundle, candidateBundle)
    const hasRequiredSkills = match.matchedRequiredSkills.length + match.missingRequiredSkills.length > 0
    const facts = computeCandidateFacts(
      {
        dateOfBirth: profile?.dateOfBirth,
        educations: edus.map((e) => ({
          ...e,
          levelRank: e.educationLevel?.rank ?? null,
          levelName: e.educationLevel?.name ?? null,
        })),
        experiences: exps,
        requiredSkillCoverage: hasRequiredSkills ? match.requiredSkillCoverage : null,
      },
      instituteRefs
    )
    const ats = computeAtsScore(match, atsJob, {
      experienceYears: facts.experienceYears ?? null,
      experienceTitles: exps.map((x) => x.jobTitle),
      highestEducationRank: facts.highestEducationRank ?? null,
      majors: edus.map((e) => e.majorSubject ?? e.degreeTitle),
      skillCount: skills.length,
      educationCount: edus.length,
      hasBio: !!profile?.bio?.trim(),
      hasCertifications: !!profile?.certifications?.trim(),
    })
    const candidate: FunnelCandidate = {
      app,
      key,
      facts,
      match,
      payload: buildAiPromptPayload(jobBundle, match, candidateBundle),
      ats,
    }

    // Targeted scoring (opts.candidateIds) bypasses filters and the ATS cut-off by design.
    if (requestedIds) {
      forcedToAi.push(candidate)
      continue
    }
    if (evaluateFilters(facts, activeFilters).bucket === "FILTERED_OUT") {
      filteredOutCount++
      await saveResult(run, app, { status: "FILTERED_OUT", ...atsFields(candidate), ...emptyAiFields })
      continue
    }
    passed.push(candidate)
  }

  // ---- Stage 3 selection: only the best-ranked candidates go to the AI ----
  const topK = run.aiCandidateLimit ?? AI_SHORTLIST_FUNNEL.topK
  const selected = requestedIds ? forcedToAi : selectForAi(passed, topK, AI_SHORTLIST_FUNNEL.minAtsScore)
  const selectedKeys = new Set(selected.map((c) => c.key))
  for (const c of passed) {
    if (selectedKeys.has(c.key)) continue
    await saveResult(run, c.app, { status: "ATS_ONLY", ...atsFields(c), ...emptyAiFields })
  }

  // Re-runs on an unchanged job + profile would pay for the same AI answer again. Load the latest
  // COMPLETED result per candidate from earlier runs; if its payload hash matches, copy it instead.
  const previousByCandidate = new Map<string, any>()
  if (selected.length > 0) {
    const previous = await prisma.aiCandidateShortlistResult.findMany({
      where: {
        jobId: run.jobId,
        runId: { not: run.id },
        status: "COMPLETED",
        candidateId: { in: selected.map((c) => c.app.userId) },
      },
      orderBy: { updatedAt: "desc" },
    })
    for (const r of previous) {
      const key = r.candidateId.toString()
      if (!previousByCandidate.has(key)) previousByCandidate.set(key, r)
    }
  }

  const toEvaluate: (FunnelCandidate & { hash: string })[] = []
  for (const c of selected) {
    const hash = payloadHash(c.payload)
    const prev = previousByCandidate.get(c.key)
    if ((prev?.filterFacts as any)?.payloadHash === hash) {
      await saveResult(run, c.app, {
        ...atsFields(c, hash),
        status: "COMPLETED",
        errorMessage: null,
        overallScore: prev.overallScore,
        skillsScore: prev.skillsScore,
        educationScore: prev.educationScore,
        experienceScore: prev.experienceScore,
        successCriteriaScore: prev.successCriteriaScore,
        assessmentScore: prev.assessmentScore,
        quickTestScore: prev.quickTestScore,
        mandatoryRequirementsMet: prev.mandatoryRequirementsMet,
        aiConfidence: prev.aiConfidence,
        recommendation: prev.recommendation,
        matchedRequirements: prev.matchedRequirements,
        missingRequirements: prev.missingRequirements,
        mandatoryChecklist: (prev.mandatoryChecklist ?? undefined) as any,
        strengths: prev.strengths,
        concerns: prev.concerns,
        aiReasoning: prev.aiReasoning,
      })
      continue
    }
    toEvaluate.push({ ...c, hash })
  }

  // ---- Stage 3: AI in batches ----
  const batches: (typeof toEvaluate)[] = []
  for (let i = 0; i < toEvaluate.length; i += AI_SHORTLIST_FUNNEL.batchSize) {
    batches.push(toEvaluate.slice(i, i + AI_SHORTLIST_FUNNEL.batchSize))
  }
  let quotaExhausted = false
  await runWithConcurrency(batches, AI_SHORTLIST_CONCURRENCY, async (batch) => {
    if (quotaExhausted) {
      for (const c of batch) {
        await saveResult(run, c.app, { status: "ATS_ONLY", ...atsFields(c), ...emptyAiFields, errorMessage: AI_QUOTA_REACHED_MESSAGE })
      }
      return
    }

    let requests = 0
    let results: Awaited<ReturnType<typeof evaluateCandidatesBatch>>
    try {
      results = await evaluateCandidatesBatch(
        batch[0].payload.job,
        batch.map((c) => ({ key: c.key, candidate: c.payload.candidate, deterministic: c.payload.deterministic, atsScore: c.ats.atsScore })),
        { onRequest: () => requests++ }
      )
    } catch (err) {
      if (!(err instanceof AiQuotaExhaustedError)) throw err
      console.warn(`[AI Shortlist] Quota exhausted during run ${run.id}; remaining candidates keep their ATS ranking`)
      quotaExhausted = true
      results = new Map()
    } finally {
      if (requests > 0) {
        await prisma.aiShortlistRun.update({ where: { id: run.id }, data: { aiRequestCount: { increment: requests } } })
      }
    }

    for (const c of batch) {
      const r = results.get(c.key)
      if (!r) {
        await saveResult(run, c.app, { status: "ATS_ONLY", ...atsFields(c), ...emptyAiFields, errorMessage: AI_QUOTA_REACHED_MESSAGE })
      } else if (r instanceof ShortlistEvaluationError) {
        console.error(`Candidate shortlisting evaluation failed for candidate ${c.key}:`, r.message)
        await saveResult(run, c.app, { status: "FAILED", ...atsFields(c), ...emptyAiFields, errorMessage: r.message.slice(0, 500) })
      } else {
        const combined = combineShortlistScore(c.match, r)
        await saveResult(run, c.app, {
          ...atsFields(c, c.hash),
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
          matchedRequirements: r.matchedRequirements,
          missingRequirements: r.missingRequirements,
          mandatoryChecklist: r.mandatoryChecklist as any,
          strengths: r.strengths,
          concerns: r.concerns,
          aiReasoning: r.reasoning,
        })
      }
    }
  })

  // Final run status derivation
  const grouped = await prisma.aiCandidateShortlistResult.groupBy({
    by: ["status"],
    where: { runId: run.id },
    _count: true,
  })

  const counts: Record<string, number> = {}
  for (const item of grouped) counts[item.status] = item._count
  const completedCount = counts.COMPLETED ?? 0
  const failedCount = counts.FAILED ?? 0
  const atsOnlyCount = counts.ATS_ONLY ?? 0

  let finalStatus: "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED" = "COMPLETED"
  if (completedCount === 0 && (failedCount > 0 || quotaExhausted)) {
    finalStatus = quotaExhausted && atsOnlyCount > 0 ? "COMPLETED_WITH_ERRORS" : "FAILED"
  } else if (failedCount > 0 || quotaExhausted) {
    finalStatus = "COMPLETED_WITH_ERRORS"
  }

  const finished = await prisma.aiShortlistRun.update({
    where: { id: run.id },
    data: {
      status: finalStatus,
      completedAt: nowSeconds(),
    },
  })

  console.info(
    `[AI Shortlist] run ${run.id}: ${applications.length} applicants, ${filteredOutCount} filtered out, ` +
      `${passed.length} ATS-ranked, ${selected.length} sent to AI (${toEvaluate.length} uncached) ` +
      `in ${finished.aiRequestCount} AI requests${quotaExhausted ? " (quota exhausted)" : ""}`
  )

  // Send notification to admin
  try {
    const runSummary = [
      `${completedCount} AI-scored`,
      atsOnlyCount > 0 ? `${atsOnlyCount} ranked by ATS only` : null,
      failedCount > 0 ? `${failedCount} failed` : null,
      quotaExhausted ? "AI quota reached" : null,
    ]
      .filter(Boolean)
      .join(", ")
    await notifyAiShortlistComplete(run.triggeredBy, run.job.title, runSummary, run.jobId)
  } catch (notifErr) {
    console.error("Failed to send AI shortlisting completion notification:", notifErr)
  }
}

const emptyAiFields = {
  errorMessage: null,
  overallScore: null,
  skillsScore: null,
  educationScore: null,
  experienceScore: null,
  successCriteriaScore: null,
  assessmentScore: null,
  quickTestScore: null,
  mandatoryRequirementsMet: null,
  aiConfidence: null,
  recommendation: null,
  mandatoryChecklist: Prisma.DbNull,
  strengths: Prisma.DbNull,
  concerns: Prisma.DbNull,
  aiReasoning: null,
}

/** ATS score + deterministic matched/missing skills; payload hash marks a reusable AI answer. */
function atsFields(c: FunnelCandidate, hash?: string) {
  return {
    atsScore: c.ats.atsScore,
    atsBreakdown: c.ats.breakdown as any,
    matchedRequirements: [...c.match.matchedRequiredSkills, ...c.match.matchedPreferredSkills],
    missingRequirements: c.match.missingRequiredSkills,
    filterFacts: (hash ? { ...c.facts, payloadHash: hash } : c.facts) as any,
  }
}

async function saveResult(
  run: { id: bigint; jobId: bigint },
  app: { id: bigint; userId: bigint },
  data: Record<string, any>
) {
  const nowTs = nowSeconds()
  await prisma.aiCandidateShortlistResult.upsert({
    where: { runId_candidateId: { runId: run.id, candidateId: app.userId } },
    create: {
      runId: run.id,
      jobId: run.jobId,
      candidateId: app.userId,
      applicationId: app.id,
      createdAt: nowTs,
      updatedAt: nowTs,
      ...data,
    } as any,
    update: { ...data, updatedAt: nowTs },
  })
}
