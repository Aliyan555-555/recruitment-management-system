import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)

    const applications = await prisma.jobsApplied.findMany({
      where: {
        userId
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true
          }
        },
        pipeline: {
          select: {
            id: true,
            currentStepOrder: true,
            overallStatus: true,
            lockState: true,
            steps: {
              select: {
                // stepName: true,
                stepOrder: true,
                status: true
              },
              orderBy: {
                stepOrder: 'asc'
              }
            },
            _count: {
              select: {
                steps: true
              }
            }
          }
        }
      },
      orderBy: {
        appliedAt: 'desc'
      }
    })

    return NextResponse.json({
      applications: applications.map(app => ({
        id: app.id.toString(),
        jobTitle: app.job.title,
        jobCompany: app.job.company,
        appliedAt: app.appliedAt.toString(),
        status: app.status,
        pipeline: app.pipeline ? {
          id: app.pipeline.id.toString(),
          currentStep: app.pipeline.currentStepOrder,
          totalSteps: app.pipeline._count.steps,
          overallStatus: app.pipeline.overallStatus,
          lockState: (app.pipeline as any).lockState || 'NONE',
          steps: app.pipeline.steps
        } : null
      }))
    })
  } catch (error: any) {
    console.error("Error fetching applications:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch applications" },
      { status: 500 }
    )
  }
}

