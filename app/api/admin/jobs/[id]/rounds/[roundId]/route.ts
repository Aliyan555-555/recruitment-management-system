import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/admin/jobs/[id]/rounds/[roundId] - Get round details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workflowStep = await prisma.workflowStep.findUnique({
      where: { id: BigInt(params.roundId) },
      include: {
        workflow: {
          include: {
            job: {
              select: {
                id: true,
                title: true,
                jobCode: true,
              }
            }
          }
        }
      }
    })

    if (!workflowStep) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 })
    }

    // Verify the round belongs to the specified job
    if (workflowStep.workflow.jobId.toString() !== params.id) {
      return NextResponse.json({ error: "Round does not belong to this job" }, { status: 400 })
    }

    return NextResponse.json({
      workflowStep: {
        id: workflowStep.id.toString(),
        stepName: workflowStep.stepName,
        stepType: workflowStep.stepType,
        stepOrder: workflowStep.stepOrder,
        job: workflowStep.workflow.job
      }
    })
  } catch (error) {
    console.error("Error fetching round:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
