import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/rbac"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { steps } = body || {}
    if (!Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({ error: "steps required" }, { status: 400 })
    }

    const jobId = BigInt(params.id)
    const now = BigInt(Math.floor(Date.now() / 1000))

    // Validate sequential order starting from 1
    const orders = steps.map((s: any) => s.stepOrder).sort((a: number,b: number)=>a-b)
    for (let i=0;i<orders.length;i++) { if (orders[i] !== i+1) return NextResponse.json({ error: "Step orders must be sequential starting from 1" }, { status: 400 }) }

    const result = await prisma.$transaction(async (tx) => {
      const wf = await tx.jobWorkflow.upsert({
        where: { jobId },
        update: { updatedAt: now },
        create: { jobId, createdAt: now, updatedAt: now }
      })

      // Delete steps not present
      const existing = await tx.workflowStep.findMany({ where: { workflowId: wf.id } })
      const keepIds = new Set(steps.filter((s: any)=>s.id).map((s: any)=>BigInt(s.id)))
      const toDelete = existing.filter(es => !keepIds.has(es.id)).map(es=>es.id)
      if (toDelete.length) {
        await tx.candidatePipelineStep.deleteMany({ where: { workflowStepId: { in: toDelete } } })
        await tx.workflowStep.deleteMany({ where: { id: { in: toDelete } } })
      }

      // Upsert provided steps
      for (const s of steps) {
        const data: any = {
          workflowId: wf.id,
          stepName: s.stepName,
          stepOrder: s.stepOrder,
          isRequired: s.isRequired ?? true,
          isSkippable: s.isSkippable ?? false,
          interviewerId: s.interviewerId ? BigInt(s.interviewerId) : null,
          evaluationSchema: s.evaluationSchema ?? null,
          capacityPerSlot: s.capacityPerSlot ?? null,
          status: 'ACTIVE',
          updatedAt: now,
        }
        if (s.id) {
          await (tx as any).workflowStep.update({ where: { id: BigInt(s.id) }, data })
        } else {
          await (tx as any).workflowStep.create({ data: { ...data, createdAt: now } })
        }
      }

      return { workflowId: wf.id.toString() }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to upsert stages" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { stepId, ...updates } = body || {}
    if (!stepId) return NextResponse.json({ error: "stepId required" }, { status: 400 })
    const now = BigInt(Math.floor(Date.now() / 1000))

    await (prisma as any).workflowStep.update({
      where: { id: BigInt(stepId) },
      data: {
        isRequired: updates.isRequired,
        isSkippable: updates.isSkippable,
        interviewerId: updates.interviewerId ? BigInt(updates.interviewerId) : undefined,
        evaluationSchema: updates.evaluationSchema,
        capacityPerSlot: updates.capacityPerSlot,
        updatedAt: now
      }
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update stage" }, { status: 500 })
  }
}


