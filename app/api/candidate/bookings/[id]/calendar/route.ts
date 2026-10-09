import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireCandidate } from "@/lib/rbac"
import { buildIcs } from "@/lib/calendar/ics"
import { loadBookingContext } from "@/lib/scheduling/notifications"

/** Downloads an .ics for the candidate's own active booking. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireCandidate()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!/^\d+$/.test(params.id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const owned = await prisma.slotBooking.findFirst({
    where: { id: BigInt(params.id), candidateId: BigInt(user.id), status: "RESERVED" },
    select: { id: true },
  })
  if (!owned) return NextResponse.json({ error: "Booking not found" }, { status: 404 })

  const ctx = await loadBookingContext(owned.id)
  if (!ctx) return NextResponse.json({ error: "Booking not found" }, { status: 404 })

  const ics = buildIcs({
    uid: `booking-${ctx.bookingId}@rms`,
    sequence: ctx.sequence,
    method: "REQUEST",
    startsAt: ctx.startsAt,
    endsAt: ctx.endsAt,
    summary: `${ctx.stepName} - ${ctx.jobTitle}`,
    description: [ctx.instructionsForCandidate, ctx.meetingLink ? `Join: ${ctx.meetingLink}` : null].filter(Boolean).join("\n") || undefined,
    location: ctx.location ?? ctx.meetingLink ?? undefined,
    attendees: [{ name: ctx.candidate.name, email: ctx.candidate.email }],
  })

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="interview-${ctx.bookingId}.ics"`,
      "Cache-Control": "no-store",
    },
  })
}
