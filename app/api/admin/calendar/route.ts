import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: any = {}
    if (startDate && endDate) {
      where.startsAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    // Fetch all interview slots with related data
    const slots = await (prisma as any).interviewSlot.findMany({
      where,
      include: {
        interviewer: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true
          }
        },
        step: {
          include: {
            workflow: {
              include: {
                job: {
                  select: {
                    id: true,
                    title: true,
                    company: true
                  }
                }
              }
            }
          }
        },
        bookings: {
          where: {
            status: "RESERVED"
          },
          include: {
            candidate: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true
              }
            },
            application: {
              include: {
                job: {
                  select: {
                    title: true,
                    company: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        startsAt: "asc"
      }
    })

    return NextResponse.json({
      slots: slots.map((slot: any) => {
        const metadata = (slot.step?.stepMetadata as any) || {}
        return {
          id: slot.id.toString(),
          stepId: slot.stepId.toString(),
          stepName: slot.step?.stepName || "Unknown Step",
          startsAt: slot.startsAt.toISOString(),
          endsAt: slot.endsAt.toISOString(),
          capacity: slot.capacity,
          isBlocked: slot.isBlocked,
          interviewer: slot.interviewer ? {
            id: slot.interviewer.id.toString(),
            name: `${slot.interviewer.firstname} ${slot.interviewer.lastname}`,
            email: slot.interviewer.email
          } : null,
          job: slot.step?.workflow?.job ? {
            id: slot.step.workflow.job.id.toString(),
            title: slot.step.workflow.job.title,
            company: slot.step.workflow.job.company
          } : null,
          bookings: slot.bookings.map((booking: any) => ({
            id: booking.id.toString(),
            candidate: {
              id: booking.candidate.id.toString(),
              name: `${booking.candidate.firstname} ${booking.candidate.lastname}`,
              email: booking.candidate.email
            },
            status: booking.status,
            bookedAt: booking.createdAt.toString()
          })),
          meetingLink: metadata.meetingLink,
          interviewMode: metadata.interviewMode
        }
      })
    })
  } catch (error: any) {
    console.error("Error fetching calendar slots:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch calendar data" },
      { status: 500 }
    )
  }
}

