import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  SKILL_ERRORS,
  validateAndNormalizeSkillName,
} from "@/lib/skills"

/** Placeholder until AI assessment sets verifiedLevel */
const DEFAULT_SKILL_LEVEL = 0

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validation = validateAndNormalizeSkillName(body.skillName ?? "")

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const userId = BigInt(session.user.id)
    const skillName = validation.normalized

    const existing = await prisma.userSkills.findFirst({
      where: {
        userId,
        skillName,
      },
    })

    if (existing) {
      return NextResponse.json({ error: SKILL_ERRORS.DUPLICATE }, { status: 409 })
    }

    const skill = await prisma.userSkills.create({
      data: {
        userId,
        skillName,
        level: DEFAULT_SKILL_LEVEL,
        verifiedLevel: "BEGINNER",
        createdAt: BigInt(Date.now()),
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

    console.error("Add skill error:", error)
    return NextResponse.json(
      { error: "Failed to add skill" },
      { status: 500 }
    )
  }
}
