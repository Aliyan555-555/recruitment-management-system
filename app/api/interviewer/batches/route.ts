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
    const status = searchParams.get("status") || "IN_PROGRESS"

    // Get batches assigned to this interviewer's workflow steps
    const batches = await (prisma as any).batch.findMany({
      where: {
        status: status,
        workflowStep: {
          interviewerId: interviewerId
        }
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true
          }
        },
        workflowStep: {
          select: {
            id: true,
            stepName: true,
            stepOrder: true
          }
        },
        _count: {
          select: {
            batchCandidates: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json({
      batches: batches.map((b: any) => ({
        id: b.id.toString(),
        job: {
          id: b.job.id.toString(),
          title: b.job.title,
          company: b.job.company
        },
        workflowStep: {
          id: b.workflowStep.id.toString(),
          stepName: b.workflowStep.stepName,
          stepOrder: b.workflowStep.stepOrder
        },
        batchNumber: b.batchNumber,
        batchName: b.batchName,
        status: b.status,
        candidateCount: b._count.batchCandidates
      }))
    })
  } catch (error: any) {
    console.error("Error fetching interviewer batches:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch batches" },
      { status: 500 }
    )
  }
}

