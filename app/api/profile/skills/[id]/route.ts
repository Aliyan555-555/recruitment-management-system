import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    if (!body.skillName?.trim() || body.level === undefined) {
      return NextResponse.json(
        { error: "Skill name and level are required" },
        { status: 400 }
      )
    }

    const skill = await prisma.userSkills.update({
      where: { id: skillId },
      data: {
        skillName: body.skillName.trim(),
        level: Number(body.level),
        updatedAt: BigInt(Date.now()),
      },
    })

    return NextResponse.json({
      id: skill.id.toString(),
      skillName: skill.skillName,
      level: skill.level,
    })
  } catch (error) {
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

