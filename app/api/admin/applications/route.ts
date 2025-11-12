import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { calculatePipelineMetrics } from "@/lib/pipeline-metrics"

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const jobId = searchParams.get("jobId")

    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (jobId) {
      where.jobId = BigInt(jobId)
    }

    const applications = await prisma.jobsApplied.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true
          }
        },
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            workflow: {
              select: {
                steps: {
                  select: {
                    id: true
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
            steps: {
              select: {
                status: true,
                stepOrder: true
              },
              orderBy: {
                stepOrder: 'asc'
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
      applications: applications.map(app => {
        const pipelineSteps = app.pipeline?.steps ?? []
        const totalWorkflowSteps = app.job.workflow?.steps.length ?? 0
        const metrics = calculatePipelineMetrics({
          totalWorkflowSteps,
          pipelineSteps,
          currentStepOrder: app.pipeline?.currentStepOrder,
          overallStatus: app.pipeline?.overallStatus,
        })

        return {
          id: app.id.toString(),
          candidateName: `${app.user.firstname} ${app.user.lastname}`,
          candidateEmail: app.user.email,
          jobTitle: app.job.title,
          jobCompany: app.job.company,
          status: app.status,
          appliedAt: app.appliedAt.toString(),
          pipeline: app.pipeline ? {
            id: app.pipeline.id.toString(),
            currentStep: metrics.currentStep,
            totalSteps: metrics.totalSteps,
            completedSteps: metrics.completedSteps,
            progressPercent: metrics.progressPercent,
            overallStatus: app.pipeline.overallStatus
          } : null
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

