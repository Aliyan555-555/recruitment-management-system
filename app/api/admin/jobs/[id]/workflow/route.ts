import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/rbac"

// GET /api/admin/jobs/[id]/workflow - Get job workflow with round statistics
export async function GET(
  request: NextRequest,
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

    // Get job with workflow
    const job = await prisma.job.findUnique({
      where: { id: BigInt(params.id) },
      select: {
        id: true,
        title: true,
        workflow: {
          include: {
            steps: {
              orderBy: { stepOrder: 'asc' },
              include: {
                pipelineSteps: {
                  include: {
                    pipeline: {
                      select: {
                        candidateId: true,
                        overallStatus: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!job || !job.workflow) {
      return NextResponse.json({ error: "Job or workflow not found" }, { status: 404 })
    }

    const applicationCounts = await prisma.jobsApplied.groupBy({
      by: ["status"],
      where: { jobId: job.id },
      _count: true,
    })

    const appCountFor = (...statuses: string[]) =>
      applicationCounts
        .filter((g) => statuses.includes(g.status))
        .reduce((sum, g) => sum + g._count, 0)

    const needsReview = appCountFor("APPLIED", "SUBMITTED")
    const shortlistedApps = appCountFor("SHORTLISTED", "BATCH_ASSIGNED")
    const rejectedApps = appCountFor("REMOVED")

    // Calculate statistics for each round
    const roundsWithStats = job.workflow.steps.map(step => {
      const allCandidates = step.pipelineSteps

      return {
        id: step.id.toString(),
        stepName: step.stepName,
        stepType: step.stepType || "SCREENING_INTERVIEW",
        stepOrder: step.stepOrder,
        statistics: {
          total: allCandidates.length,
          pending: allCandidates.filter(ps => ps.status === "PENDING").length,
     completed: allCandidates.filter(ps => ps.status === "COMPLETED").length,
          inProgress: allCandidates.filter(ps => ps.status === "IN_PROGRESS").length,
          rejected: allCandidates.filter(ps => ps.status === "REJECTED").length,
        }
      }
    })

    const [quickTestConfig, quickTestStarted] = await Promise.all([
      prisma.jobQuickTest.findUnique({ where: { jobId: job.id }, select: { isEnabled: true } }),
      prisma.quickTestAttempt.count({ where: { jobId: job.id } }),
    ])

    return NextResponse.json({
      workflow: {
        id: job.workflow.id.toString(),
        jobId: job.id.toString(),
        jobTitle: job.title,
        shortlistCounts: {
          needsReview,
          shortlisted: shortlistedApps,
          rejected: rejectedApps,
          total: needsReview + shortlistedApps + rejectedApps,
        },
        quickTest: {
          enabled: quickTestConfig?.isEnabled ?? false,
          started: quickTestStarted,
        },
        rounds: roundsWithStats
      }
    })
  } catch (error) {
    console.error("Error fetching workflow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
