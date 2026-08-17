import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireStaff } from "@/lib/rbac"

type AssessmentForm = {
  skills?: Record<string, { rating?: number; max?: number }>
  comments?: string
  recommendedToHire?: string
  priorityToOffer?: string
  interviewerIds?: string[]
}

const DEFAULT_SKILL_MAX: Record<string, number> = {
  appearance: 10,
  education: 10,
  intellectual: 10,
  leadership: 10,
  principles: 10,
  itSkills: 10,
  communication: 10,
  commitment: 10,
  assertiveness: 10,
  versatility: 10,
  professionalKnowledge: 25,
  experience: 25
}

function calculateScore(formData: AssessmentForm) {
  let totalScore = 0
  let maxScore = 0

  Object.entries(formData.skills || {}).forEach(([key, skill]) => {
    const rating = Number(skill?.rating ?? 0)
    const max = Number(skill?.max ?? DEFAULT_SKILL_MAX[key] ?? 10)
    totalScore += rating
    maxScore += max
  })

  const scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  const recommendedToHire =
    formData.recommendedToHire === "Recommended" ||
    formData.recommendedToHire === "yes" ||
    formData.recommendedToHire === "HIRE"
  const recommendation = recommendedToHire ? "HIRE" : "NO_HIRE"

  return { totalScore, maxScore, scorePercentage, recommendation }
}

function validateFormData(formData: AssessmentForm) {
  if (!formData) return "Form data is required"
  if (!formData.skills || Object.keys(formData.skills).length === 0) return "Skills are required"
  const hasMissingSkill = Object.entries(DEFAULT_SKILL_MAX).some(([key]) => {
    const rating = (formData.skills as any)?.[key]?.rating
    return rating === undefined || rating === null
  })
  if (hasMissingSkill) return "All skill ratings are required"
  if (!formData.recommendedToHire) return "Recommendation is required"
  return null
}

// GET /api/admin/jobs/[id]/rounds/[roundId]/candidates/[candidateId]/assessment - Get existing assessment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string; candidateId: string } }
) {
  try {
    console.log("[Assessment API] Starting GET request")
    const user = await requireStaff()
    
    if (!user) {
      console.log("[Assessment API] Unauthorized")
      return NextResponse.json(
        { error: "Unauthorized - Admin or Interviewer access required" },
        { status: 401 }
      )
    }

    console.log("[Assessment API] Parsing params:", params)
    // Parse BigInt params safely
    let roundId, candidateId, jobId;
    try {
      roundId = BigInt(params.roundId)
      candidateId = BigInt(params.candidateId)
      jobId = BigInt(params.id)
    } catch (e) {
       console.error("[Assessment API] Error parsing BigInt params:", e)
       return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }

    console.log("[Assessment API] Fetching pipeline step")
    // Find pipeline step for this candidate and round
    const pipelineStep = await prisma.candidatePipelineStep.findFirst({
      where: {
        workflowStepId: roundId,
        pipeline: {
          candidateId: candidateId,
          jobId: jobId
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
            evaluator: {
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
      console.log("[Assessment API] Pipeline step not found")
      return NextResponse.json({ error: "Pipeline step not found" }, { status: 404 })
    }

    console.log("[Assessment API] Pipeline step found, extracting data")

    const evaluation = pipelineStep.stageEvaluations[0]
    const candidate = pipelineStep.pipeline.candidate
    const latestEducation = candidate.educations[0]
    const latestExperience = candidate.experiences[0]

    // Extract interviewer IDs from step metadata
    const stepMetadata = pipelineStep.workflowStep.stepMetadata as any
    const stepInterviewerIds = stepMetadata?.interviewerIds || []

    const responseData = {
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
      submittedAt: evaluation?.submittedAt ? evaluation.submittedAt.toString() : null,
      interviewer: evaluation?.evaluator ?
        `${evaluation.evaluator.firstname} ${evaluation.evaluator.lastname}` : null,
      evaluation: evaluation
        ? (() => {
            const { totalScore, maxScore, scorePercentage, recommendation } = calculateScore(
              evaluation.formData as AssessmentForm
            )
            return {
              score: totalScore,
              maxScore,
              scorePercentage,
              recommendation
            }
          })()
        : null
    }

    console.log("[Assessment API] Sending response")
    return NextResponse.json(responseData)
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
    const { formData } = body as { formData: AssessmentForm }

    const validationError = validateFormData(formData)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
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

    const { totalScore, maxScore, scorePercentage, recommendation } = calculateScore(formData)
    const recommendedToHire = recommendation === "HIRE"

    // Create or update stage evaluation
    const evaluation = await prisma.stageEvaluation.upsert({
      where: {
        pipelineStepId_evaluatorId: {
          pipelineStepId: pipelineStep.id,
          evaluatorId: BigInt(user.id)
        }
      },
      create: {
        pipelineStepId: pipelineStep.id,
        evaluatorId: BigInt(user.id),
        formData: formData,
        score: totalScore,
        recommendation: recommendation as any,
        submittedAt: BigInt(Math.floor(Date.now() / 1000))
      },
      update: {
        formData: formData,
        score: totalScore,
        recommendation: recommendation as any,
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
        pipelineStepId_evaluatorId: {
          pipelineStepId: pipelineStep.id,
          evaluatorId: BigInt(user.id)
        }
      },
      create: {
        pipelineStepId: pipelineStep.id,
        evaluatorId: BigInt(user.id),
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
