import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculatePipelineMetrics } from "@/lib/pipeline-metrics"

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
            company: true,
            workflow: {
              select: {
                steps: {
                  select: {
                    id: true,
                    stepName: true,
                    stepOrder: true
                  },
                  orderBy: {
                    stepOrder: "asc"
                  }
                }
              }
            }
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
                stepOrder: true,
                status: true,
                workflowStep: {
                  select: {
                    stepName: true
                  }
                }
              },
              orderBy: {
                stepOrder: "asc"
              }
            }
          }
        }
      },
      orderBy: {
        appliedAt: "desc"
      }
    })

    return NextResponse.json({
      applications: applications.map(app => {
        const workflowSteps = app.job.workflow?.steps ?? []
        const pipelineSteps = app.pipeline?.steps ?? []
        const metrics = calculatePipelineMetrics({
          totalWorkflowSteps: workflowSteps.length,
          pipelineSteps,
          currentStepOrder: app.pipeline?.currentStepOrder,
          overallStatus: app.pipeline?.overallStatus,
        })

        return {
          id: app.id.toString(),
          jobTitle: app.job.title,
          jobCompany: app.job.company,
          appliedAt: Number(app.appliedAt) * 1000,
          status: app.status,
          pipeline: app.pipeline
            ? {
                id: app.pipeline.id.toString(),
                currentStep: metrics.currentStep,
                totalSteps: metrics.totalSteps,
                completedSteps: metrics.completedSteps,
                progressPercent: metrics.progressPercent,
                overallStatus: app.pipeline.overallStatus,
                lockState: (app.pipeline as any).lockState || "NONE",
                steps: pipelineSteps.map(step => ({
                  stepName: step.workflowStep?.stepName ?? `Step ${step.stepOrder}`,
                  stepOrder: step.stepOrder,
                  status: step.status
                }))
              }
            : null
        }
      })
    })
  } catch (error: any) {
    console.error("Error fetching applications:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch applications" },
      { status: 500 }
    )
  }
}

