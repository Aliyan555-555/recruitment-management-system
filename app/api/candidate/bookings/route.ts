import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireCandidate } from "@/lib/rbac"
import { BookingError, bookSlot } from "@/lib/scheduling/booking-service"
import { notifyBookingEvent } from "@/lib/scheduling/notifications"

const schema = z.object({
  pipelineId: z.string().regex(/^\d+$/),
  slotId: z.string().regex(/^\d+$/),
})

export async function POST(req: NextRequest) {
  const user = await requireCandidate()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    const { bookingId } = await bookSlot({
      candidateId: BigInt(user.id),
      pipelineId: BigInt(parsed.data.pipelineId),
      slotId: BigInt(parsed.data.slotId),
    })
    // emails + calendar invites go out after the booking is safely committed
    void notifyBookingEvent(bookingId, "BOOKED")
    return NextResponse.json({ bookingId: bookingId.toString() }, { status: 201 })
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error("Book slot error:", error)
    return NextResponse.json({ error: "Could not book this slot. Please try again." }, { status: 500 })
  }
}
