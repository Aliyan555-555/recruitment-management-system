import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireStaff } from "@/lib/rbac"

// GET /api/admin/jobs/[id]/rounds/[roundId]/candidates/[candidateId]/assessment - Get existing assessment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string; candidateId: string } }
) {
  try {
    const user = await requireStaff()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin or Interviewer access required" },
        { status: 401 }
      )
    }

    // Find pipeline step for this candidate and round
    const pipelineStep = await prisma.candidatePipelineStep.findFirst({
      where: {
        workflowStepId: BigInt(params.roundId),
        pipeline: {
          candidateId: BigInt(params.candidateId),
          jobId: BigInt(params.id)
        }
      },
      include: {
        pipeline: {
          include: {
            candidate: {
              include: {
                profileDetails: true,
                educations: {
                  include: {
                    educationLevel: true
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 1
                },
                experiences: {
                  orderBy: { createdAt: 'desc' },
                  take: 1
                },
                jobPreference: true
              }
            },
            job: {
              select: {
                id: true,
                title: true,
                company: true
              }
            },
            application: {
              select: {
                appliedAt: true
              }
            }
          }
        },
        workflowStep: {
          select: {
            stepName: true,
            stepMetadata: true
          }
        },
        stageEvaluations: {
          include: {
            interviewer: {
              select: {
                firstname: true,
                lastname: true,
              }
            }
          }
        }
      }
    })

    if (!pipelineStep) {
      return NextResponse.json({ error: "Pipeline step not found" }, { status: 404 })
    }

    const evaluation = pipelineStep.stageEvaluations[0]
    const candidate = pipelineStep.pipeline.candidate
    const latestEducation = candidate.educations[0]
    const latestExperience = candidate.experiences[0]

    // Extract interviewer IDs from step metadata
    const stepMetadata = pipelineStep.workflowStep.stepMetadata as any
    const stepInterviewerIds = stepMetadata?.interviewerIds || []

    return NextResponse.json({
      candidate: {
        id: candidate.id.toString(),
        name: `${candidate.firstname} ${candidate.lastname}`,
        email: candidate.email,
        phone: candidate.phone1,
        education: latestEducation ? 
          `${latestEducation.educationLevel.name} - ${latestEducation.degreeTitle}` : "-",
        institution: latestEducation?.institute || "-",
        lastEmployer: latestExperience?.company || "-",
        lastAssignment: latestExperience?.jobTitle || "-",
        totalExperience: latestExperience ? 
          `${latestExperience.startDate} - ${latestExperience.endDate || "Present"}` : "-",
        currentSalary: candidate.profileDetails?.expectedSalary || "-",
        liability: candidate.profileDetails?.noticePeriod || "-",
        relatives: candidate.profileDetails?.references || "-",
        remarks: "-"
      },
      job: {
        id: pipelineStep.pipeline.job.id.toString(),
        title: pipelineStep.pipeline.job.title,
        company: pipelineStep.pipeline.job.company
      },
      stepName: pipelineStep.workflowStep.stepName,
      stepInterviewerIds: stepInterviewerIds,
      formData: evaluation?.formData || null,
      submittedAt: evaluation?.submittedAt,
      interviewer: evaluation?.interviewer ? 
        `${evaluation.interviewer.firstname} ${evaluation.interviewer.lastname}` : null
    })
  } catch (error) {
    console.error("Error fetching assessment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/jobs/[id]/rounds/[roundId]/candidates/[candidateId]/assessment - Submit assessment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string; candidateId: string } }
) {
  try {
    const user = await requireStaff()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin or Interviewer access required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { formData } = body

    if (!formData) {
      return NextResponse.json({ error: "Form data is required" }, { status: 400 })
    }

    // Find pipeline step
    const pipelineStep = await prisma.candidatePipelineStep.findFirst({
      where: {
        workflowStepId: BigInt(params.roundId),
        pipeline: {
          candidateId: BigInt(params.candidateId),
          jobId: BigInt(params.id)
        }
      }
    })

    if (!pipelineStep) {
      return NextResponse.json({ error: "Pipeline step not found" }, { status: 404 })
    }

    // Calculate score based on skill ratings
    let totalScore = 0
    let maxScore = 0
    
    if (formData.skills) {
      // Calculate score from skill ratings
      Object.keys(formData.skills).forEach((skillKey) => {
        const skill = formData.skills[skillKey]
        const rating = skill.rating || 0
        const max = skill.max || 10
        totalScore += rating
        maxScore += max
      })
    }
    
    // Calculate percentage
    const scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
    
    // Determine recommendation based on score and form data
    const recommendedToHire = formData.recommendedToHire === "Recommended" || formData.recommendedToHire === "yes"
    const recommendation = recommendedToHire ? "HIRE" : "NO_HIRE"

    // Create or update stage evaluation
    const evaluation = await prisma.stageEvaluation.upsert({
      where: {
        pipelineStepId_interviewerId: {
          pipelineStepId: pipelineStep.id,
          interviewerId: BigInt(user.id)
        }
      },
      create: {
        pipelineStepId: pipelineStep.id,
        interviewerId: BigInt(user.id),
        formData: formData,
        score: totalScore,
        recommendation: recommendation,
        submittedAt: BigInt(Math.floor(Date.now() / 1000))
      },
      update: {
        formData: formData,
        score: totalScore,
        recommendation: recommendation,
        submittedAt: BigInt(Math.floor(Date.now() / 1000))
      }
    })

    // Update pipeline step status to COMPLETED
    await prisma.candidatePipelineStep.update({
      where: { id: pipelineStep.id },
      data: {
        status: recommendedToHire ? "COMPLETED" : "REJECTED",
        completedAt: BigInt(Math.floor(Date.now() / 1000))
      }
    })

    return NextResponse.json({ success: true, evaluation: {
      id: evaluation.id.toString(),
      score: totalScore,
      scorePercentage,
      maxScore,
      recommendation
    }})
  } catch (error) {
    console.error("Error submitting assessment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

//PUT /api/admin/jobs/[id]/rounds/[roundId]/candidates/[candidateId]/assessment - Save draft
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string; candidateId: string } }
) {
  try {
    const user = await requireStaff()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin or Interviewer access required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { formData } = body

    // Find pipeline step
    const pipelineStep = await prisma.candidatePipelineStep.findFirst({
      where: {
        workflowStepId: BigInt(params.roundId),
        pipeline: {
          candidateId: BigInt(params.candidateId),
          jobId: BigInt(params.id)
        }
      }
    })

    if (!pipelineStep) {
      return NextResponse.json({ error: "Pipeline step not found" }, { status: 404 })
    }

    // Create or update stage evaluation as draft (no submittedAt)
    await prisma.stageEvaluation.upsert({
      where: {
        pipelineStepId_interviewerId: {
          pipelineStepId: pipelineStep.id,
          interviewerId: BigInt(user.id)
        }
      },
      create: {
        pipelineStepId: pipelineStep.id,
        interviewerId: BigInt(user.id),
        formData: formData,
        score: null,
        recommendation: null,
        submittedAt: null
      },
      update: {
        formData: formData
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving draft:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
