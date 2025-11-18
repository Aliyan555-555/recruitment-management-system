import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { getBatchById, updateBatchStatus } from "@/lib/services/batch-service"
import { advanceToNextBatchStep } from "@/lib/services/bulk-hiring-service"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const batchId = BigInt(params.id)
    const batch = await getBatchById(batchId)

    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      batch: {
        id: batch.id.toString(),
        jobId: batch.jobId.toString(),
        workflowStepId: batch.workflowStepId.toString(),
        batchNumber: batch.batchNumber,
        batchName: batch.batchName,
        status: batch.status,
        candidates: batch.candidates.map(c => ({
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
            cv: c.application.cv ? {
              id: c.application.cv.id.toString(),
              filename: c.application.cv.filename,
              filepath: c.application.cv.filepath
            } : null
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

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const batchId = BigInt(params.id)
    const body = await req.json()
    const { status, batchName } = body

    if (status) {
      if (!["PENDING_ADMIN", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        )
      }
      await updateBatchStatus(batchId, status)
    }

    if (batchName !== undefined) {
      await (prisma as any).batch.update({
        where: { id: batchId },
        data: {
          batchName: batchName || null,
          updatedAt: BigInt(Math.floor(Date.now() / 1000))
        }
      })
    }

    return NextResponse.json({
      success: true
    })
  } catch (error: any) {
    console.error("Error updating batch:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update batch" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const currentBatchId = BigInt(params.id)
    const body = await req.json()
    const { nextStepId, candidateOverrides } = body

    if (!nextStepId) {
      return NextResponse.json(
        { error: "nextStepId is required" },
        { status: 400 }
      )
    }

    // Get current batch to find jobId
    const currentBatch = await (prisma as any).batch.findUnique({
      where: { id: currentBatchId },
      select: {
        jobId: true
      }
    })

    if (!currentBatch) {
      return NextResponse.json(
        { error: "Current batch not found" },
        { status: 404 }
      )
    }

    const candidateOverridesBig = candidateOverrides
      ? candidateOverrides.map((id: string) => BigInt(id))
      : undefined

    const nextBatchId = await advanceToNextBatchStep(
      currentBatch.jobId,
      currentBatchId,
      BigInt(nextStepId),
      BigInt(user.id),
      candidateOverridesBig
    )

    return NextResponse.json({
      success: true,
      nextBatchId: nextBatchId.toString()
    })
  } catch (error: any) {
    console.error("Error creating next batch:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create next batch" },
      { status: 500 }
    )
  }
}

