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
                experiences: {
                  orderBy: {
                    createdAt: 'desc'
                  }
                },
                educations: {
                  include: {
                    educationLevel: {
                      select: {
                        name: true,
                      }
                    }
                  },
                  orderBy: {
                    createdAt: 'desc'
                  }
                },
                skills: {
                  orderBy: {
                    createdAt: 'desc'
                  }
                },
                profileDetails: true,
                jobPreference: true,
              },
            },
            interviews: true,
            application: {
              select: {
                id: true,
                status: true,
                appliedAt: true,
              }
            }
          },
        },
        interviews: true,
        stageEvaluations: {
          where: { interviewerId: interviewerId } // Only get my specific evaluation
        }
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
          evaluationSchema: step.workflowStep.evaluationSchema, // Pass schema to frontend
          attachments: metadata.attachments?.filter((att: any) => 
            att.access?.includes("INTERVIEWER")
          ) || [],
        },
        focusGroupEvaluations: step.stageEvaluations?.[0]?.formData || null,
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
            experiences: step.pipeline.candidate.experiences.map((exp: any) => ({
              id: exp.id.toString(),
              jobTitle: exp.jobTitle,
              company: exp.company,
              location: exp.location,
              startDate: exp.startDate,
              endDate: exp.endDate,
              isCurrent: exp.isCurrent,
            })),
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
            profileDetails: step.pipeline.candidate.profileDetails ? {
              title: step.pipeline.candidate.profileDetails.title,
              dateOfBirth: step.pipeline.candidate.profileDetails.dateOfBirth,
              gender: step.pipeline.candidate.profileDetails.gender,
              nationality: step.pipeline.candidate.profileDetails.nationality,
              cnic: step.pipeline.candidate.profileDetails.cnic,
              maritalStatus: step.pipeline.candidate.profileDetails.maritalStatus,
              professionalGrade: step.pipeline.candidate.profileDetails.professionalGrade,
              linkedinUrl: step.pipeline.candidate.profileDetails.linkedinUrl,
              portfolioUrl: step.pipeline.candidate.profileDetails.portfolioUrl,
              githubUrl: step.pipeline.candidate.profileDetails.githubUrl,
              websiteUrl: step.pipeline.candidate.profileDetails.websiteUrl,
              bio: step.pipeline.candidate.profileDetails.bio,
              expectedSalary: step.pipeline.candidate.profileDetails.expectedSalary,
              noticePeriod: step.pipeline.candidate.profileDetails.noticePeriod,
              availability: step.pipeline.candidate.profileDetails.availability,
              certifications: step.pipeline.candidate.profileDetails.certifications,
              languages: step.pipeline.candidate.profileDetails.languages,
            } : null,
            jobPreference: step.pipeline.candidate.jobPreference ? {
              firstPriority: step.pipeline.candidate.jobPreference.firstPriority,
              secondPriority: step.pipeline.candidate.jobPreference.secondPriority,
              thirdPriority: step.pipeline.candidate.jobPreference.thirdPriority,
              summary: step.pipeline.candidate.jobPreference.summary,
            } : null,
          },
          application: {
            id: step.pipeline.application?.id.toString(),
          profile: {
            name: `${step.pipeline.candidate.firstname} ${step.pipeline.candidate.lastname}`,
            email: step.pipeline.candidate.email,
          },
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
    const { action, feedback, rating, recommendation, focusGroupEvaluations } = body as {
      action: "start" | "submit_feedback" | "complete" | "reject" | "skip"
      feedback?: string
      rating?: number
      recommendation?: InterviewRecommendation
      focusGroupEvaluations?: any // Json
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

      // Handle Focus Group Evaluations (StageEvaluation)
      if (focusGroupEvaluations) {
        // Check if a StageEvaluation already exists
        const existingEval = await tx.stageEvaluation.findUnique({
           where: {
             pipelineStepId_interviewerId: {
               pipelineStepId: step.id,
               interviewerId: interviewerId
             }
           }
        })

        if (existingEval) {
          await tx.stageEvaluation.update({
             where: { id: existingEval.id },
             data: {
               formData: focusGroupEvaluations,
               submittedAt: now
             }
          })
        } else {
          await tx.stageEvaluation.create({
            data: {
              pipelineStepId: step.id,
              interviewerId: interviewerId,
              formData: focusGroupEvaluations,
              submittedAt: now
            }
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



