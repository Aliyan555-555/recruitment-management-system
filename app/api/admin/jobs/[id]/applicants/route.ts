import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { ensureJobStatusCurrent } from "@/lib/middleware/job-status-check"
import { eligibilityFromApplication, SHORTLIST_PIPELINE_SELECT } from "@/lib/admin/shortlist-eligibility"
import { applicantTab } from "@/lib/admin/applicant-buckets"
import {
  ageFromDob,
  ApplicantAiSummary,
  ApplicantRow,
  ApplicantsResponse,
  experienceYears,
} from "@/lib/admin/applicant-serializers"
import {
  JOB_CRITERIA_SELECT,
  loadCandidateFilterFacts,
  serializeJobCriteria,
} from "@/lib/services/candidate-filter-facts"
import { sanitizeFilters } from "@/lib/ai-shortlist/filters"
import { AI_SHORTLIST_STALE_RUN_SECONDS } from "@/lib/ai-shortlist/config"

// Unified applicant list for the Applicants (shortlisting) page: one row per application with
// enough CV data to decide from the list, plus the latest AI run's result per candidate.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    const jobId = BigInt(params.id)
    await ensureJobStatusCurrent(jobId)

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        ...JOB_CRITERIA_SELECT,
        workflow: {
          select: { steps: { where: { stepOrder: 1 }, select: { id: true, stepName: true }, take: 1 } },
        },
      },
    })
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })

    const applications = await prisma.jobsApplied.findMany({
      where: {
        jobId,
        status: { in: ["APPLIED", "SUBMITTED", "SHORTLISTED", "BATCH_ASSIGNED", "REMOVED"] },
      },
      include: {
        user: {
          select: { id: true, firstname: true, lastname: true, email: true, phone1: true, city: true, avatar: true },
        },
        pipeline: { select: SHORTLIST_PIPELINE_SELECT },
      },
      orderBy: { appliedAt: "desc" },
    })
    const userIds = applications.map((a) => a.userId)

    const runs = await prisma.aiShortlistRun.findMany({
      where: { jobId },
      orderBy: { startedAt: "desc" },
      take: 10,
      select: { id: true, status: true, totalCandidates: true, filters: true, startedAt: true, completedAt: true },
    })
    const latestRun = runs[0] ?? null

    const [facts, educations, experiences, skills, quickTests, aiResults, runCounts] = await Promise.all([
      loadCandidateFilterFacts(userIds),
      prisma.userEducation.findMany({
        where: { userId: { in: userIds } },
        select: {
          userId: true,
          degreeTitle: true,
          institute: true,
          instituteRef: { select: { name: true } },
          educationLevel: { select: { name: true, rank: true } },
        },
      }),
      prisma.userExperience.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, jobTitle: true, company: true, startDate: true, endDate: true, isCurrent: true, createdAt: true },
      }),
      prisma.userSkills.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, skillName: true, level: true, verifiedLevel: true },
      }),
      prisma.quickTestAttempt.findMany({
        where: { jobId, userId: { in: userIds }, status: { in: ["SUBMITTED", "EXPIRED"] } },
        select: { userId: true, scorePercent: true },
      }),
      latestRun
        ? prisma.aiCandidateShortlistResult.findMany({
            where: { runId: latestRun.id },
            select: {
              candidateId: true,
              status: true,
              overallScore: true,
              recommendation: true,
              aiConfidence: true,
              skillsScore: true,
              experienceScore: true,
              educationScore: true,
              mandatoryRequirementsMet: true,
            },
          })
        : Promise.resolve([]),
      latestRun
        ? prisma.aiCandidateShortlistResult.groupBy({ by: ["status"], where: { runId: latestRun.id }, _count: true })
        : Promise.resolve([]),
    ])

    const group = <T extends { userId: bigint }>(rows: T[]) => {
      const m = new Map<string, T[]>()
      for (const r of rows) {
        const k = r.userId.toString()
        m.set(k, [...(m.get(k) ?? []), r])
      }
      return m
    }
    const eduBy = group(educations)
    const expBy = group(experiences)
    const skillBy = group(skills)
    const quickBy = new Map(quickTests.map((q) => [q.userId.toString(), q.scorePercent]))
    const aiBy = new Map(aiResults.map((r) => [r.candidateId.toString(), r]))

    const applicants: ApplicantRow[] = applications.map((app) => {
      const key = app.userId.toString()
      const eligibility = eligibilityFromApplication(app)
      const f = facts.get(key) ?? null

      const edus = eduBy.get(key) ?? []
      const topEdu = edus.reduce<(typeof edus)[number] | null>(
        (best, e) => (!best || (e.educationLevel?.rank ?? 0) > (best.educationLevel?.rank ?? 0) ? e : best),
        null
      )

      const exps = expBy.get(key) ?? []
      const latest = [...exps].sort((a, b) =>
        a.isCurrent !== b.isCurrent ? (a.isCurrent ? -1 : 1) : Number(b.createdAt - a.createdAt)
      )[0]

      const userSkills = [...(skillBy.get(key) ?? [])].sort(
        (a, b) => Number(!!b.verifiedLevel) - Number(!!a.verifiedLevel) || b.level - a.level
      )

      const ai = aiBy.get(key)
      const aiSummary: ApplicantAiSummary | null =
        ai && latestRun
          ? {
              runId: latestRun.id.toString(),
              status: ai.status,
              overallScore: ai.overallScore,
              recommendation: ai.recommendation,
              aiConfidence: ai.aiConfidence,
              skillsScore: ai.skillsScore,
              experienceScore: ai.experienceScore,
              educationScore: ai.educationScore,
              mandatoryRequirementsMet: ai.mandatoryRequirementsMet,
            }
          : null

      return {
        applicationId: app.id.toString(),
        candidateId: key,
        name: `${app.user.firstname} ${app.user.lastname}`.trim(),
        email: app.user.email,
        phone: app.user.phone1,
        city: app.user.city,
        avatar: app.user.avatar,
        appliedAt: app.appliedAt.toString(),
        tab: applicantTab(eligibility.queueTab, app.reviewFlag),
        actionable: eligibility.actionable,
        actionBlockedReason: eligibility.actionBlockedReason,
        statusLabel: eligibility.statusLabel,
        reviewFlag: app.reviewFlag,
        hasNote: !!app.note,
        age: ageFromDob(f?.dob),
        highestEducation: topEdu
          ? {
              level: topEdu.educationLevel?.name ?? "",
              degree: topEdu.degreeTitle,
              institute: topEdu.instituteRef?.name ?? topEdu.institute,
            }
          : null,
        latestRole: latest ? { title: latest.jobTitle, company: latest.company, isCurrent: latest.isCurrent } : null,
        experienceYears: experienceYears(exps),
        topSkills: userSkills.slice(0, 5).map((s) => ({ name: s.skillName, verified: !!s.verifiedLevel })),
        quickTestScore: quickBy.get(key) ?? null,
        ai: aiSummary,
        filterFacts: f,
      }
    })

    let completedCount = 0
    let failedCount = 0
    for (const c of runCounts) {
      if (c.status === "COMPLETED") completedCount = c._count
      if (c.status === "FAILED") failedCount = c._count
    }
    const lastFailed =
      latestRun && failedCount > 0
        ? await prisma.aiCandidateShortlistResult.findFirst({
            where: { runId: latestRun.id, status: "FAILED" },
            orderBy: { updatedAt: "desc" },
            select: { errorMessage: true },
          })
        : null
    const nowSec = Math.floor(Date.now() / 1000)

    const response: ApplicantsResponse = {
      job: {
        id: job.id.toString(),
        title: job.title,
        firstRound: job.workflow?.steps[0]
          ? { id: job.workflow.steps[0].id.toString(), stepName: job.workflow.steps[0].stepName }
          : null,
      },
      defaultFilters: serializeJobCriteria(job).defaultFilters,
      aiRun: latestRun
        ? {
            id: latestRun.id.toString(),
            status: latestRun.status,
            totalCandidates: latestRun.totalCandidates,
            completedCount,
            failedCount,
            filters: latestRun.filters ? sanitizeFilters(latestRun.filters) : null,
            startedAt: latestRun.startedAt.toString(),
            completedAt: latestRun.completedAt?.toString() ?? null,
            lastError: lastFailed?.errorMessage ?? null,
            isStale:
              latestRun.status === "RUNNING" && nowSec - Number(latestRun.startedAt) >= AI_SHORTLIST_STALE_RUN_SECONDS,
          }
        : null,
      aiRuns: runs.map((r) => ({ id: r.id.toString(), status: r.status, startedAt: r.startedAt.toString() })),
      applicants,
    }
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Error fetching applicants:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch applicants" }, { status: 500 })
  }
}
