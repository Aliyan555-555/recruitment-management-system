import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  getCandidateResultMessage,
  serializeAssessmentQuestion,
  serializeAssessmentSummary,
} from "@/lib/assessments/serializers"
import { calculateScorePercentage } from "@/lib/assessments/scoring"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const assessmentId = BigInt(params.id)
    const role = session.user.role
    const isAdmin = role === "ADMIN"

    if (role !== "ADMIN" && role !== "CANDIDATE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const assessment = await prisma.skillAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            question: true,
            options: true,
            points: true,
            order: true,
          },
        },
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    })

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
    }

    if (!isAdmin && assessment.userId !== BigInt(session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const answers = isAdmin
      ? await prisma.assessmentAnswer.findMany({
          where: { assessmentId },
          select: {
            questionId: true,
            selectedOption: true,
            isCorrect: true,
            pointsAwarded: true,
          },
        })
      : []

    return NextResponse.json({
      assessment: {
        ...serializeAssessmentSummary(assessment),
        message: getCandidateResultMessage(
          assessment.status,
          calculateScorePercentage(assessment.scoredPoints, assessment.maxPoints)
        ),
        candidate: {
          id: assessment.user.id.toString(),
          name: `${assessment.user.firstname} ${assessment.user.lastname}`,
          email: assessment.user.email,
        },
        questions: assessment.questions.map(serializeAssessmentQuestion),
        answers: isAdmin
          ? answers.map((answer) => ({
              questionId: answer.questionId.toString(),
              selectedOption: answer.selectedOption,
              isCorrect: answer.isCorrect,
              pointsAwarded: answer.pointsAwarded,
            }))
          : undefined,
      },
    })
  } catch (error) {
    console.error("Get skill assessment error:", error)
    return NextResponse.json(
      { error: "Failed to fetch skill assessment" },
      { status: 500 }
    )
  }
}
