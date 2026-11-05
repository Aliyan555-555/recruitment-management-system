import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculatePipelineMetrics } from "@/lib/pipeline-metrics"
import { readStepConfig } from "@/lib/workflow/step-config"
import { candidateRoundName, filterStepsForCandidate, isCandidateShortlisted } from "@/lib/workflow/candidate-visibility"

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
                    stepOrder: true,
                    isRequired: true,
                    stepType: true,
                    stepMetadata: true
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
                workflowStepId: true,
                workflowStep: {
                  select: {
                    stepName: true,
                    stepType: true,
                    isRequired: true,
                    stepMetadata: true
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

    // Fetch batch information for applications with batchId
    const batchIds = applications
      .filter(app => app.batchId)
      .map(app => app.batchId!)
      .filter((id, index, self) => self.indexOf(id) === index) // unique

    const batches = batchIds.length > 0
      ? await Promise.all(
          batchIds.map(async (id) => {
            const batch = await (prisma as any).batch.findUnique({
              where: { id },
              select: { id: true, status: true, batchNumber: true, batchName: true }
            })
            return batch ? { id: id.toString(), ...batch } : null
          })
        )
      : []

    const batchMap = new Map(batches.filter(b => b).map(b => [b!.id, b]))

    const bookedApplicationIds = new Set(
      (
        await prisma.slotBooking.findMany({
          where: { candidateId: userId, status: { in: ["RESERVED", "COMPLETED"] } },
          select: { applicationId: true },
        })
      ).map(booking => booking.applicationId.toString())
    )

    return NextResponse.json({
      applications: applications.map(app => {
        const allWorkflowSteps = app.job.workflow?.steps ?? []
        const allPipelineSteps = app.pipeline?.steps ?? []

        // No rounds are shown until the candidate is shortlisted; afterwards all, some under a hidden name.
        const shortlisted = isCandidateShortlisted({
          applicationStatus: app.status,
          pipelineSteps: allPipelineSteps.map(step => ({ status: step.status, stepOrder: step.stepOrder })),
          hasBooking: bookedApplicationIds.has(app.id.toString()),
        })
        const workflowSteps = filterStepsForCandidate(allWorkflowSteps, shortlisted)
        const pipelineSteps = shortlisted ? allPipelineSteps : []

        const metrics = calculatePipelineMetrics({
          totalWorkflowSteps: workflowSteps.length,
          pipelineSteps,
          currentStepOrder: app.pipeline?.currentStepOrder,
          overallStatus: app.pipeline?.overallStatus,
        })

        const batchInfo = app.batchId ? batchMap.get(app.batchId.toString()) : null

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
                shortlisted,
                lockState: (app.pipeline as any).lockState || "NONE",
                pipelineMode: (app.pipeline as any).pipelineMode || "INDIVIDUAL",
                steps: pipelineSteps.map(step => ({
                  stepName: step.workflowStep
                    ? candidateRoundName({ stepName: step.workflowStep.stepName, showName: readStepConfig(step.workflowStep).showName })
                    : `Step ${step.stepOrder}`,
                  stepOrder: step.stepOrder,
                  status: step.status
                }))
              }
            : null,
          batchId: app.batchId?.toString() || null,
          batchInfo: batchInfo ? {
            batchNumber: batchInfo.batchNumber,
            batchName: batchInfo.batchName,
            status: batchInfo.status
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

