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
    const experienceId = BigInt(params.id)
    const userId = BigInt(session.user.id)

    const existing = await prisma.userExperience.findUnique({
      where: { id: experienceId },
    })

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Experience not found" }, { status: 404 })
    }

    if (!body.jobTitle?.trim()) {
      return NextResponse.json(
        { error: "Job title is required" },
        { status: 400 }
      )
    }

    const experience = await prisma.userExperience.update({
      where: { id: experienceId },
      data: {
        jobTitle: body.jobTitle.trim(),
        company: body.company?.trim() || null,
        location: body.location?.trim() || null,
        startDate: body.startDate?.trim() || null,
        endDate: body.endDate?.trim() || null,
        isCurrent: body.isCurrent || false,
        updatedAt: BigInt(Date.now()),
      },
    })

    return NextResponse.json({
      id: experience.id.toString(),
      jobTitle: experience.jobTitle,
      company: experience.company,
      location: experience.location,
      startDate: experience.startDate,
      endDate: experience.endDate,
      isCurrent: experience.isCurrent,
    })
  } catch (error) {
    console.error("Update experience error:", error)
    return NextResponse.json(
      { error: "Failed to update experience" },
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

    const experienceId = BigInt(params.id)
    const userId = BigInt(session.user.id)

    const existing = await prisma.userExperience.findUnique({
      where: { id: experienceId },
    })

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Experience not found" }, { status: 404 })
    }

    await prisma.userExperience.delete({
      where: { id: experienceId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete experience error:", error)
    return NextResponse.json(
      { error: "Failed to delete experience" },
      { status: 500 }
    )
  }
}
