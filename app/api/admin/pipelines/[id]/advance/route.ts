import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { requireAdmin } from "@/lib/rbac"
import { advanceToNextStep, handleStepRejection } from "@/lib/pipeline-helpers"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { action, targetStepOrder } = body || {}
    const pipelineId = BigInt(params.id)
    const now = BigInt(Math.floor(Date.now() / 1000))

    // Get pipeline first
    const pipelineData = await prisma.candidatePipeline.findUnique({ 
      where: { id: pipelineId },
      select: {
        id: true,
        currentStepOrder: true
      }
    })
    
    if (!pipelineData) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 })
    }

    const currentStepOrder = Number(pipelineData.currentStepOrder)
    
    // Get current step separately
    const currentStep = await prisma.candidatePipelineStep.findFirst({
      where: {
        pipelineId,
        stepOrder: currentStepOrder
      },
      select: {
        id: true,
        stepOrder: true,
        status: true
      }
    })

    // Handle actions that need transactions
    if (action === 'override_rejection' || action === 'reopen' || action === 'force_skip') {
      const result = await prisma.$transaction(async (tx) => {
        if (action === 'override_rejection') {
          await (tx as any).candidatePipeline.update({ 
            where: { id: pipelineId }, 
            data: { lockState: 'NONE', overallStatus: 'IN_PROGRESS' } 
          })
          await tx.auditLog.create({ 
            data: { 
              pipelineId, 
              userId: BigInt(admin.id), 
              action: 'OVERRIDDEN', 
              entityType: 'pipeline', 
              entityId: pipelineId, 
              timestamp: now 
            } as any 
          })
          return { status: 'OK', message: 'Rejection overridden' }
        }

        if (action === 'reopen') {
          await (tx as any).candidatePipeline.update({ 
            where: { id: pipelineId }, 
            data: { overallStatus: 'IN_PROGRESS', lockState: 'NONE' } 
          })
          await tx.auditLog.create({ 
            data: { 
              pipelineId, 
              userId: BigInt(admin.id), 
              action: 'REOPENED', 
              entityType: 'pipeline', 
              entityId: pipelineId, 
              timestamp: now 
            } as any 
          })
          return { status: 'OK', message: 'Pipeline reopened' }
        }

        if (action === 'force_skip') {
          const order = targetStepOrder ?? (currentStepOrder + 1)
          await (tx as any).candidatePipeline.update({ 
            where: { id: pipelineId }, 
            data: { currentStepOrder: order } 
          })
          await tx.auditLog.create({ 
            data: { 
              pipelineId, 
              userId: BigInt(admin.id), 
              action: 'SKIPPED', 
              entityType: 'pipeline', 
              entityId: pipelineId, 
              timestamp: now 
            } as any 
          })
          return { status: 'OK', message: 'Step skipped' }
        }

        throw new Error('INVALID_ACTION')
      })

      // Notify admin
      ;(async () => {
        try {
          await createNotification({
            userId: BigInt(admin.id),
            title: "Pipeline Action Executed",
            message: `Action ${action} executed on pipeline ${params.id}`,
            type: "SYSTEM",
            entityType: "pipeline",
            entityId: BigInt(params.id)
          })
        } catch {}
      })()

      return NextResponse.json(result)
    }

    // Handle advance and force_pass actions (outside transaction)
    if (action === 'advance') {
      const advanceResult = await advanceToNextStep(pipelineId, currentStepOrder)
      
      if (!advanceResult.success) {
        return NextResponse.json(
          { error: advanceResult.error || 'Failed to advance' },
          { status: 400 }
        )
      }

      // Log audit
      await prisma.auditLog.create({
        data: {
          pipelineId,
          userId: BigInt(admin.id),
          action: 'ADVANCED',
          entityType: 'pipeline',
          entityId: pipelineId,
          timestamp: now
        } as any
      })

      // Notify admin
      await createNotification({
        userId: BigInt(admin.id),
        title: "Pipeline Advanced",
        message: `Pipeline ${params.id} advanced to next step`,
        type: "SYSTEM",
        entityType: "pipeline",
        entityId: BigInt(params.id)
      })

      return NextResponse.json({ 
        status: 'OK', 
        message: 'Advanced to next step successfully' 
      })
    }

    if (action === 'force_pass') {
      // Mark current step as completed first
      if (currentStep && currentStep.status !== "COMPLETED") {
        await prisma.candidatePipelineStep.update({
          where: { id: currentStep.id },
          data: {
            status: "COMPLETED",
            completedAt: now
          }
        })
      }

      // Then advance
      const advanceResult = await advanceToNextStep(pipelineId, currentStepOrder)
      
      if (!advanceResult.success) {
        return NextResponse.json(
          { error: advanceResult.error || 'Failed to force pass' },
          { status: 400 }
        )
      }

      // Log audit
      await prisma.auditLog.create({
        data: {
          pipelineId,
          userId: BigInt(admin.id),
          action: 'ADVANCED',
          entityType: 'pipeline',
          entityId: pipelineId,
          changes: 'Admin manually passed candidate to next step',
          timestamp: now
        } as any
      })

      // Notify admin
      await createNotification({
        userId: BigInt(admin.id),
        title: "Candidate Force Passed",
        message: `Candidate in pipeline ${params.id} was manually passed to next step`,
        type: "SYSTEM",
        entityType: "pipeline",
        entityId: BigInt(params.id)
      })

      return NextResponse.json({ 
        status: 'OK', 
        message: 'Candidate passed to next step' 
      })
    }

    return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 })
  } catch (e: any) {
    console.error("Admin pipeline advance error:", e)
    const code = e?.message === 'NOT_FOUND' ? 404 : 400
    return NextResponse.json({ error: e.message || 'Failed' }, { status: code })
  }
}
