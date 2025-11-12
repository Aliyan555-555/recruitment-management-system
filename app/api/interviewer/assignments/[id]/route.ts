import { NextRequest, NextResponse } from "next/server"
import { requireInterviewer } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { InterviewRecommendation } from "@prisma/client"
import { advanceToNextStep, handleStepRejection } from "@/lib/pipeline-helpers"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireInterviewer()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const stepId = BigInt(params.id)
    const interviewerId = BigInt(user.id)

    const step = await prisma.candidatePipelineStep.findFirst({
      where: { id: stepId, interviewerId: interviewerId },
      include: {
        workflowStep: true,
        pipeline: {
          include: {
            job: true,
            candidate: {
              include: {
                educations: {
                  include: {
                    educationLevel: {
                      select: {
                        name: true,
                      }
                    }
                  }
                },
                skills: true,
              },
            },
            interviews: true,
            application: {
              include: {
                cv: {
                  select: {
                    filename: true,
                    filepath: true,
                  }
                }
              }
            }
          },
        },
        interviews: true,
      },
    })

    if (!step) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    const metadata = (step.workflowStep.stepMetadata as any) || {}
    
    return NextResponse.json({
      assignment: {
        id: step.id.toString(),
        status: step.status,
        stepOrder: step.stepOrder,
        feedback: step.feedback,
        workflowStep: {
          id: step.workflowStep.id.toString(),
          stepName: step.workflowStep.stepName,
          stepOrder: step.workflowStep.stepOrder,
          isRequired: step.workflowStep.isRequired,
          isSkippable: step.workflowStep.isSkippable,
          // Step metadata
          stepType: metadata.stepType,
          durationMins: metadata.durationMins,
          interviewMode: metadata.interviewMode,
          meetingLink: metadata.meetingLink,
          interviewerInstructions: metadata.interviewerInstructions,
          evaluationCriteria: metadata.evaluationCriteria || [],
          attachments: metadata.attachments?.filter((att: any) => 
            att.access?.includes("INTERVIEWER")
          ) || [],
        },
        pipeline: {
          id: step.pipeline.id.toString(),
          job: {
            id: step.pipeline.job.id.toString(),
            title: step.pipeline.job.title,
            company: step.pipeline.job.company,
          },
          candidate: {
            id: step.pipeline.candidate.id.toString(),
            name: `${step.pipeline.candidate.firstname} ${step.pipeline.candidate.lastname}`,
            email: step.pipeline.candidate.email,
            phone1: step.pipeline.candidate.phone1,
            phone2: step.pipeline.candidate.phone2,
            institution: step.pipeline.candidate.institution,
            department: step.pipeline.candidate.department,
            address: step.pipeline.candidate.address,
            city: step.pipeline.candidate.city,
            country: step.pipeline.candidate.country,
            educations: step.pipeline.candidate.educations.map((edu: any) => ({
              degreeTitle: edu.degreeTitle,
              institute: edu.institute,
              majorSubject: edu.majorSubject,
              grade: edu.grade,
              passingYear: edu.passingYear,
              country: edu.country,
              educationLevel: edu.educationLevel.name,
            })),
            skills: step.pipeline.candidate.skills.map((skill: any) => ({
              skillName: skill.skillName,
              level: skill.level,
            })),
          },
          application: {
            id: step.pipeline.application?.id.toString(),
            cv: step.pipeline.application?.cv ? {
              filename: step.pipeline.application.cv.filename,
              filepath: step.pipeline.application.cv.filepath,
            } : null,
          },
        },
        interviews: step.interviews.map((iv) => ({
          id: iv.id.toString(),
          feedback: iv.feedback,
          rating: iv.rating,
          recommendation: iv.recommendation,
          submittedAt: iv.submittedAt?.toString(),
        })),
      },
    })
  } catch (error: any) {
    console.error("Interviewer assignment detail error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to load assignment" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireInterviewer()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const stepId = BigInt(params.id)
    const interviewerId = BigInt(user.id)
    const body = await req.json()
    const { action, feedback, rating, recommendation } = body as {
      action: "start" | "submit_feedback" | "complete" | "reject" | "skip"
      feedback?: string
      rating?: number
      recommendation?: InterviewRecommendation
    }

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 })
    }

    const step = await prisma.candidatePipelineStep.findFirst({
      where: { id: stepId, interviewerId: interviewerId },
      include: { pipeline: true },
    })

    if (!step) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    const now = BigInt(Math.floor(Date.now() / 1000))

    let newStatus = step.status
    if (action === "start") newStatus = "IN_PROGRESS"
    if (action === "complete") newStatus = "COMPLETED"
    if (action === "reject") newStatus = "REJECTED"
    if (action === "skip") newStatus = "SKIPPED"

    const updated = await prisma.$transaction(async (tx) => {
      // Record interview feedback if provided
      if (feedback || rating || recommendation) {
        // We need candidateId for interview record
        const pipeline = await tx.candidatePipeline.findUnique({
          where: { id: step.pipelineId },
          select: { id: true, candidateId: true },
        })
        if (pipeline) {
          await tx.interview.create({
            data: {
              pipelineId: pipeline.id,
              pipelineStepId: step.id,
              interviewerId: interviewerId,
              candidateId: pipeline.candidateId,
              feedback: feedback ?? null,
              rating: typeof rating === "number" ? rating : null,
              recommendation: recommendation ?? null,
              submittedAt: now,
            },
          })
        }
      }

      const data: any = { status: newStatus }
      if (action === "start") data.startedAt = now
      if (action === "complete") data.completedAt = now
      if (action === "skip") {
        data.skippedAt = now
        data.skippedBy = interviewerId
      }
      if (typeof feedback === "string") data.feedback = feedback

      return await tx.candidatePipelineStep.update({
        where: { id: step.id },
        data,
      })
    })

    // If step is completed, advance to next step
    if (action === "complete" && updated.status === "COMPLETED") {
      const advanceResult = await advanceToNextStep(
        step.pipelineId,
        step.stepOrder
      )
      
      if (!advanceResult.success && advanceResult.error) {
        console.warn("Failed to advance to next step:", advanceResult.error)
      }
    }

    // If step is rejected, handle rejection
    if (action === "reject" && updated.status === "REJECTED") {
      const rejectionResult = await handleStepRejection(
        step.pipelineId,
        step.stepOrder
      )
      
      if (!rejectionResult.success && rejectionResult.error) {
        console.warn("Failed to handle step rejection:", rejectionResult.error)
      }
    }

    return NextResponse.json({
      success: true,
      step: {
        id: updated.id.toString(),
        status: updated.status,
        feedback: updated.feedback,
        startedAt: updated.startedAt?.toString(),
        completedAt: updated.completedAt?.toString(),
        skippedAt: updated.skippedAt?.toString(),
      },
    })
  } catch (error: any) {
    console.error("Interviewer assignment update error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update assignment" },
      { status: 500 }
    )
  }
}


