import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const userId = BigInt(session.user.id)

    const skill = await prisma.userSkills.create({
      data: {
        userId: userId,
        skillName: body.skillName,
        level: body.level,
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now())
      }
    })

    return NextResponse.json({
      id: skill.id.toString(),
      skillName: skill.skillName,
      level: skill.level
    })
  } catch (error) {
    console.error("Add skill error:", error)
    return NextResponse.json(
      { error: "Failed to add skill" },
      { status: 500 }
    )
  }
}

