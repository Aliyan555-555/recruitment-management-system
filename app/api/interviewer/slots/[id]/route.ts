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
    
    // If updating time, validate conflicts
    let newStarts = body.startsAt ? new Date(body.startsAt) : new Date(slot.startsAt)
    let newEnds = body.endsAt ? new Date(body.endsAt) : new Date(slot.endsAt)
    
    if (body.startsAt || body.endsAt) {
      // Validate time range
      if (newEnds <= newStarts) {
        return NextResponse.json({ error: "Invalid time range: end time must be after start time" }, { status: 400 })
      }
      
      // Validate: Slot cannot be in the past
      if (newStarts < new Date()) {
        return NextResponse.json({ error: "Slot start time cannot be in the past" }, { status: 400 })
      }
      
      // Check for time conflicts with other slots (excluding current slot)
      const existingSlots = await (prisma as any).interviewSlot.findMany({
        where: {
          interviewerId: BigInt(user.id),
          id: { not: slotId }, // Exclude current slot
          isBlocked: false,
          OR: [
            {
              startsAt: { lte: newEnds },
              endsAt: { gte: newStarts }
            }
          ]
        }
      })
      
      // Check for actual time overlap
      const hasConflict = existingSlots.some((existingSlot: any) => {
        const existingStarts = new Date(existingSlot.startsAt)
        const existingEnds = new Date(existingSlot.endsAt)
        return newStarts < existingEnds && newEnds > existingStarts
      })
      
      if (hasConflict) {
        return NextResponse.json({ 
          error: "Time conflict: You already have a slot scheduled during this time. Please choose a different time slot.",
          conflictDetails: "This slot overlaps with an existing slot in your schedule."
        }, { status: 409 })
      }
      
      data.startsAt = newStarts
      data.endsAt = newEnds
    }

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


