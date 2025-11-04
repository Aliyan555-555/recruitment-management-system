import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { requireAdmin } from "@/lib/rbac"

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

    const result = await prisma.$transaction(async (tx) => {
      const pipeline = await tx.candidatePipeline.findUnique({ where: { id: pipelineId } })
      if (!pipeline) throw new Error("NOT_FOUND")

      if (action === 'override_rejection') {
        await (tx as any).candidatePipeline.update({ where: { id: pipelineId }, data: { lockState: 'NONE' } })
        await tx.auditLog.create({ data: { pipelineId, userId: BigInt(admin.id), action: 'OVERRIDDEN', entityType: 'pipeline', entityId: pipelineId, timestamp: now } as any })
        return { status: 'OK' }
      }

      if (action === 'reopen') {
        await (tx as any).candidatePipeline.update({ where: { id: pipelineId }, data: { overallStatus: 'IN_PROGRESS' } })
        await tx.auditLog.create({ data: { pipelineId, userId: BigInt(admin.id), action: 'REOPENED', entityType: 'pipeline', entityId: pipelineId, timestamp: now } as any })
        return { status: 'OK' }
      }

      if (action === 'force_skip') {
        const order = targetStepOrder ?? (Number(pipeline.currentStepOrder) + 1)
        await (tx as any).candidatePipeline.update({ where: { id: pipelineId }, data: { currentStepOrder: order } })
        await tx.auditLog.create({ data: { pipelineId, userId: BigInt(admin.id), action: 'SKIPPED', entityType: 'pipeline', entityId: pipelineId, timestamp: now } as any })
        return { status: 'OK' }
      }

      if (action === 'advance') {
        const order = targetStepOrder ?? (Number(pipeline.currentStepOrder) + 1)
        await (tx as any).candidatePipeline.update({ where: { id: pipelineId }, data: { currentStepOrder: order } })
        await tx.auditLog.create({ data: { pipelineId, userId: BigInt(admin.id), action: 'ADVANCED', entityType: 'pipeline', entityId: pipelineId, timestamp: now } as any })
        return { status: 'OK' }
      }

      throw new Error('INVALID_ACTION')
    })

    // notify admin self (audit) and optionally candidate via future enhancement
    ;(async () => {
      try {
        await createNotification({
          userId: BigInt(admin.id),
          title: "Pipeline Action Executed",
          message: `Action ${body?.action || ''} executed on pipeline ${params.id}`,
          type: "SYSTEM",
          entityType: "pipeline",
          entityId: BigInt(params.id)
        })
      } catch {}
    })()

    return NextResponse.json(result)
  } catch (e: any) {
    const code = e?.message === 'NOT_FOUND' ? 404 : 400
    return NextResponse.json({ error: e.message || 'Failed' }, { status: code })
  }
}


