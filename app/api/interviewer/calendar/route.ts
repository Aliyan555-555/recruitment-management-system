import { NextRequest, NextResponse } from "next/server"
import { requireInterviewer } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const user = await requireInterviewer()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const interviewerId = BigInt(user.id)
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get("start")
    const endDate = searchParams.get("end")

    const where: any = {
      interviewerId: interviewerId
    }

    if (startDate && endDate) {
      where.startsAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const slots = await prisma.interviewSlot.findMany({
      where,
      include: {
        bookings: {
          include: {
            candidate: {
              select: {
                firstname: true,
                lastname: true,
                email: true
              }
            }
          }
        },
        step: {
          select: {
            stepName: true
          }
        }
      },
      orderBy: {
        startsAt: "asc"
      }
    })

    return NextResponse.json({
      slots: slots.map(slot => ({
        id: slot.id.toString(),
        startsAt: slot.startsAt.toString(),
        endsAt: slot.endsAt.toString(),
        stepName: slot.step.stepName,
        bookings: slot.bookings.map(booking => ({
          id: booking.id.toString(),
          candidateName: `${booking.candidate.firstname} ${booking.candidate.lastname}`,
          candidateEmail: booking.candidate.email
        }))
      }))
    })
  } catch (error: any) {
    console.error("Error fetching interviewer calendar:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch calendar data" },
      { status: 500 }
    )
  }
}

