import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireStaff } from "@/lib/rbac"
import { INTERNAL_BEHAVIORS, EXTERNAL_BEHAVIORS } from "@/lib/constants/focus-group-behaviors"

type Mode = "internal" | "external"

interface BehaviorInput {
  id?: string
  name?: string
  rating?: number
  feedback?: string
  positiveIndicators?: string[]
  negativeIndicators?: string[]
}

function parseMode(mode: string | undefined): Mode | null {
  return mode === "internal" || mode === "external" ? mode : null
}

function validateBehaviors(behaviors: BehaviorInput[] | undefined) {
  if (!behaviors || behaviors.length === 0) return "Behaviors are required"
  for (const b of behaviors) {
    if (b.rating === undefined || b.rating === null) return "Each behavior requires a rating"
    const ratingNum = Number(b.rating)
    if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 4) {
      return "Ratings must be between 1 and 4"
    }
  }
  return null
}

function computeScore(behaviors: BehaviorInput[]) {
  const totalScore = behaviors.reduce((sum, b) => sum + Number(b.rating || 0), 0)
  const maxScore = behaviors.length * 4
  const scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  return { totalScore, maxScore, scorePercentage }
}

async function getPipelineStep(params: { id: string; roundId: string; candidateId: string }) {
  return prisma.candidatePipelineStep.findFirst({
    where: {
      workflowStepId: BigInt(params.roundId),
      pipeline: {
        candidateId: BigInt(params.candidateId),
        jobId: BigInt(params.id)
      }
    },
    include: {
      workflowStep: true
    }
  })
}

