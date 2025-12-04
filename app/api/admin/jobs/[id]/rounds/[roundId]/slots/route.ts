import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/admin/jobs/[id]/rounds/[roundId]/slots - List slots
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "INTERVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const slots = await prisma.interviewSlot.findMany({
      where: {
        stepId: BigInt(params.roundId)
      },
      include: {
        interviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        bookings: {
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        startsAt: 'asc'
      }
    })

    return NextResponse.json({
      slots: slots.map(slot => ({
        id: slot.id.toString(),
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        capacity: slot.capacity,
        isBlocked: slot.isBlocked,
        interviewer: {
          id: slot.interviewer.id.toString(),
          name: `${slot.interviewer.firstName} ${slot.interviewer.lastName}`
        },
        bookings: slot.bookings.map(booking => ({
          id: booking.id.toString(),
          candidateName: `${booking.candidate.firstName} ${booking.candidate.lastName}`,
          status: booking.status
        }))
      }))
    })
  } catch (error) {
    console.error("Error fetching slots:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/jobs/[id]/rounds/[roundId]/slots - Create slots
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { date, startTime, endTime, duration, capacity, interviewerIds, buffer } = body

    // Basic validation
    if (!date || !startTime || !endTime || !duration || !interviewerIds || interviewerIds.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const startDateTime = new Date(`${date}T${startTime}`)
    const endDateTime = new Date(`${date}T${endTime}`)
    const durationMs = duration * 60 * 1000
    const bufferMs = (buffer || 0) * 60 * 1000

    const createdSlots = []

    // For each interviewer
    for (const interviewerId of interviewerIds) {
      let currentSlotStart = new Date(startDateTime)

      // Generate slots
      while (currentSlotStart.getTime() + durationMs <= endDateTime.getTime()) {
        const currentSlotEnd = new Date(currentSlotStart.getTime() + durationMs)

        const slot = await prisma.interviewSlot.create({
          data: {
            stepId: BigInt(params.roundId),
            interviewerId: BigInt(interviewerId),
            startsAt: currentSlotStart,
            endsAt: currentSlotEnd,
            capacity: capacity || 1,
            createdAt: BigInt(Date.now()),
            updatedAt: BigInt(Date.now())
          }
        })

        createdSlots.push(slot)

        // Move to next slot (add duration + buffer)
        currentSlotStart = new Date(currentSlotEnd.getTime() + bufferMs)
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: createdSlots.length,
      message: `Created ${createdSlots.length} slots`
    })
  } catch (error) {
    console.error("Error creating slots:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
