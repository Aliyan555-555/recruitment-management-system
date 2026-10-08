import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { shortlistCandidates } from "@/lib/services/bulk-hiring-service"
import { setMaybeFlag } from "@/lib/services/applicant-review-service"
import {
  JOB_CRITERIA_SELECT,
  loadCandidateFilterFacts,
  serializeJobCriteria,
} from "@/lib/services/candidate-filter-facts"
import { ensureJobStatusCurrent } from "@/lib/middleware/job-status-check"
import {
  eligibilityFromApplication,
  ShortlistIneligibleError,
  SHORTLIST_PIPELINE_SELECT,
  type ShortlistQueueTab,
} from "@/lib/admin/shortlist-eligibility"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const jobId = BigInt(params.id)
    await ensureJobStatusCurrent(jobId)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") as ShortlistQueueTab | null

    const applications = await prisma.jobsApplied.findMany({
      where: {
        jobId,
        status: {
          in: ["APPLIED", "SUBMITTED", "SHORTLISTED", "BATCH_ASSIGNED", "REMOVED"],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            phone1: true,
            city: true,
            country: true,
          },
        },
        pipeline: {
          select: SHORTLIST_PIPELINE_SELECT,
        },
      },
      orderBy: {
        appliedAt: "desc",
      },
    })

    // Quick test scores for this job's applicants (one query)
    const quickTestAttempts = applications.length
      ? await prisma.quickTestAttempt.findMany({
          where: {
            jobId,
            userId: { in: applications.map((app) => app.userId) },
            status: { in: ["SUBMITTED", "EXPIRED"] },
          },
          select: { userId: true, scorePercent: true },
        })
      : []
    const quickTestScoreByUser = new Map(
      quickTestAttempts.map((attempt) => [attempt.userId.toString(), attempt.scorePercent])
    )

    const [filterFacts, jobCriteriaRow] = await Promise.all([
      loadCandidateFilterFacts(applications.map((app) => app.userId)),
      prisma.job.findUnique({ where: { id: jobId }, select: JOB_CRITERIA_SELECT }),
    ])
    const { criteria, defaultFilters } = jobCriteriaRow
      ? serializeJobCriteria(jobCriteriaRow)
      : { criteria: null, defaultFilters: {} }

    const classified = applications.map((app) => {
      const eligibility = eligibilityFromApplication(app)
      return { app, eligibility }
    })

    const needsReview = classified.filter((c) => c.eligibility.queueTab === "applied").length
    const shortlisted = classified.filter((c) => c.eligibility.queueTab === "shortlisted").length
    const rejected = classified.filter((c) => c.eligibility.queueTab === "rejected").length
    const counts = {
      needsReview,
      shortlisted,
      rejected,
      total: needsReview + shortlisted + rejected,
    }

    const filtered =
      status === "applied" || status === "shortlisted" || status === "rejected"
        ? classified.filter((c) => c.eligibility.queueTab === status)
        : classified.filter((c) => c.eligibility.queueTab !== "rejected")

    return NextResponse.json({
      counts,
      criteria,
      defaultFilters,
      applications: filtered.map(({ app, eligibility }) => ({
        id: app.id.toString(),
        candidateId: app.userId.toString(),
        candidate: {
          name: `${app.user.firstname} ${app.user.lastname}`,
          email: app.user.email,
          phone: app.user.phone1,
          location: `${app.user.city || ""}, ${app.user.country || ""}`.trim(),
        },
        status: app.status,
        appliedAt: app.appliedAt.toString(),
        pipelineStatus: app.pipeline?.overallStatus ?? null,
        lockState: app.pipeline?.lockState ?? null,
        actionable: eligibility.actionable,
        actionBlockedReason: eligibility.actionBlockedReason,
        statusLabel: eligibility.statusLabel,
        quickTestScore: quickTestScoreByUser.get(app.userId.toString()) ?? null,
        filterFacts: filterFacts.get(app.userId.toString()) ?? null,
        profile: {
          name: `${app.user.firstname} ${app.user.lastname}`,
          email: app.user.email,
        },
      })),
    })
  } catch (error: any) {
    console.error("Error fetching shortlist candidates:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch candidates" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const jobId = BigInt(params.id)
    await ensureJobStatusCurrent(jobId)

    const body = await req.json()
    const { candidateIds, action } = body

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json(
        { error: "candidateIds array is required" },
        { status: 400 }
      )
    }

    if (!["select", "reject", "maybe", "unmaybe"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'select', 'reject', 'maybe' or 'unmaybe'" },
        { status: 400 }
      )
    }

    if (candidateIds.length > 500 || !candidateIds.every((id: unknown) => /^\d+$/.test(String(id)))) {
      return NextResponse.json({ error: "Invalid candidateIds" }, { status: 400 })
    }
    const candidateIdsBig = candidateIds.map((id: string) => BigInt(id))
    const adminId = BigInt(user.id)

    if (action === "maybe" || action === "unmaybe") {
      await setMaybeFlag(jobId, candidateIdsBig, action === "maybe", adminId)
    } else {
      await shortlistCandidates(jobId, candidateIdsBig, action, adminId)
    }

    const messages: Record<string, string> = {
      select: "shortlisted",
      reject: "rejected",
      maybe: "marked as maybe",
      unmaybe: "moved back to review",
    }
    return NextResponse.json({
      success: true,
      message: `Candidates ${messages[action]} successfully`
    })
  } catch (error: any) {
    if (error instanceof ShortlistIneligibleError) {
      return NextResponse.json(
        {
          error: error.message,
          ineligibleIds: error.ineligibleIds,
        },
        { status: 400 }
      )
    }

    console.error("Error shortlisting candidates:", error)
    return NextResponse.json(
      { error: error.message || "Failed to shortlist candidates" },
      { status: 500 }
    )
  }
}
