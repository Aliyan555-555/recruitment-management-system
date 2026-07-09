import { NextRequest, NextResponse } from "next/server"
import { requireCandidate } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { submitSkillAssessmentSchema } from "@/lib/validations"
import {
  expireStaleInProgressAttempts,
  getAttemptEligibilityState,
  getCompletedAttemptCount,
  isTerminalStatus,
} from "@/lib/assessments/attempt-rules"
import { getSkillAssessmentConfig } from "@/lib/assessments/config"
import {
  hasPassedAssessment,
  mapScoreToLevel,
  scoreAnswers,
} from "@/lib/assessments/scoring"
import {
  getCandidateResultMessage,
  serializeAssessmentSummary,
} from "@/lib/assessments/serializers"
import { notifySkillAssessmentResult } from "@/lib/notifications"
import { sendSkillAssessmentResultEmail } from "@/lib/email"
import {
  assessmentConfigUnavailableResponse,
  isAssessmentConfigError,
} from "@/lib/assessments/api-errors"

export const runtime = "nodejs"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireCandidate()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Candidate access required" },
        { status: 401 }
      )
    }

    const assessmentId = BigInt(params.id)
    const userId = BigInt(user.id)
    const now = BigInt(Math.floor(Date.now() / 1000))

    const body = await req.json()
    const validation = submitSkillAssessmentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message ?? "Invalid request body" },
        { status: 400 }
      )
    }

    const assessment = await prisma.skillAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    })

    if (!assessment || assessment.userId !== userId) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
    }

    if (isTerminalStatus(assessment.status)) {
      return NextResponse.json({
        success: true,
        assessment: serializeAssessmentSummary(assessment),
        message: getCandidateResultMessage(assessment.status, assessment.level),
        canReattempt: false,
      })
    }

    if (assessment.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Assessment cannot be submitted in its current state" },
        { status: 400 }
      )
    }

    const existingAnswers = await prisma.assessmentAnswer.count({
      where: { assessmentId },
    })

    if (existingAnswers > 0) {
      const finalized = await prisma.skillAssessment.findUnique({
        where: { id: assessmentId },
      })

      if (finalized && isTerminalStatus(finalized.status)) {
        return NextResponse.json({
          success: true,
          assessment: serializeAssessmentSummary(finalized),
          message: getCandidateResultMessage(finalized.status, finalized.level),
          canReattempt: false,
        })
      }

      return NextResponse.json(
        { error: "Assessment has already been submitted" },
        { status: 409 }
      )
    }

    if (assessment.expiresAt && now > assessment.expiresAt) {
      await prisma.skillAssessment.update({
        where: { id: assessmentId },
        data: {
          status: "EXPIRED",
          updatedAt: now,
        },
      })

      return NextResponse.json(
        { error: "This assessment session has expired. Please start a new attempt." },
        { status: 410 }
      )
    }

    const submittedQuestionIds = new Set(validation.data.answers.map((a) => a.questionId))
    if (submittedQuestionIds.size !== assessment.questions.length) {
      return NextResponse.json(
        { error: "All assessment questions must be answered exactly once" },
        { status: 400 }
      )
    }

    const questionMap = new Map(
      assessment.questions.map((question) => [question.id.toString(), question])
    )

    for (const answer of validation.data.answers) {
      const question = questionMap.get(answer.questionId)
      if (!question) {
        return NextResponse.json({ error: "Invalid question in submission" }, { status: 400 })
      }

      const options = question.options as string[]
      if (!options.includes(answer.selectedOption)) {
        return NextResponse.json({ error: "Invalid answer option submitted" }, { status: 400 })
      }
    }

    const scored = scoreAnswers(
      validation.data.answers.map((answer) => {
        const question = questionMap.get(answer.questionId)!
        return {
          questionId: question.id,
          selectedOption: answer.selectedOption,
          correctOption: question.correctOption,
          points: question.points,
        }
      })
    )

    const config = await getSkillAssessmentConfig(assessment.skillName)
    const passed = hasPassedAssessment(scored.scoredPoints, assessment.minPoints)
    const level = passed
      ? mapScoreToLevel(scored.scoredPoints, assessment.maxPoints, config.levelThresholds)
      : null
    const finalStatus = passed ? "PASSED" : "FAILED"

    const updatedAssessment = await prisma.$transaction(async (tx) => {
      await tx.assessmentAnswer.createMany({
        data: scored.results.map((result) => ({
          assessmentId,
          questionId: result.questionId,
          selectedOption: result.selectedOption,
          isCorrect: result.isCorrect,
          pointsAwarded: result.pointsAwarded,
          createdAt: now,
        })),
      })

      const savedAssessment = await tx.skillAssessment.update({
        where: { id: assessmentId },
        data: {
          status: finalStatus,
          scoredPoints: scored.scoredPoints,
          level,
          submittedAt: now,
          updatedAt: now,
        },
      })

      if (passed && level) {
        await tx.userSkills.update({
          where: { id: assessment.userSkillId },
          data: {
            verifiedLevel: level,
            verifiedAt: now,
            lastAssessmentId: assessmentId,
            updatedAt: BigInt(Date.now()),
          },
        })
      } else {
        await tx.userSkills.update({
          where: { id: assessment.userSkillId },
          data: {
            lastAssessmentId: assessmentId,
            updatedAt: BigInt(Date.now()),
          },
        })
      }

      return savedAssessment
    })

    try {
      await notifySkillAssessmentResult(
        assessment.userId,
        assessment.skillName,
        passed,
        level,
        assessmentId
      )

      await sendSkillAssessmentResultEmail(
        assessment.user.email,
        `${assessment.user.firstname} ${assessment.user.lastname}`,
        assessment.skillName,
        passed,
        level,
        scored.scoredPoints,
        assessment.maxPoints
      )
    } catch (notificationError) {
      console.error("Skill assessment notification error:", notificationError)
    }

    await expireStaleInProgressAttempts(
      assessment.userSkillId,
      config.attemptTimeoutMinutes,
      now
    )

    const completedAttempts = await getCompletedAttemptCount(assessment.userSkillId)

    const userSkill = await prisma.userSkills.findUnique({
      where: { id: assessment.userSkillId },
      select: { verifiedLevel: true },
    })

    const eligibility = await getAttemptEligibilityState(
      assessment.userSkillId,
      config,
      now,
      userSkill?.verifiedLevel ?? null
    )

    const canReattempt =
      !passed &&
      completedAttempts < config.maxAttempts &&
      !eligibility.cooldownActive

    return NextResponse.json({
      success: true,
      assessment: serializeAssessmentSummary(updatedAssessment),
      passed,
      message: getCandidateResultMessage(finalStatus, level),
      canReattempt,
      cooldownEndsAt: eligibility.cooldownActive
        ? eligibility.cooldownEndsAt?.toString() ?? null
        : null,
    })
  } catch (error) {
    if (isAssessmentConfigError(error)) {
      return assessmentConfigUnavailableResponse()
    }

    console.error("Submit skill assessment error:", error)
    return NextResponse.json(
      { error: "Failed to submit skill assessment" },
      { status: 500 }
    )
  }
}
