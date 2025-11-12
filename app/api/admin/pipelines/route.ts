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
      where.overallStatus = status
    }
    
    if (jobId) {
      where.jobId = BigInt(jobId)
    }

    const pipelines = await prisma.candidatePipeline.findMany({
      where,
      include: {
        candidate: {
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
        application: {
          select: {
            id: true,
            status: true,
            appliedAt: true
          }
        },
        steps: {
          select: {
            status: true,
            stepOrder: true
          },
          orderBy: {
            stepOrder: 'asc'
          }
        }
      },
      orderBy: {
        startedAt: 'desc'
      }
    })

    return NextResponse.json({
      pipelines: pipelines.map(p => {
        const pipelineSteps = p.steps ?? []
        const totalWorkflowSteps = p.job.workflow?.steps.length ?? 0
        const metrics = calculatePipelineMetrics({
          totalWorkflowSteps,
          pipelineSteps,
          currentStepOrder: p.currentStepOrder,
          overallStatus: p.overallStatus,
        })

        return {
          id: p.id.toString(),
          candidateName: `${p.candidate.firstname} ${p.candidate.lastname}`,
          candidateEmail: p.candidate.email,
          jobTitle: p.job.title,
          jobCompany: p.job.company,
          status: p.overallStatus,
          currentStep: metrics.currentStep,
          totalSteps: metrics.totalSteps,
          completedSteps: metrics.completedSteps,
          progressPercent: metrics.progressPercent,
          startedAt: p.startedAt.toString()
        }
      })
    })
  } catch (error: any) {
    console.error("Error fetching pipelines:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch pipelines" },
      { status: 500 }
    )
  }
}

