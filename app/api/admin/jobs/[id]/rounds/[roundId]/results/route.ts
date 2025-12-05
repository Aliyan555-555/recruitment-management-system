import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/rbac"

// GET /api/admin/jobs/[id]/rounds/[roundId]/results - Get results for a round
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string } }
) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const pipelineSteps = await prisma.candidatePipelineStep.findMany({
      where: {
        workflowStepId: BigInt(params.roundId),
        pipeline: {
          jobId: BigInt(params.id)
        },
        status: { in: ["IN_PROGRESS", "COMPLETED", "REJECTED"] }
      },
      include: {
        pipeline: {
          include: {
            candidate: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
              }
            }
          }
        },
        stageEvaluations: {
          include: {
            interviewer: {
              select: {
                firstname: true,
                lastname: true,
              }
            }
          }
        }
      }
    })

    const candidates = pipelineSteps.map(step => {
      const evaluation = step.stageEvaluations[0]
      const passed = step.status === "COMPLETED"
      const failed = step.status === "REJECTED"
      
      return {
        id: step.pipeline.candidate.id.toString(),
        name: `${step.pipeline.candidate.firstname} ${step.pipeline.candidate.lastname}`,
        email: step.pipeline.candidate.email,
        assessmentScore: evaluation?.score,
        recommendation: evaluation?.recommendation,
        status: passed ? "PASSED" : failed ? "FAILED" : "PENDING",
        interviewer: evaluation?.interviewer ? 
          `${evaluation.interviewer.firstname} ${evaluation.interviewer.lastname}` : undefined,
        assessedAt: evaluation?.submittedAt?.toString(),
      }
    })

    // Calculate statistics
    const total = candidates.length
    const passed = candidates.filter(c => c.status === "PASSED").length
    const failed = candidates.filter(c => c.status === "FAILED").length
    const pending = candidates.filter(c => c.status === "PENDING").length
    
    const scoresWithValues = candidates.filter(c => c.assessmentScore !== undefined && c.assessmentScore !== null)
    const averageScore = scoresWithValues.length > 0
      ? scoresWithValues.reduce((sum, c) => sum + (c.assessmentScore || 0), 0) / scoresWithValues.length
      : 0

    const stats = {
      total,
      passed,
      failed,
      pending,
      averageScore
    }

    return NextResponse.json({ candidates, stats })
  } catch (error) {
    console.error("Error fetching results:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
