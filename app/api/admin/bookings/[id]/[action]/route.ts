import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/rbac"
import { BookingError, cancelBooking, markNoShow, rescheduleBooking } from "@/lib/scheduling/booking-service"
import { loadBookingContext, notifyBookingEvent } from "@/lib/scheduling/notifications"

const cancelSchema = z.object({ reason: z.string().trim().max(500).optional().nullable() })
const rescheduleSchema = z.object({ slotId: z.string().regex(/^\d+$/) })

/** Admin actions on a booking: cancel | reschedule | no-show. */
export async function POST(req: NextRequest, { params }: { params: { id: string; action: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!/^\d+$/.test(params.id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const bookingId = BigInt(params.id)
  const actorId = BigInt(admin.id)
  const body = await req.json().catch(() => ({}))

  try {
    switch (params.action) {
      case "cancel": {
        const parsed = cancelSchema.safeParse(body)
        if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })
        await cancelBooking({ bookingId, actorId, reason: parsed.data.reason })
        void notifyBookingEvent(bookingId, "CANCELLED", { reason: parsed.data.reason })
        break
      }
      case "reschedule": {
        const parsed = rescheduleSchema.safeParse(body)
        if (!parsed.success) return NextResponse.json({ error: "Choose a new slot" }, { status: 400 })
        const previous = await loadBookingContext(bookingId)
        await rescheduleBooking({ bookingId, newSlotId: BigInt(parsed.data.slotId), actorId })
        void notifyBookingEvent(bookingId, "RESCHEDULED", { previous })
        break
      }
      case "no-show":
        await markNoShow({ bookingId, actorId })
        break
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof BookingError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    console.error(`Booking ${params.action} error:`, error)
    return NextResponse.json({ error: "Action failed. Please try again." }, { status: 500 })
  }
}
