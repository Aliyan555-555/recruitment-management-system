import { prisma } from "@/lib/prisma"
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
import { combineShortlistScore } from "@/lib/ai-shortlist/scoring"
import { evaluateCandidateForJob } from "@/lib/ai/shortlist-evaluator"
import { buildSkillPercentageMap } from "@/lib/assessments/skill-percentage"
import { notifyAiShortlistComplete } from "@/lib/notifications"

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
  adminUserId: bigint
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
  const run = resumeFromRunId
    ? await prisma.aiShortlistRun.update({
        where: { id: resumeFromRunId },
        data: {
          status: "RUNNING",
          totalCandidates: candidateApps.length,
          startedAt: nowBigInt,
          completedAt: null,
        },
      })
    : await prisma.aiShortlistRun.create({
        data: {
          jobId,
          triggeredBy: adminUserId,
          status: "RUNNING",
          totalCandidates: candidateApps.length,
          aiModel: process.env.AI_INFERENCE_MODEL ?? "openai/gpt-oss-20b:free",
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

export async function processShortlistRun(runId: bigint): Promise<void> {
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
        majorSubject: true,
        grade: true,
        passingYear: true,
        educationLevel: { select: { name: true } },
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
  const pendingApplications = applications.filter(
    (app) => !completedIdSet.has(app.userId.toString())
  )

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
          mandatoryRequirementsMet: combined.mandatoryRequirementsMet,
          aiConfidence: combined.aiConfidence,
          recommendation: combined.recommendation,
          matchedRequirements: aiEvaluation.matchedRequirements,
          missingRequirements: aiEvaluation.missingRequirements,
          mandatoryChecklist: aiEvaluation.mandatoryChecklist as any,
          strengths: aiEvaluation.strengths,
          concerns: aiEvaluation.concerns,
          aiReasoning: aiEvaluation.reasoning,
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
          mandatoryRequirementsMet: combined.mandatoryRequirementsMet,
          aiConfidence: combined.aiConfidence,
          recommendation: combined.recommendation,
          matchedRequirements: aiEvaluation.matchedRequirements,
          missingRequirements: aiEvaluation.missingRequirements,
          mandatoryChecklist: aiEvaluation.mandatoryChecklist as any,
          strengths: aiEvaluation.strengths,
          concerns: aiEvaluation.concerns,
          aiReasoning: aiEvaluation.reasoning,
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
