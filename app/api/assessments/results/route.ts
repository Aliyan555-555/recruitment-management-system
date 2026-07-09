import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import type { Prisma, VerifiedSkillLevel } from "@prisma/client"

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

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
    const page = Math.max(DEFAULT_PAGE, Number(searchParams.get("page") ?? DEFAULT_PAGE))
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(searchParams.get("limit") ?? DEFAULT_LIMIT))
    )
    const skill = searchParams.get("skill")?.trim()
    const level = searchParams.get("level")?.trim() as VerifiedSkillLevel | undefined
    const minScore = searchParams.get("minScore")
    const maxScore = searchParams.get("maxScore")
    const sort = searchParams.get("sort") ?? "submittedAt"
    const order = searchParams.get("order") === "asc" ? "asc" : "desc"

    const where: Prisma.SkillAssessmentWhereInput = {
      status: { in: ["PASSED", "FAILED"] },
    }

    if (skill) {
      where.skillName = { contains: skill, mode: "insensitive" }
    }

    if (level) {
      where.level = level
    }

    if (minScore || maxScore) {
      where.scoredPoints = {}
      if (minScore) {
        where.scoredPoints.gte = Number(minScore)
      }
      if (maxScore) {
        where.scoredPoints.lte = Number(maxScore)
      }
    }

    const orderBy: Prisma.SkillAssessmentOrderByWithRelationInput =
      sort === "score"
        ? { scoredPoints: order }
        : sort === "skill"
          ? { skillName: order }
          : sort === "level"
            ? { level: order }
            : { submittedAt: order }

    const [total, assessments] = await Promise.all([
      prisma.skillAssessment.count({ where }),
      prisma.skillAssessment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true,
            },
          },
          userSkill: {
            select: {
              id: true,
              verifiedLevel: true,
              verifiedAt: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      results: assessments.map((assessment) => ({
        id: assessment.id.toString(),
        candidateId: assessment.userId.toString(),
        candidateName: `${assessment.user.firstname} ${assessment.user.lastname}`,
        candidateEmail: assessment.user.email,
        userSkillId: assessment.userSkillId.toString(),
        skillName: assessment.skillName,
        status: assessment.status,
        passed: assessment.status === "PASSED",
        attemptNumber: assessment.attemptNumber,
        scoredPoints: assessment.scoredPoints,
        maxPoints: assessment.maxPoints,
        level: assessment.level,
        verifiedLevel: assessment.userSkill.verifiedLevel,
        verifiedAt: assessment.userSkill.verifiedAt?.toString() ?? null,
        submittedAt: assessment.submittedAt?.toString() ?? null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get assessment results error:", error)
    return NextResponse.json(
      { error: "Failed to fetch assessment results" },
      { status: 500 }
    )
  }
}
