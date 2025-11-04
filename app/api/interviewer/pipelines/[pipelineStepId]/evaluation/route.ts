import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireInterviewer } from "@/lib/rbac"
import { createNotification, notifyPipelineCompletion } from "@/lib/notifications"

export async function POST(
  req: NextRequest,
  { params }: { params: { pipelineStepId: string } }
) {
  const user = await requireInterviewer()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { formData, score, recommendation } = body || {}
    const stepId = BigInt(params.pipelineStepId)
    const interviewerId = BigInt(user.id)
    const now = BigInt(Math.floor(Date.now() / 1000))

    const result = await prisma.$transaction(async (tx) => {
      const step = await tx.candidatePipelineStep.findUnique({
        where: { id: stepId },
        include: {
          pipeline: true,
          workflowStep: true
        }
      })
      if (!step) throw new Error("NOT_FOUND")

      // permission: interviewer is assigned on step or on slot booking for this step
      if (step.interviewerId && step.interviewerId !== interviewerId) {
        throw new Error("FORBIDDEN")
      }

      await (tx as any).stageEvaluation.upsert({
        where: { pipelineStepId_interviewerId: { pipelineStepId: stepId, interviewerId } },
        create: { pipelineStepId: stepId, interviewerId, formData, score, recommendation, submittedAt: now },
        update: { formData, score, recommendation, submittedAt: now }
      })

      // Update step status to COMPLETED
      await tx.candidatePipelineStep.update({
        where: { id: stepId },
        data: { status: 'COMPLETED', completedAt: now }
      })

      if (recommendation === 'REJECTED' || recommendation === 'STRONG_NO_HIRE' || recommendation === 'NO_HIRE') {
        await (tx as any).candidatePipeline.update({
          where: { id: step.pipelineId },
          data: { lockState: 'LOCKED_REJECTED', overallStatus: 'REJECTED' }
        })
        return { advanced: false, rejected: true, pipelineId: step.pipelineId }
      }

      // advance with optional/skippable support: skip contiguous skippable optional stages
      const steps = await tx.workflowStep.findMany({
        where: { workflowId: step.workflowStep.workflowId },
        orderBy: { stepOrder: 'asc' }
      })
      let idx = steps.findIndex(s => s.stepOrder === step.stepOrder)
      let nextOrder = step.stepOrder
      while (true) {
        nextOrder += 1
        const next = steps.find(s => s.stepOrder === nextOrder)
        if (!next) {
          await tx.candidatePipeline.update({ where: { id: step.pipelineId }, data: { overallStatus: 'COMPLETED', completedAt: now } })
          return { advanced: true, completed: true, pipelineId: step.pipelineId }
        }
        if (next.isRequired) {
          await tx.candidatePipeline.update({ where: { id: step.pipelineId }, data: { currentStepOrder: nextOrder } })
          return { advanced: true, pipelineId: step.pipelineId }
        }
        if (next.isSkippable) {
          // auto-skip optional skippable stage
          continue
        }
        // optional but not skippable -> stop here
        await tx.candidatePipeline.update({ where: { id: step.pipelineId }, data: { currentStepOrder: nextOrder } })
        return { advanced: true, pipelineId: step.pipelineId }
      }
    })

    // notifications
    ;(async () => {
      try {
        if (result.rejected) {
          await createNotification({
            userId: BigInt(user.id),
            title: "Evaluation Submitted",
            message: "You submitted a rejection recommendation.",
            type: "SYSTEM",
            entityType: "pipeline",
            entityId: BigInt(result.pipelineId)
          })
        } else if (result.completed) {
          await notifyPipelineCompletion(BigInt(0), "", "COMPLETED")
        } else if (result.advanced) {
          await createNotification({
            userId: BigInt(user.id),
            title: "Stage Advanced",
            message: "Candidate pipeline has advanced to next stage.",
            type: "SYSTEM",
            entityType: "pipeline",
            entityId: BigInt(result.pipelineId)
          })
        }
      } catch {}
    })()

    return NextResponse.json({ status: "OK", ...result })
  } catch (e: any) {
    const code = e?.message === 'FORBIDDEN' ? 403 : (e?.message === 'NOT_FOUND' ? 404 : 400)
    return NextResponse.json({ error: e.message || "Failed to submit evaluation" }, { status: code })
  }
}


