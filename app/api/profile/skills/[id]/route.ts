import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  SKILL_ERRORS,
  validateAndNormalizeSkillName,
} from "@/lib/skills"

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const skillId = BigInt(params.id)
    const userId = BigInt(session.user.id)

    const existing = await prisma.userSkills.findUnique({
      where: { id: skillId },
    })

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 })
    }

    const validation = validateAndNormalizeSkillName(body.skillName ?? "")
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const skillName = validation.normalized

    if (skillName !== existing.skillName) {
      const duplicate = await prisma.userSkills.findFirst({
        where: {
          userId,
          skillName,
          id: { not: skillId },
        },
      })

      if (duplicate) {
        return NextResponse.json({ error: SKILL_ERRORS.DUPLICATE }, { status: 409 })
      }
    }

    const skill = await prisma.userSkills.update({
      where: { id: skillId },
      data: {
        skillName,
        updatedAt: BigInt(Date.now()),
      },
    })

    return NextResponse.json({
      id: skill.id.toString(),
      skillName: skill.skillName,
      verifiedLevel: skill.verifiedLevel,
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: SKILL_ERRORS.DUPLICATE }, { status: 409 })
    }

    console.error("Update skill error:", error)
    return NextResponse.json(
      { error: "Failed to update skill" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const skillId = BigInt(params.id)
    const userId = BigInt(session.user.id)

    const existing = await prisma.userSkills.findUnique({
      where: { id: skillId },
    })

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 })
    }

    const assessmentCount = await prisma.skillAssessment.count({
      where: { userSkillId: skillId },
    })

    if (assessmentCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a skill that has assessment history. This protects your verified results and attempt limits.",
          code: "SKILL_HAS_ASSESSMENTS",
        },
        { status: 409 }
      )
    }

    await prisma.userSkills.delete({
      where: { id: skillId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete skill error:", error)
    return NextResponse.json(
      { error: "Failed to delete skill" },
      { status: 500 }
    )
  }
}
