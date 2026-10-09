import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculatePipelineMetrics } from "@/lib/pipeline-metrics"
import { readStepConfig } from "@/lib/workflow/step-config"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const pipelineId = BigInt(params.id)
    const userId = BigInt(session.user.id)

    const pipeline = await prisma.candidatePipeline.findFirst({
      where: {
        id: pipelineId,
        candidateId: userId // Ensure user can only see their own pipeline
      },
      include: {
        candidate: {
          select: {
            firstname: true,
            lastname: true,
            email: true
          }
        },
        job: {
          select: {
            title: true,
            company: true,
            description: true,
            workflow: {
              select: {
                steps: {
                  orderBy: { stepOrder: 'asc' },
                  select: {
                    id: true,
                    stepName: true,
                    stepOrder: true,
                    isRequired: true,
                    isSkippable: true,
                    interviewMode: true,
                    durationMins: true,
                    panelSize: true,
                    bufferMins: true,
                    capacityPerSlot: true,
                    stepType: true,
                    stepMetadata: true
                  }
                }
              }
            }
          }
        },
        steps: {
          include: {
            interviews: {
              select: {
                rating: true,
                recommendation: true,
                submittedAt: true
              }
            },
            lois: {
              select: {
                id: true,
                status: true,
                sentAt: true
              }
            },
            offerLetters: {
              select: {
                id: true,
                status: true,
                sentAt: true
              }
            }
          },
          orderBy: {
            stepOrder: 'asc'
          }
        }
      }
    })

    if (!pipeline) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 }
      )
    }

    const workflowSteps = pipeline.job.workflow?.steps ?? []

    // Meeting links / locations are only revealed once the candidate holds an active booking for that step.
    const activeBookings = await prisma.slotBooking.findMany({
      where: { applicationId: pipeline.applicationId, status: "RESERVED" },
      select: {
        id: true,
        slot: { select: { id: true, stepId: true, startsAt: true, endsAt: true, mode: true, meetingLink: true, location: true } },
      },
    })
    const bookingByStep = new Map(activeBookings.map((b) => [b.slot.stepId.toString(), b]))

    const steps = workflowSteps.map((workflowStep) => {
      const pipelineStep = pipeline.steps.find(
        (step) => step.workflowStepId === workflowStep.id
      )
      const metadata = (workflowStep.stepMetadata as any) || {}
      const cfg = readStepConfig(workflowStep)
      const booking = bookingByStep.get(workflowStep.id.toString())

      return {
        id: pipelineStep ? pipelineStep.id.toString() : `workflow-${workflowStep.id.toString()}`,
        stepName: workflowStep.stepName,
        stepOrder: workflowStep.stepOrder,
        status: pipelineStep ? pipelineStep.status : "PENDING",
        isRequired: workflowStep.isRequired,
        isSkippable: workflowStep.isSkippable,
        feedback: pipelineStep?.feedback ?? null,
        startedAt: pipelineStep?.startedAt?.toString(),
        completedAt: pipelineStep?.completedAt?.toString(),
        stepType: cfg.stepType,
        isInterview: cfg.isInterview,
        durationMins: cfg.isInterview ? cfg.durationMins : undefined,
        interviewMode: cfg.isInterview ? cfg.interviewMode : undefined,
        booking: booking
          ? {
              id: booking.id.toString(),
              slotId: booking.slot.id.toString(),
              startsAt: booking.slot.startsAt.toISOString(),
              endsAt: booking.slot.endsAt.toISOString(),
              mode: booking.slot.mode ?? cfg.interviewMode,
              meetingLink: booking.slot.meetingLink ?? cfg.meetingLink,
              location: booking.slot.location ?? cfg.location,
            }
          : null,
        candidateInstructions: cfg.candidateInstructions ?? undefined,
        attachments: metadata.attachments?.filter((att: any) => att.access?.includes("CANDIDATE")) || [],
        interviews: pipelineStep
          ? pipelineStep.interviews.map((interview) => ({
              rating: interview.rating,
              recommendation: interview.recommendation,
              submittedAt: interview.submittedAt?.toString(),
            }))
          : [],
        lois: pipelineStep?.lois?.map((loi: any) => ({
          id: loi.id.toString(),
          status: loi.status,
          sentAt: loi.sentAt?.toString()
        })) || [],
        offerLetters: pipelineStep?.offerLetters?.map((offer: any) => ({
          id: offer.id.toString(),
          status: offer.status,
          sentAt: offer.sentAt?.toString()
        })) || []
      }
    })

    const metrics = calculatePipelineMetrics({
      totalWorkflowSteps: workflowSteps.length,
      pipelineSteps: pipeline.steps,
      currentStepOrder: pipeline.currentStepOrder,
      overallStatus: pipeline.overallStatus,
    })

    return NextResponse.json({
      pipeline: {
        id: pipeline.id.toString(),
        applicationId: pipeline.applicationId.toString(),
        candidate: {
          name: `${pipeline.candidate.firstname} ${pipeline.candidate.lastname}`,
          email: pipeline.candidate.email,
        },
        job: {
          title: pipeline.job.title,
          company: pipeline.job.company,
          description: pipeline.job.description,
        },
        status: pipeline.overallStatus,
        lockState: (pipeline as any).lockState || "NONE",
        currentStep: metrics.currentStep,
        startedAt: pipeline.startedAt.toString(),
        completedAt: pipeline.completedAt?.toString(),
        totalSteps: metrics.totalSteps || steps.length,
        completedSteps: metrics.completedSteps,
        progressPercent: metrics.progressPercent,
        steps,
      },
    })
  } catch (error: any) {
    console.error("Error fetching pipeline:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch pipeline" },
      { status: 500 }
    )
  }
}

