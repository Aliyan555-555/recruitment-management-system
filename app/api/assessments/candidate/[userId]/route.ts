import { NextRequest, NextResponse } from "next/server"
import { requireStaff } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { serializeAssessmentSummary } from "@/lib/assessments/serializers"
import { buildSkillPercentageMap } from "@/lib/assessments/skill-percentage"

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await requireStaff()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin or Interviewer access required" },
        { status: 401 }
      )
    }

    const candidateId = BigInt(params.userId)

    const candidate = await prisma.user.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        role: true,
      },
    })

    if (!candidate || candidate.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    const assessments = await prisma.skillAssessment.findMany({
      where: { userId: candidateId },
      orderBy: [{ skillName: "asc" }, { attemptNumber: "desc" }],
    })

    const skills = await prisma.userSkills.findMany({
      where: { userId: candidateId },
      orderBy: { skillName: "asc" },
      select: {
        id: true,
        skillName: true,
        level: true,
        verifiedLevel: true,
        verifiedAt: true,
        lastAssessmentId: true,
      },
    })

    const lastAssessmentIds = skills
      .map((skill) => skill.lastAssessmentId)
      .filter((id): id is bigint => id != null)

    const lastAssessments =
      lastAssessmentIds.length > 0
        ? await prisma.skillAssessment.findMany({
            where: { id: { in: lastAssessmentIds } },
            select: {
              id: true,
              scoredPoints: true,
              maxPoints: true,
            },
          })
        : []

    const percentageByAssessmentId = buildSkillPercentageMap(lastAssessments)

    return NextResponse.json({
      candidate: {
        id: candidate.id.toString(),
        name: `${candidate.firstname} ${candidate.lastname}`,
        email: candidate.email,
      },
      skills: skills.map((skill) => ({
        id: skill.id.toString(),
        skillName: skill.skillName,
        verifiedLevel: skill.verifiedLevel,
        verifiedAt: skill.verifiedAt?.toString() ?? null,
        lastAssessmentId: skill.lastAssessmentId?.toString() ?? null,
        skillPercentage: skill.lastAssessmentId
          ? percentageByAssessmentId.get(skill.lastAssessmentId.toString()) ?? null
          : null,
      })),
      assessments: assessments.map(serializeAssessmentSummary),
    })
  } catch (error) {
    console.error("Get candidate assessment history error:", error)
    return NextResponse.json(
      { error: "Failed to fetch candidate assessment history" },
      { status: 500 }
    )
  }
}
