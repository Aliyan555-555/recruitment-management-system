import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/rbac"

const DEFAULT_SKILL_MAX: Record<string, number> = {
  appearance: 10,
  education: 10,
  intellectual: 10,
  leadership: 10,
  principles: 10,
  itSkills: 10,
  communication: 10,
  commitment: 10,
  assertiveness: 10,
  versatility: 10,
  professionalKnowledge: 25,
  experience: 25
}

function calculateScore(formData: any, storedScore?: number | null) {
  if (!formData) {
    const maxScore = Object.values(DEFAULT_SKILL_MAX).reduce((sum, v) => sum + v, 0)
    const totalScore = storedScore ?? 0
    const scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
    return { totalScore, maxScore, scorePercentage, recommendation: null as string | null }
  }

  let totalScore = 0
  let maxScore = 0

  Object.entries(DEFAULT_SKILL_MAX).forEach(([key, defaultMax]) => {
    const rating = Number(formData?.skills?.[key]?.rating ?? 0)
    const max = Number(formData?.skills?.[key]?.max ?? defaultMax)
    totalScore += rating
    maxScore += max
  })

  const scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
  const recommendedToHire =
    formData.recommendedToHire === "Recommended" ||
    formData.recommendedToHire === "yes" ||
    formData.recommendedToHire === "HIRE"
  const recommendation = recommendedToHire ? "HIRE" : "NO_HIRE"

  return { totalScore, maxScore, scorePercentage, recommendation }
}

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
          // Only show candidates who are still at this step or earlier
          currentStepOrder: { lte: currentWorkflowStep.stepOrder }
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
            interviewer: {
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
      const evaluation = step.stageEvaluations[0]
      const formData = evaluation?.formData as any
      
      let totalScore = 0
      let maxScore = 0
      let scorePercentage = 0
      let recommendation: string | null = null

      if (isFocusGroup && formData?.focusGroup) {
        // For focus group, aggregate internal and external scores
        const internal = formData.focusGroup.internal
        const external = formData.focusGroup.external
        
        const internalScore = internal?.score || 0
        const internalMax = internal?.maxScore || 0
        const externalScore = external?.score || 0
        const externalMax = external?.maxScore || 0
        
        totalScore = internalScore + externalScore
        maxScore = internalMax + externalMax
        scorePercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
        
        // Both assessments must be completed for focus group
        const bothCompleted = internal?.submittedAt && external?.submittedAt
        recommendation = bothCompleted ? (scorePercentage >= 50 ? "HIRE" : "NO_HIRE") : null
      } else {
        // For other assessment types, use the existing calculateScore function
        const result = calculateScore(formData, evaluation?.score)
        totalScore = result.totalScore
        maxScore = result.maxScore
        scorePercentage = result.scorePercentage
        recommendation = evaluation?.recommendation || result.recommendation
      }

      const status =
        step.status === "COMPLETED"
          ? "PASSED"
          : step.status === "REJECTED"
          ? "FAILED"
          : step.status === "IN_PROGRESS"
          ? "IN_PROGRESS"
          : "PENDING"

      return {
        id: step.pipeline.candidate.id.toString(),
        name: `${step.pipeline.candidate.firstname} ${step.pipeline.candidate.lastname}`,
        email: step.pipeline.candidate.email,
        score: totalScore,
        maxScore,
        scorePercentage,
        recommendation,
        status,
        interviewer: evaluation?.interviewer
          ? `${evaluation.interviewer.firstname} ${evaluation.interviewer.lastname}`
          : undefined,
        assessedAt: evaluation?.submittedAt?.toString(),
      }
    })

    // Calculate statistics
    const total = candidates.length
    const passed = candidates.filter(c => c.recommendation === "HIRE" || c.status === "PASSED").length
    const failed = candidates.filter(c => c.recommendation === "NO_HIRE" || c.status === "FAILED").length
    const pending = candidates.filter(c => c.status === "PENDING").length
    const inProgress = candidates.filter(c => c.status === "IN_PROGRESS").length
    const completed = candidates.filter(c => c.status === "PASSED").length
    const rejected = candidates.filter(c => c.status === "FAILED").length

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
