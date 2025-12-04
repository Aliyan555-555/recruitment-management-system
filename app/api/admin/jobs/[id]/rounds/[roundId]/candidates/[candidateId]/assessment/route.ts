import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/admin/jobs/[id]/rounds/[roundId]/candidates/[candidateId]/assessment - Get existing assessment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string; candidateId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "INTERVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    return NextResponse.json({
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
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "INTERVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    // Calculate score and recommendation based on form data
    const recommendedToHire = formData.recommendedToHire === "yes"
    const score = recommendedToHire ? 75 : 40 // Simple scoring logic
    const recommendation = recommendedToHire ? "HIRE" : "NO_HIRE"

    // Create or update stage evaluation
    const evaluation = await prisma.stageEvaluation.upsert({
      where: {
        pipelineStepId_interviewerId: {
          pipelineStepId: pipelineStep.id,
          interviewerId: BigInt(session.user.id)
        }
      },
      create: {
        pipelineStepId: pipelineStep.id,
        interviewerId: BigInt(session.user.id),
        formData: formData,
        score: score,
        recommendation: recommendation,
        submittedAt: Date.now()
      },
      update: {
        formData: formData,
        score: score,
        recommendation: recommendation,
        submittedAt: Date.now()
      }
    })

    // Update pipeline step status to COMPLETED
    await prisma.candidatePipelineStep.update({
      where: { id: pipelineStep.id },
      data: {
        status: recommendedToHire ? "COMPLETED" : "REJECTED",
        completedAt: Date.now()
      }
    })

    return NextResponse.json({ success: true, evaluation: {
      id: evaluation.id.toString(),
      score,
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
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "INTERVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
          interviewerId: BigInt(session.user.id)
        }
      },
      create: {
        pipelineStepId: pipelineStep.id,
        interviewerId: BigInt(session.user.id),
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
