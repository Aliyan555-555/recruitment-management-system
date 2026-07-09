import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/** Placeholder until AI assessment sets verifiedLevel */
const DEFAULT_SKILL_LEVEL = 0

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const skillName = body.skillName?.trim()

    if (!skillName) {
      return NextResponse.json({ error: "Skill name is required" }, { status: 400 })
    }

    const userId = BigInt(session.user.id)

    const skill = await prisma.userSkills.create({
      data: {
        userId: userId,
        skillName,
        level: DEFAULT_SKILL_LEVEL,
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now())
      }
    })

    return NextResponse.json({
      id: skill.id.toString(),
      skillName: skill.skillName,
      verifiedLevel: skill.verifiedLevel,
    })
  } catch (error) {
    console.error("Add skill error:", error)
    return NextResponse.json(
      { error: "Failed to add skill" },
      { status: 500 }
    )
  }
}
