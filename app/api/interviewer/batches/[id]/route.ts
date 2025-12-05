import { NextRequest, NextResponse } from "next/server"
import { requireInterviewer } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { getBatchById } from "@/lib/services/batch-service"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireInterviewer()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const batchId = BigInt(params.id)
    const interviewerId = BigInt(user.id)

    // Verify batch is assigned to this interviewer
    const batch = await (prisma as any).batch.findUnique({
      where: { id: batchId },
      include: {
        workflowStep: {
          select: {
            interviewerId: true
          }
        }
      }
    })

    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      )
    }

    if (batch.workflowStep.interviewerId?.toString() !== interviewerId.toString()) {
      return NextResponse.json(
        { error: "You are not assigned to this batch" },
        { status: 403 }
      )
    }

    const batchDetails = await getBatchById(batchId)

    if (!batchDetails) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      batch: {
        id: batchDetails.id.toString(),
        jobId: batchDetails.jobId.toString(),
        workflowStepId: batchDetails.workflowStepId.toString(),
        batchNumber: batchDetails.batchNumber,
        batchName: batchDetails.batchName,
        status: batchDetails.status,
        candidates: batchDetails.candidates.map(c => ({
          id: c.id.toString(),
          candidateId: c.candidateId.toString(),
          applicationId: c.applicationId.toString(),
          currentStatus: c.currentStatus,
          candidate: {
            id: c.candidate.id.toString(),
            firstname: c.candidate.firstname,
            lastname: c.candidate.lastname,
            email: c.candidate.email
          },
          application: {
            id: c.application.id.toString(),
            profile: {
              name: `${c.candidate.firstname} ${c.candidate.lastname}`,
              email: c.candidate.email
            }
          }
        }))
      }
    })
  } catch (error: any) {
    console.error("Error fetching batch:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch batch" },
      { status: 500 }
    )
  }
}

