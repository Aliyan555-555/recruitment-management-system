import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/rbac"
import { aggregateEvaluations } from "@/lib/evaluations/scoring"

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

    // Get current workflow step to check stepOrder and stepType
    const currentWorkflowStep = await prisma.workflowStep.findUnique({
      where: { id: BigInt(params.roundId) },
      select: { stepOrder: true, stepType: true }
    })

    if (!currentWorkflowStep) {
      return NextResponse.json({ error: "Workflow step not found" }, { status: 404 })
    }

    const isFocusGroup = currentWorkflowStep.stepType === "FOCUS_GROUP"

    const pipelineSteps = await prisma.candidatePipelineStep.findMany({
      where: {
        workflowStepId: BigInt(params.roundId),
        pipeline: {
          jobId: BigInt(params.id),
        },
        status: { in: ["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"] }
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
            evaluator: {
              select: {
                firstname: true,
                lastname: true,
              }
            }
          }
        },
        workflowStep: {
          select: {
            stepOrder: true
          }
        }
      }
    })

    const candidates = pipelineSteps.map(step => {
      // Every interviewer's submitted scorecard counts; the result is their average + majority vote
      const submittedEvals = step.stageEvaluations.filter(e => e.submittedAt !== null)
      const agg = aggregateEvaluations(
        step.stageEvaluations.map(e => ({
          submittedAt: e.submittedAt,
          recommendation: e.recommendation,
          formData: e.formData,
        }))
      )
      const evaluation = submittedEvals[0] ?? step.stageEvaluations[0]
      const totalScore = agg.score
      const maxScore = agg.maxScore
      const scorePercentage = agg.scorePercentage
      const recommendation: string | null = agg.recommendation

      const status =
        step.status === "COMPLETED"
          ? "COMPLETED"
          : step.status === "REJECTED"
          ? "REJECTED"
          : step.status === "IN_PROGRESS"
          ? "IN_PROGRESS"
          : "PENDING"

      // Check if candidate has moved beyond this step
      const movedToNext = step.pipeline.currentStepOrder > currentWorkflowStep.stepOrder

      return {
        id: step.pipeline.candidate.id.toString(),
        name: `${step.pipeline.candidate.firstname} ${step.pipeline.candidate.lastname}`,
        email: step.pipeline.candidate.email,
        score: totalScore,
        maxScore,
        scorePercentage,
        recommendation,
        status,
        movedToNext,
        evaluator: evaluation?.evaluator ? {
          firstname: evaluation.evaluator.firstname,
          lastname: evaluation.evaluator.lastname
        } : null,
        assessedAt: evaluation?.submittedAt?.toString(),
        evaluatorCount: submittedEvals.length,
        isSplit: agg.isSplit,
        hireVotes: agg.hireVotes,
        noHireVotes: agg.noHireVotes,
      }
    })

    // Calculate statistics - count all candidates who went through this round
    const total = candidates.length
    const completed = candidates.filter(c => c.status === "COMPLETED").length
    const rejected = candidates.filter(c => c.status === "REJECTED").length
    const pending = candidates.filter(c => c.status === "PENDING").length
    const inProgress = candidates.filter(c => c.status === "IN_PROGRESS").length
    
    // Passed/Failed based on recommendation or completion
    const passed = candidates.filter(c => c.recommendation === "HIRE" || (c.status === "COMPLETED" && c.recommendation !== "NO_HIRE")).length
    const failed = candidates.filter(c => c.recommendation === "NO_HIRE" || c.status === "REJECTED").length

    const scoresWithValues = candidates.filter(c => c.score !== undefined && c.score !== null)
    const averageScore = scoresWithValues.length > 0
      ? Math.round((scoresWithValues.reduce((sum, c) => sum + (c.score || 0), 0) / scoresWithValues.length) * 10) / 10
      : 0

    const stats = {
      total,
      pending,
      inProgress,
      completed,
      rejected,
      passed,
      failed,
      averageScore
    }

    return NextResponse.json({ candidates, stats })
  } catch (error) {
    console.error("Error fetching results:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
