import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { requireCandidate } from "@/lib/rbac"
import { formatPKTDateTime, formatPKTTime } from "@/lib/timezone"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireCandidate()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { applicationId } = body || {}
    if (!applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 })

    const slotId = BigInt(params.id)
    const applicationIdBig = BigInt(applicationId)
    const candidateId = BigInt(user.id)
    const now = BigInt(Math.floor(Date.now() / 1000))

    const result = await prisma.$transaction(async (tx) => {
      const slot = await (tx as any).interviewSlot.findUnique({
        where: { id: slotId },
        include: { _count: { select: { bookings: true } } }
      })

      if (!slot || slot.isBlocked) throw new Error("UNAVAILABLE")
      if (slot.startsAt <= new Date()) throw new Error("PAST")
      if (slot._count.bookings >= slot.capacity) throw new Error("FULL")

      // ensure application belongs to user
      const app = await tx.jobsApplied.findUnique({
        where: { id: applicationIdBig },
        select: { userId: true }
      })
      if (!app || app.userId !== candidateId) throw new Error("FORBIDDEN")

      const booking = await (tx as any).slotBooking.create({
        data: {
          slotId,
          candidateId,
          applicationId: applicationIdBig,
          status: "RESERVED",
          createdAt: now,
          updatedAt: now
        }
      })

      return booking
    })

    // Fire-and-forget notifications (no await to keep latency low)
    ;(async () => {
      try {
        const slot = await (prisma as any).interviewSlot.findUnique({ 
          where: { id: result.slotId },
          include: {
            step: {
              select: {
                stepName: true
              }
            }
          }
        })
        
        if (slot) {
          const slotDateTime = formatPKTDateTime(slot.startsAt)
          const slotTimeRange = `${formatPKTTime(slot.startsAt, false)} - ${formatPKTTime(slot.endsAt, false)}`
          
          // Notify candidate
          await createNotification({
            userId: BigInt(user.id),
            title: "Interview Slot Booked",
            message: `Your interview slot has been booked successfully.\n\nStep: ${slot.step.stepName}\nDate & Time: ${slotDateTime}\nDuration: ${slotTimeRange}`,
            type: "SYSTEM",
            entityType: "booking",
            entityId: BigInt(result.id)
          })
          
          // Notify interviewer with candidate details
          if (slot?.interviewerId) {
            const candidate = await prisma.user.findUnique({
              where: { id: candidateId },
              select: { firstname: true, lastname: true, email: true }
            })
            
            const candidateName = candidate ? `${candidate.firstname} ${candidate.lastname}` : "A candidate"
            
            await createNotification({
              userId: BigInt(slot.interviewerId),
              title: "Slot Booked",
              message: `${candidateName} has booked your interview slot.\n\nStep: ${slot.step.stepName}\nDate & Time: ${slotDateTime}\nDuration: ${slotTimeRange}`,
              type: "ASSIGNMENT",
              entityType: "booking",
              entityId: BigInt(result.id)
            })
          }
        }
      } catch (error) {
        console.error("Error sending notifications:", error)
      }
    })()

    return NextResponse.json({ bookingId: result.id.toString(), status: "RESERVED" })
  } catch (e: any) {
    const code = e?.message === "FULL" ? 409 : (e?.message === "FORBIDDEN" ? 403 : 400)
    return NextResponse.json({ error: e.message || "Failed to book" }, { status: code })
  }
}


