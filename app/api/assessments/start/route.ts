import { NextRequest, NextResponse } from "next/server"
import { requireCandidate } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { startSkillAssessmentSchema } from "@/lib/validations"
import { getSkillAssessmentConfig } from "@/lib/assessments/config"
import { validateAttemptEligibility } from "@/lib/assessments/attempt-rules"
import {
  AssessmentGenerationError,
  generateSkillQuestions,
} from "@/lib/ai/assessment-generator"
import { serializeAssessmentQuestion } from "@/lib/assessments/serializers"
import { checkRateLimit } from "@/lib/rate-limit"
import {
  assessmentConfigUnavailableResponse,
  isAssessmentConfigError,
} from "@/lib/assessments/api-errors"
import { ASSESSMENT_START_RATE_LIMIT } from "@/lib/assessments/constants"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const user = await requireCandidate()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Candidate access required" },
        { status: 401 }
      )
    }

    const rateLimit = checkRateLimit(
      `assessment-start:${user.id}`,
      ASSESSMENT_START_RATE_LIMIT.maxRequests,
      ASSESSMENT_START_RATE_LIMIT.windowMs
    )

    if (rateLimit.limited) {
      return NextResponse.json(
        {
          error: "Too many assessment start requests. Please try again later.",
          code: "RATE_LIMITED",
          resetTime: rateLimit.resetTime,
        },
        { status: 429 }
      )
    }

    const body = await req.json()
    const validation = startSkillAssessmentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid request body" },
        { status: 400 }
      )
    }

    const userSkillId = BigInt(validation.data.userSkillId)
    const userId = BigInt(user.id)
    const now = BigInt(Math.floor(Date.now() / 1000))

    const userSkill = await prisma.userSkills.findUnique({
      where: { id: userSkillId },
    })

    if (!userSkill || userSkill.userId !== userId) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 })
    }

    const config = await getSkillAssessmentConfig(userSkill.skillName)
    const eligibility = await validateAttemptEligibility(userSkillId, config, now)

    if (!eligibility.allowed) {
      return NextResponse.json({ error: eligibility.error }, { status: eligibility.status })
    }

    const generatedQuestions = await generateSkillQuestions(
      userSkill.skillName,
      config.questionCount,
      config.maxPoints
    )

    const attemptCount = await prisma.skillAssessment.count({
      where: { userSkillId },
    })

    const totalPoints = generatedQuestions.reduce((sum, question) => sum + question.points, 0)
    const expiresAt = now + BigInt(config.attemptTimeoutMinutes * 60)

    const assessment = await prisma.$transaction(async (tx) => {
      const activeAttempt = await tx.skillAssessment.findFirst({
        where: {
          userSkillId,
          status: "IN_PROGRESS",
        },
      })

      if (activeAttempt) {
        throw new Error("IN_PROGRESS_EXISTS")
      }

      const createdAssessment = await tx.skillAssessment.create({
        data: {
          userSkillId,
          userId,
          skillName: userSkill.skillName,
          status: "IN_PROGRESS",
          attemptNumber: attemptCount + 1,
          minPoints: config.minPassPoints,
          maxPoints: config.maxPoints,
          totalPoints,
          startedAt: now,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        },
      })

      await tx.assessmentQuestion.createMany({
        data: generatedQuestions.map((question, index) => ({
          assessmentId: createdAssessment.id,
          question: question.question,
          options: question.options,
          correctOption: question.correct,
          points: question.points,
          order: index + 1,
        })),
      })

      await tx.userSkills.update({
        where: { id: userSkillId },
        data: {
          lastAssessmentId: createdAssessment.id,
          updatedAt: BigInt(Date.now()),
        },
      })

      return createdAssessment
    })

    const questions = await prisma.assessmentQuestion.findMany({
      where: { assessmentId: assessment.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        question: true,
        options: true,
        points: true,
        order: true,
      },
    })

    return NextResponse.json({
      success: true,
      assessment: {
        id: assessment.id.toString(),
        userSkillId: assessment.userSkillId.toString(),
        skillName: assessment.skillName,
        status: assessment.status,
        attemptNumber: assessment.attemptNumber,
        minPoints: assessment.minPoints,
        maxPoints: assessment.maxPoints,
        totalPoints: assessment.totalPoints,
        startedAt: assessment.startedAt.toString(),
        expiresAt: assessment.expiresAt?.toString() ?? null,
      },
      questions: questions.map(serializeAssessmentQuestion),
    })
  } catch (error) {
    if (error instanceof Error && error.message === "IN_PROGRESS_EXISTS") {
      return NextResponse.json(
        { error: "You already have an assessment in progress for this skill" },
        { status: 409 }
      )
    }

    if (error instanceof AssessmentGenerationError) {
      return NextResponse.json(
        { error: "Unable to generate assessment questions right now. Please try again later." },
        { status: 502 }
      )
    }

    if (isAssessmentConfigError(error)) {
      return assessmentConfigUnavailableResponse()
    }

    console.error("Start skill assessment error:", error)
    return NextResponse.json(
      { error: "Failed to start skill assessment" },
      { status: 500 }
    )
  }
}
