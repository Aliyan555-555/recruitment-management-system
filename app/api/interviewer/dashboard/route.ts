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

    // Fetch statistics in parallel
    const [
      totalAssignments,
      pendingAssignments,
      inProgressAssignments,
      completedAssignments,
      recentAssignments,
      upcomingInterviews
    ] = await Promise.all([
      // Total assignments
      prisma.candidatePipelineStep.count({
        where: {
          interviewerId: interviewerId
        }
      }),

      // Pending assignments
      prisma.candidatePipelineStep.count({
        where: {
          interviewerId: interviewerId,
          status: "PENDING"
        }
      }),

      // In progress assignments
      prisma.candidatePipelineStep.count({
        where: {
          interviewerId: interviewerId,
          status: "IN_PROGRESS"
        }
      }),

      // Completed assignments
      prisma.candidatePipelineStep.count({
        where: {
          interviewerId: interviewerId,
          status: "COMPLETED"
        }
      }),

      // Recent assignments (last 15)
      prisma.candidatePipelineStep.findMany({
        where: {
          interviewerId: interviewerId
        },
        take: 15,
        include: {
          workflowStep: {
            select: {
              id: true,
              stepName: true,
              stepOrder: true
            }
          },
          pipeline: {
            include: {
              job: {
                select: {
                  id: true,
                  title: true,
                  company: true
                }
              },
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
          id: "desc"
        }
      }),

      // Upcoming interviews (next 7 days)
      prisma.interviewSlot.findMany({
        where: {
          interviewerId: interviewerId,
          startsAt: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        },
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
        },
        take: 5
      })
    ])

    // Calculate completion rate
    const completionRate = totalAssignments > 0
      ? Math.round((completedAssignments / totalAssignments) * 100)
      : 0

    return NextResponse.json({
      stats: {
        totalAssignments,
        pendingAssignments,
        inProgressAssignments,
        completedAssignments,
        completionRate
      },
      recentAssignments: recentAssignments.map(a => ({
        id: a.id.toString(),
        status: a.status,
        stepOrder: a.stepOrder,
        workflowStep: {
          id: a.workflowStep.id.toString(),
          stepName: a.workflowStep.stepName,
          stepOrder: a.workflowStep.stepOrder
        },
        pipeline: {
          id: a.pipeline.id.toString(),
          job: {
            id: a.pipeline.job.id.toString(),
            title: a.pipeline.job.title,
            company: a.pipeline.job.company
          },
          candidate: {
            id: a.pipeline.candidate.id.toString(),
            name: `${a.pipeline.candidate.firstname} ${a.pipeline.candidate.lastname}`,
            email: a.pipeline.candidate.email
          }
        }
      })),
      upcomingInterviews: upcomingInterviews.map(slot => ({
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
    console.error("Error fetching interviewer dashboard stats:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard statistics" },
      { status: 500 }
    )
  }
}

