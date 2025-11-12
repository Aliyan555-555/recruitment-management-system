import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = BigInt(session.user.id)
    const userRole = session.user.role

    const now = new Date()

    if (userRole === "CANDIDATE") {
      // Get upcoming booked slots for candidate
      const bookings = await (prisma as any).slotBooking.findMany({
        where: {
          candidateId: userId,
          status: "RESERVED",
          slot: {
            startsAt: { gt: now }
          }
        },
        include: {
          slot: {
            include: {
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
              interviewer: {
                select: {
                  firstname: true,
                  lastname: true,
                  email: true
                }
              }
            }
          },
          application: {
            include: {
              job: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        },
        orderBy: {
          slot: {
            startsAt: "asc"
          }
        },
        take: 10
      })

      return NextResponse.json({
        upcoming: bookings.map((booking: any) => {
          const slot = booking.slot
          const metadata = (slot.step.stepMetadata as any) || {}
          
          return {
            bookingId: booking.id.toString(),
            slotId: slot.id.toString(),
            stepId: slot.step.id.toString(),
            stepName: slot.step.stepName,
            stepOrder: slot.step.stepOrder,
            startsAt: slot.startsAt.toISOString(),
            endsAt: slot.endsAt.toISOString(),
            meetingLink: metadata.meetingLink,
            interviewerName: slot.interviewer ? `${slot.interviewer.firstname} ${slot.interviewer.lastname}` : null,
            jobTitle: slot.step.workflow.job.title,
            jobCompany: slot.step.workflow.job.company,
            jobId: slot.step.workflow.job.id.toString(),
            applicationId: booking.application.id.toString()
          }
        })
      })
    } else if (userRole === "INTERVIEWER") {
      // Get upcoming slots with bookings for interviewer
      const slots = await (prisma as any).interviewSlot.findMany({
        where: {
          interviewerId: userId,
          startsAt: { gt: now },
          isBlocked: false
        },
        include: {
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
              }
            }
          }
        },
        orderBy: {
          startsAt: "asc"
        },
        take: 20
      })

      return NextResponse.json({
        upcoming: slots.map((slot: any) => {
          const metadata = (slot.step.stepMetadata as any) || {}
          
          return {
            slotId: slot.id.toString(),
            stepId: slot.step.id.toString(),
            stepName: slot.step.stepName,
            stepOrder: slot.step.stepOrder,
            startsAt: slot.startsAt.toISOString(),
            endsAt: slot.endsAt.toISOString(),
            meetingLink: metadata.meetingLink,
            jobTitle: slot.step.workflow.job.title,
            jobCompany: slot.step.workflow.job.company,
            jobId: slot.step.workflow.job.id.toString(),
            bookings: slot.bookings.map((booking: any) => ({
              bookingId: booking.id.toString(),
              candidateName: `${booking.candidate.firstname} ${booking.candidate.lastname}`,
              candidateEmail: booking.candidate.email
            }))
          }
        })
      })
    } else {
      return NextResponse.json({ error: "Invalid role" }, { status: 403 })
    }
  } catch (error: any) {
    console.error("Error fetching upcoming interviews:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch upcoming interviews" },
      { status: 500 }
    )
  }
}