// GET - fetch schema and saved data for internal/external focus group
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; roundId: string; candidateId: string; mode: string } }
) {
  try {
    const user = await requireStaff()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Admin or Interviewer access required" }, { status: 401 })
    }

    const mode = parseMode(params.mode)
    if (!mode) return NextResponse.json({ error: "Invalid mode" }, { status: 400 })

    const pipelineStep = await getPipelineStep(params)
    if (!pipelineStep) return NextResponse.json({ error: "Pipeline step not found" }, { status: 404 })

    // Use hardcoded behaviors based on mode
    const schema = mode === "internal" ? INTERNAL_BEHAVIORS : EXTERNAL_BEHAVIORS

    // Get candidate and pipeline info
    const pipeline = await prisma.candidatePipeline.findFirst({
      where: {
        candidateId: BigInt(params.candidateId),
        jobId: BigInt(params.id)
      },
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
            company: true
          }
        }
      }
    })

    const evaluation = await prisma.stageEvaluation.findFirst({
      where: {
        pipelineStepId: pipelineStep.id,
        evaluatorId: BigInt(user.id)
      },
      include: {
        evaluator: {
          select: {
            id: true,
            firstname: true,
            lastname: true
          }
        }
      }
    })

    const formData = (evaluation?.formData as any) || {}
    const modeData = formData?.focusGroup?.[mode] || null

    return NextResponse.json({
      schema,
      data: modeData,
      submittedAt: modeData?.submittedAt || null,
      score: modeData?.score || null,
      scorePercentage: modeData?.scorePercentage || null,
      candidate: pipeline?.candidate ? {
        id: pipeline.candidate.id.toString(),
        name: `${pipeline.candidate.firstname} ${pipeline.candidate.lastname}`,
        email: pipeline.candidate.email
      } : null,
      job: pipeline?.job ? {
        id: pipeline.job.id.toString(),
        title: pipeline.job.title,
        company: pipeline.job.company
      } : null,
      assessor: evaluation?.evaluator ? {
        id: evaluation.evaluator.id.toString(),
        name: `${evaluation.evaluator.firstname} ${evaluation.evaluator.lastname}`
      } : null,
      assessorName: modeData?.assessorName || null,
      date: modeData?.date || null,
      groupNumber: modeData?.groupNumber || null
    })
  } catch (error) {
    console.error("Error fetching focus group assessment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - save draft
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string; candidateId: string; mode: string } }
) {
  try {
    const user = await requireStaff()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Admin or Interviewer access required" }, { status: 401 })
    }
    const mode = parseMode(params.mode)
    if (!mode) return NextResponse.json({ error: "Invalid mode" }, { status: 400 })

    const body = await request.json()
    const behaviors = (body?.behaviors || []) as BehaviorInput[]
    const validationError = validateBehaviors(behaviors)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const pipelineStep = await getPipelineStep(params)
    if (!pipelineStep) return NextResponse.json({ error: "Pipeline step not found" }, { status: 404 })

    const existing = await prisma.stageEvaluation.findFirst({
      where: { pipelineStepId: pipelineStep.id, evaluatorId: BigInt(user.id) }
    })
    const existingForm = (existing?.formData as any) || {}
    const focusGroup = existingForm.focusGroup || {}
    focusGroup[mode] = {
      behaviors,
      assessorName: body?.assessorName || null,
      date: body?.date || null,
      groupNumber: body?.groupNumber || null,
      submittedAt: null,
      score: null,
      scorePercentage: null
    }

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
        formData: { focusGroup },
        score: null,
        recommendation: null,
        submittedAt: null
      },
      update: {
        formData: { focusGroup },
        score: existing?.score ?? null,
        recommendation: existing?.recommendation ?? null
      }
    })

    // Mark pipeline step as in progress
    await prisma.candidatePipelineStep.update({
      where: { id: pipelineStep.id },
      data: { status: "IN_PROGRESS" }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving focus group draft:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - submit
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string; candidateId: string; mode: string } }
) {
  try {
    const user = await requireStaff()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Admin or Interviewer access required" }, { status: 401 })
    }
    const mode = parseMode(params.mode)
    if (!mode) return NextResponse.json({ error: "Invalid mode" }, { status: 400 })

    const body = await request.json()
    const behaviors = (body?.behaviors || []) as BehaviorInput[]
    const validationError = validateBehaviors(behaviors)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const pipelineStep = await getPipelineStep(params)
    if (!pipelineStep) return NextResponse.json({ error: "Pipeline step not found" }, { status: 404 })

    const existing = await prisma.stageEvaluation.findFirst({
      where: { pipelineStepId: pipelineStep.id, evaluatorId: BigInt(user.id) }
    })
    const existingForm = (existing?.formData as any) || {}
    const focusGroup = existingForm.focusGroup || {}

    const { totalScore, maxScore, scorePercentage } = computeScore(behaviors)
    focusGroup[mode] = {
      behaviors,
      assessorName: body?.assessorName || null,
      date: body?.date || null,
      groupNumber: body?.groupNumber || null,
      submittedAt: Math.floor(Date.now() / 1000), // plain number: BigInt cannot be stored in a JSON column
      score: totalScore,
      maxScore,
      scorePercentage
    }

    const bothSubmitted =
      (focusGroup.internal?.submittedAt ? 1 : 0) + (focusGroup.external?.submittedAt ? 1 : 0) === 2

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
        formData: { focusGroup },
        score: totalScore,
        recommendation: null,
        submittedAt: bothSubmitted ? BigInt(Math.floor(Date.now() / 1000)) : null
      },
      update: {
        formData: { focusGroup },
        score: totalScore,
        recommendation: existing?.recommendation ?? null,
        submittedAt: bothSubmitted ? BigInt(Math.floor(Date.now() / 1000)) : null
      }
    })

    // Update pipeline step status only when both internal and external are submitted
    await prisma.candidatePipelineStep.update({
      where: { id: pipelineStep.id },
      data: { status: bothSubmitted ? "COMPLETED" : "IN_PROGRESS" }
    })

    return NextResponse.json({ success: true, score: totalScore, maxScore, scorePercentage, bothSubmitted })
  } catch (error) {
    console.error("Error submitting focus group assessment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

