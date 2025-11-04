import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireInterviewer } from "@/lib/rbac"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireInterviewer()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const slotId = BigInt(params.id)
    const body = await req.json()
    const now = BigInt(Math.floor(Date.now() / 1000))

    // Ensure ownership
    const slot = await (prisma as any).interviewSlot.findUnique({ where: { id: slotId } })
    if (!slot || slot.interviewerId.toString() !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const data: any = { updatedAt: now }
    if (typeof body.isBlocked === 'boolean') data.isBlocked = body.isBlocked
    if (typeof body.capacity === 'number' && body.capacity > 0) data.capacity = body.capacity
    if (body.startsAt) data.startsAt = new Date(body.startsAt)
    if (body.endsAt) data.endsAt = new Date(body.endsAt)

    await (prisma as any).interviewSlot.update({ where: { id: slotId }, data })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 400 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireInterviewer()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const slotId = BigInt(params.id)
    const slot = await (prisma as any).interviewSlot.findUnique({ where: { id: slotId } })
    if (!slot || slot.interviewerId.toString() !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await (prisma as any).slotBooking.deleteMany({ where: { slotId } })
    await (prisma as any).interviewSlot.delete({ where: { id: slotId } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 400 })
  }
}


