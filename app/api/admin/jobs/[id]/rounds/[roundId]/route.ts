import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/rbac"

// GET /api/admin/jobs/[id]/rounds/[roundId] - Get round details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string } }
) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
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

    // Get next workflow step (if any) for navigation
    const nextStep = await prisma.workflowStep.findFirst({
      where: {
        workflowId: workflowStep.workflowId,
        stepOrder: { gt: workflowStep.stepOrder }
      },
      orderBy: { stepOrder: "asc" },
      select: { id: true, stepName: true, stepOrder: true }
    })

    return NextResponse.json({
      workflowStep: {
        id: workflowStep.id.toString(),
        stepName: workflowStep.stepName,
        stepType: workflowStep.stepType,
        stepOrder: workflowStep.stepOrder,
        job: {
          id: workflowStep.workflow.job.id.toString(),
          title: workflowStep.workflow.job.title,
          jobCode: workflowStep.workflow.job.jobCode
        },
        nextStep: nextStep ? {
          id: nextStep.id.toString(),
          stepName: nextStep.stepName,
          stepOrder: nextStep.stepOrder
        } : null
      }
    })
  } catch (error) {
    console.error("Error fetching round:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
