import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/rbac"
import { adminBookSlot, BookingError } from "@/lib/scheduling/booking-service"
import { notifyBookingEvent } from "@/lib/scheduling/notifications"

const schema = z.object({ candidateId: z.string().regex(/^\d+$/), slotId: z.string().regex(/^\d+$/) })

/** Admin books a slot on behalf of a candidate. */
export async function POST(req: NextRequest, { params }: { params: { stepId: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!/^\d+$/.test(params.stepId) || !parsed.success) return NextResponse.json({ error: "Choose a slot" }, { status: 400 })

  try {
    const { bookingId } = await adminBookSlot({
      candidateId: BigInt(parsed.data.candidateId),
      workflowStepId: BigInt(params.stepId),
      slotId: BigInt(parsed.data.slotId),
      actorId: BigInt(admin.id),
    })
    void notifyBookingEvent(bookingId, "BOOKED")
    return NextResponse.json({ bookingId: bookingId.toString() }, { status: 201 })
  } catch (error) {
    if (error instanceof BookingError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    console.error("Admin book error:", error)
    return NextResponse.json({ error: "Could not book this slot" }, { status: 500 })
  }
}
