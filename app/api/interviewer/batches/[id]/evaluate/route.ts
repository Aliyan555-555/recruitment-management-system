import { NextRequest, NextResponse } from "next/server"
import { requireInterviewer } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { processBatchEvaluation } from "@/lib/services/bulk-hiring-service"

export async function POST(
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
    const body = await req.json()
    const { evaluations } = body

    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      return NextResponse.json(
        { error: "evaluations array is required" },
        { status: 400 }
      )
    }

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

    // Validate evaluations
    for (const evalData of evaluations) {
      if (!evalData.candidateId) {
        return NextResponse.json(
          { error: "Each evaluation must have candidateId" },
          { status: 400 }
        )
      }

      if (!["SELECTED", "REJECTED", "REVIEW"].includes(evalData.status)) {
        return NextResponse.json(
          { error: `Invalid status: ${evalData.status}. Must be SELECTED, REJECTED, or REVIEW` },
          { status: 400 }
        )
      }
    }

    // Process evaluations
    await processBatchEvaluation(
      batchId,
      evaluations.map((e: any) => ({
        candidateId: BigInt(e.candidateId),
        status: e.status,
        feedback: e.feedback,
        rating: e.rating
      })),
      interviewerId
    )

    // Update batch status to IN_PROGRESS if it was PENDING_ADMIN
    if (batch.status === "PENDING_ADMIN") {
      await (prisma as any).batch.update({
        where: { id: batchId },
        data: {
          status: "IN_PROGRESS",
          updatedAt: BigInt(Math.floor(Date.now() / 1000))
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: "Evaluations submitted successfully"
    })
  } catch (error: any) {
    console.error("Error submitting batch evaluation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to submit evaluation" },
      { status: 500 }
    )
  }
}

