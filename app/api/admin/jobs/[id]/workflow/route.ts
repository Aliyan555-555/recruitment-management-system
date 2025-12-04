import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/admin/jobs/[id]/workflow - Get job workflow with round statistics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get job with workflow
    const job = await prisma.job.findUnique({
      where: { id: BigInt(params.id) },
      include: {
        workflow: {
          include: {
            workflowSteps: {
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

    // Calculate statistics for each round
    const roundsWithStats = job.workflow.workflowSteps.map(step => {
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

    return NextResponse.json({
      workflow: {
        id: job.workflow.id.toString(),
        jobId: job.id.toString(),
        rounds: roundsWithStats
      }
    })
  } catch (error) {
    console.error("Error fetching workflow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
