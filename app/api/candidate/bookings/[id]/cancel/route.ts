import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { requireCandidate } from "@/lib/rbac"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireCandidate()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const bookingId = BigInt(params.id)
    const now = BigInt(Math.floor(Date.now() / 1000))

    const booking = await (prisma as any).slotBooking.findUnique({ where: { id: bookingId } })
    if (!booking || booking.candidateId.toString() !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const updated = await (prisma as any).slotBooking.update({ where: { id: bookingId }, data: { status: 'CANCELLED', updatedAt: now } })

    // notify interviewer and candidate
    ;(async () => {
      try {
        await createNotification({
          userId: BigInt(user.id),
          title: "Booking Cancelled",
          message: "Your interview slot booking has been cancelled.",
          type: "SYSTEM",
          entityType: "booking",
          entityId: bookingId
        })
        const slot = await (prisma as any).interviewSlot.findUnique({ where: { id: updated.slotId } })
        if (slot?.interviewerId) {
          await createNotification({
            userId: BigInt(slot.interviewerId),
            title: "Booking Cancelled",
            message: "A candidate cancelled a booking for your interview slot.",
            type: "SYSTEM",
            entityType: "booking",
            entityId: bookingId
          })
        }
      } catch {}
    })()

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 400 })
  }
}


