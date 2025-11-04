import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

export async function GET(
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

    const pipelineId = BigInt(params.id)

    const pipeline = await prisma.candidatePipeline.findUnique({
      where: { id: pipelineId },
      include: {
        candidate: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            phone1: true,
            city: true,
            country: true
          }
        },
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            description: true
          }
        },
        application: {
          select: {
            id: true,
            status: true,
            appliedAt: true,
            cv: {
              select: {
                id: true,
                filename: true,
                filepath: true
              }
            }
          }
        },
        steps: {
          include: {
            workflowStep: {
              select: {
                stepName: true,
                stepOrder: true,
                isRequired: true,
                isSkippable: true
              }
            },
            interviewer: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true
              }
            },
            interviews: {
              include: {
                interviewer: {
                  select: {
                    firstname: true,
                    lastname: true
                  }
                }
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
        candidate: {
          name: `${pipeline.candidate.firstname} ${pipeline.candidate.lastname}`,
          email: pipeline.candidate.email,
          phone: pipeline.candidate.phone1,
          location: `${pipeline.candidate.city || ''}, ${pipeline.candidate.country || ''}`.trim()
        },
        job: {
          title: pipeline.job.title,
          company: pipeline.job.company,
          description: pipeline.job.description
        },
        application: {
          status: pipeline.application.status,
          appliedAt: pipeline.application.appliedAt.toString(),
          cv: {
            id: pipeline.application.cv.id.toString(),
            filename: pipeline.application.cv.filename,
            filepath: pipeline.application.cv.filepath
          }
        },
        status: pipeline.overallStatus,
        lockState: (pipeline as any).lockState || 'NONE',
        currentStep: pipeline.currentStepOrder,
        startedAt: pipeline.startedAt.toString(),
        completedAt: pipeline.completedAt?.toString(),
        steps: pipeline.steps.map(s => ({
          id: s.id.toString(),
          stepName: s.workflowStep.stepName,
          stepOrder: s.stepOrder,
          status: s.status,
          isRequired: s.workflowStep.isRequired,
          isSkippable: s.workflowStep.isSkippable,
          interviewer: s.interviewer ? {
            name: `${s.interviewer.firstname} ${s.interviewer.lastname}`,
            email: s.interviewer.email
          } : null,
          feedback: s.feedback,
          startedAt: s.startedAt?.toString(),
          completedAt: s.completedAt?.toString(),
          interviews: s.interviews.map(i => ({
            interviewerName: `${i.interviewer.firstname} ${i.interviewer.lastname}`,
            feedback: i.feedback,
            rating: i.rating,
            recommendation: i.recommendation,
            submittedAt: i.submittedAt?.toString()
          }))
        }))
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

    const pipelineId = BigInt(params.id)
    const body = await req.json()
    const now = BigInt(Math.floor(Date.now() / 1000))

    const updateData: any = {
      updatedAt: now
    }

    if (body.status) {
      updateData.overallStatus = body.status
      if (body.status === 'COMPLETED' || body.status === 'REJECTED') {
        updateData.completedAt = now
      }
    }

    const pipeline = await prisma.candidatePipeline.update({
      where: { id: pipelineId },
      data: updateData,
      select: {
        id: true,
        overallStatus: true
      }
    })

    return NextResponse.json({
      success: true,
      pipeline: {
        id: pipeline.id.toString(),
        status: pipeline.overallStatus
      }
    })
  } catch (error: any) {
    console.error("Error updating pipeline:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update pipeline" },
      { status: 500 }
    )
  }
}

