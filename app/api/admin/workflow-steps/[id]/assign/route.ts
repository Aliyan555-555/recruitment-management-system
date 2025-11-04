import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { notifyInterviewerAssignment } from "@/lib/notifications"

export async function PUT(
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

    const { interviewerId } = await req.json()
    const stepId = BigInt(params.id)
    const adminId = BigInt(user.id)
    const now = BigInt(Math.floor(Date.now() / 1000))

    // Get the workflow step
    const step = await prisma.workflowStep.findUnique({
      where: { id: stepId },
      include: {
        workflow: {
          include: {
            job: {
              select: {
                title: true
              }
            }
          }
        }
      }
    })

    if (!step) {
      return NextResponse.json(
        { error: "Workflow step not found" },
        { status: 404 }
      )
    }

    // Update the step
    const updatedStep = await prisma.workflowStep.update({
      where: { id: stepId },
      data: {
        interviewerId: interviewerId ? BigInt(interviewerId) : null,
        updatedAt: now
      },
      include: {
        interviewer: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true
          }
        }
      }
    })

    // If interviewer assigned, notify them
    if (interviewerId) {
      const interviewer = await prisma.user.findUnique({
        where: { id: BigInt(interviewerId) },
        select: { firstname: true, lastname: true }
      })

      if (interviewer) {
        await notifyInterviewerAssignment(
          BigInt(interviewerId),
          "New Candidates",
          step.stepName,
          step.workflow.job.title
        )
      }
    }

    return NextResponse.json({
      success: true,
      step: {
        id: updatedStep.id.toString(),
        stepName: updatedStep.stepName,
        interviewer: updatedStep.interviewer
      }
    })
  } catch (error: any) {
    console.error("Error assigning interviewer:", error)
    return NextResponse.json(
      { error: error.message || "Failed to assign interviewer" },
      { status: 500 }
    )
  }
}

