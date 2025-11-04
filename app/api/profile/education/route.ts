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
    const userId = session.user.id

    const education = await prisma.userEducation.create({
      data: {
        userId: Number(userId),
        educationLevelId: BigInt(body.educationLevelId),
        degreeTitle: body.degreeTitle,
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now())
      },
      include: {
        educationLevel: true
      }
    })

    return NextResponse.json({
      id: education.id.toString(),
      degreeTitle: education.degreeTitle,
      educationLevel: education.educationLevel
    })
  } catch (error) {
    console.error("Add education error:", error)
    return NextResponse.json(
      { error: "Failed to add education" },
      { status: 500 }
    )
  }
}

