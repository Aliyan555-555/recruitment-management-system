import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireCandidate } from "@/lib/rbac"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireCandidate()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const pipelineId = BigInt(params.id)
    const pip = await prisma.candidatePipeline.findUnique({
      where: { id: pipelineId },
      include: {
        steps: true,
        job: { include: { workflow: { include: { steps: true } } } }
      }
    })
    if (!pip) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (pip.candidateId.toString() !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (pip.lockState && pip.lockState !== 'NONE') return NextResponse.json({ error: 'LOCKED' }, { status: 423 })
    if (!pip.job.workflow) return NextResponse.json({ error: 'No workflow' }, { status: 404 })

    const pendingOrder = pip.currentStepOrder
    const step = pip.job.workflow.steps.find(s => s.stepOrder === pendingOrder)
    if (!step) return NextResponse.json({ error: 'No pending step' }, { status: 404 })

    const slots = await (prisma as any).interviewSlot.findMany({
      where: { stepId: step.id, isBlocked: false, startsAt: { gt: new Date() } },
      include: { _count: { select: { bookings: true } } },
      orderBy: { startsAt: 'asc' }
    })

    const availableSlots = (slots as any[]).filter((s: any) => s._count.bookings < s.capacity)
      .map((s: any) => ({
        id: s.id.toString(),
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        capacity: s.capacity,
        booked: s._count.bookings
      }))

    return NextResponse.json({ step: { id: step.id.toString(), stepName: step.stepName, stepOrder: step.stepOrder }, slots: availableSlots })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}


