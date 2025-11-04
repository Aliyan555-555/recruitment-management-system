import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notifyAdminNewApplication } from "@/lib/notifications"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const jobId = BigInt(params.id)
    const userId = session.user.id
    const userIdBig = BigInt(userId)
    const now = BigInt(Math.floor(Date.now() / 1000))

    // Check if already applied
    const existing = await prisma.jobsApplied.findUnique({
      where: {
        jobId_userId: {
          jobId,
          userId: userIdBig
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: "You have already applied for this job" },
        { status: 400 }
      )
    }

    // Create application
    const application = await prisma.jobsApplied.create({
      data: {
        jobId,
        userId: userIdBig,
        cvId: BigInt(body.cvId),
        status: "SUBMITTED",
        appliedAt: now
      },
      include: {
        job: {
          select: {
            title: true,
            workflow: {
              include: {
                steps: true
              }
            }
          }
        },
        user: {
          select: {
            firstname: true,
            lastname: true
          }
        },
        cv: {
          select: {
            filename: true
          }
        }
      }
    })

    // Create pipeline if job has a workflow
    if (application.job.workflow && application.job.workflow.steps.length > 0) {
      const workflow = application.job.workflow
      
      // Create pipeline with all workflow steps
      await (prisma as any).candidatePipeline.create({
        data: {
          candidateId: userIdBig,
          jobId,
          applicationId: application.id,
          currentStepOrder: 1,
          overallStatus: "IN_PROGRESS",
          lockState: "NONE",
          startedAt: now,
          steps: {
            create: workflow.steps.map((step) => ({
              workflowStepId: step.id,
              stepOrder: step.stepOrder,
              status: step.stepOrder === 1 ? "PENDING" : "PENDING",
              interviewerId: step.interviewerId,
              startedAt: step.stepOrder === 1 ? now : undefined,
            }))
          }
        }
      })

      // Notify all admins
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true }
      })

      const candidateName = `${application.user.firstname} ${application.user.lastname}`

      await Promise.all(
        admins.map(admin => 
          notifyAdminNewApplication(admin.id, candidateName, application.job.title)
        )
      )
    }

    return NextResponse.json({
      success: true,
      application: {
        id: application.id.toString(),
        status: application.status,
        appliedAt: application.appliedAt.toString()
      }
    })
  } catch (error: any) {
    console.error("Apply error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to submit application" },
      { status: 500 }
    )
  }
}
