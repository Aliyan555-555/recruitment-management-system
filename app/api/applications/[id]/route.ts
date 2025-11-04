import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
            description: true
          }
        },
        steps: {
          include: {
            workflowStep: {
              select: {
                stepName: true,
                isRequired: true,
                isSkippable: true,
                stepMetadata: true // Include all step metadata
              }
            },
            interviews: {
              select: {
                rating: true,
                recommendation: true,
                submittedAt: true
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

    return NextResponse.json({
      pipeline: {
        id: pipeline.id.toString(),
        applicationId: pipeline.applicationId.toString(),
        candidate: {
          name: `${pipeline.candidate.firstname} ${pipeline.candidate.lastname}`,
          email: pipeline.candidate.email
        },
        job: {
          title: pipeline.job.title,
          company: pipeline.job.company,
          description: pipeline.job.description
        },
        status: pipeline.overallStatus,
        lockState: (pipeline as any).lockState || 'NONE',
        currentStep: pipeline.currentStepOrder,
        startedAt: pipeline.startedAt.toString(),
        completedAt: pipeline.completedAt?.toString(),
        steps: pipeline.steps.map(step => {
          const metadata = (step.workflowStep.stepMetadata as any) || {}
          return {
            id: step.id.toString(),
            stepName: step.workflowStep.stepName,
            stepOrder: step.stepOrder,
            status: step.status,
            isRequired: step.workflowStep.isRequired,
            isSkippable: step.workflowStep.isSkippable,
            feedback: step.feedback,
            startedAt: step.startedAt?.toString(),
            completedAt: step.completedAt?.toString(),
            // Step metadata
            stepType: metadata.stepType,
            durationMins: metadata.durationMins,
            deadline: metadata.deadline,
            interviewMode: metadata.interviewMode,
            meetingLink: metadata.meetingLink,
            candidateInstructions: metadata.candidateInstructions,
            attachments: metadata.attachments?.filter((att: any) => 
              att.access?.includes("CANDIDATE")
            ) || [],
            interviews: step.interviews.map(interview => ({
              rating: interview.rating,
              recommendation: interview.recommendation,
              submittedAt: interview.submittedAt?.toString()
            }))
          }
        })
      }
    })
  } catch (error: any) {
    console.error("Error fetching pipeline:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch pipeline" },
      { status: 500 }
    )
  }
}

