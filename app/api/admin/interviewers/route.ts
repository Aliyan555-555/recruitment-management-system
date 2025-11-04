import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const interviewers = await prisma.user.findMany({
      where: {
        role: "INTERVIEWER"
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        phone1: true,
        department: true,
        institution: true,
        _count: {
          select: {
            stepInterviewer: true,
            stepInterviewerInstance: {
              where: {
                pipeline: {
                  overallStatus: "IN_PROGRESS"
                }
              }
            }
          }
        }
      },
      orderBy: {
        firstname: 'asc'
      }
    })

    return NextResponse.json({
      interviewers: interviewers.map(interviewer => ({
        id: interviewer.id.toString(),
        firstname: interviewer.firstname,
        lastname: interviewer.lastname,
        email: interviewer.email,
        phone1: interviewer.phone1,
        department: interviewer.department,
        institution: interviewer.institution,
        workload: {
          assignedSteps: interviewer._count.stepInterviewer,
          activeCandidates: interviewer._count.stepInterviewerInstance
        }
      }))
    })
  } catch (error: any) {
    console.error("Error fetching interviewers:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch interviewers" },
      { status: 500 }
    )
  }
}

