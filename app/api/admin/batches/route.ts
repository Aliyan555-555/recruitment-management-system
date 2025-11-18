import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { createBatch, getBatchesForStep } from "@/lib/services/batch-service"

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { jobId, workflowStepId, candidateIds, batchNumber, batchName } = body

    if (!jobId || !workflowStepId || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json(
        { error: "jobId, workflowStepId, and candidateIds array are required" },
        { status: 400 }
      )
    }

    const batchId = await createBatch({
      jobId: BigInt(jobId),
      workflowStepId: BigInt(workflowStepId),
      candidateIds: candidateIds.map((id: string) => BigInt(id)),
      batchNumber: batchNumber || 1,
      batchName: batchName || null,
      createdBy: BigInt(user.id)
    })

    return NextResponse.json({
      success: true,
      batchId: batchId.toString()
    })
  } catch (error: any) {
    console.error("Error creating batch:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create batch" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get("jobId")
    const stepId = searchParams.get("stepId")

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      )
    }

    if (stepId) {
      // Get batches for specific step
      const batches = await getBatchesForStep(
        BigInt(jobId),
        BigInt(stepId)
      )

      return NextResponse.json({
        batches: batches.map(b => ({
          id: b.id.toString(),
          batchNumber: b.batchNumber,
          batchName: b.batchName,
          status: b.status,
          candidateCount: b.candidateCount
        }))
      })
    }

    // Get all batches for job
    const batches = await (prisma as any).batch.findMany({
      where: {
        jobId: BigInt(jobId)
      },
      include: {
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
      orderBy: [
        { workflowStep: { stepOrder: "asc" } },
        { batchNumber: "asc" }
      ]
    })

    return NextResponse.json({
      batches: batches.map((b: any) => ({
        id: b.id.toString(),
        workflowStepId: b.workflowStepId.toString(),
        stepName: b.workflowStep.stepName,
        stepOrder: b.workflowStep.stepOrder,
        batchNumber: b.batchNumber,
        batchName: b.batchName,
        status: b.status,
        candidateCount: b._count.batchCandidates
      }))
    })
  } catch (error: any) {
    console.error("Error fetching batches:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch batches" },
      { status: 500 }
    )
  }
}

