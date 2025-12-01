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

    if (!body.jobTitle?.trim()) {
      return NextResponse.json(
        { error: "Job title is required" },
        { status: 400 }
      )
    }

    const experience = await prisma.userExperience.create({
      data: {
        userId: userId,
        jobTitle: body.jobTitle.trim(),
        company: body.company?.trim() || null,
        location: body.location?.trim() || null,
        startDate: body.startDate?.trim() || null,
        endDate: body.endDate?.trim() || null,
        isCurrent: body.isCurrent || false,
        createdAt: BigInt(Date.now()),
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
    console.error("Add experience error:", error)
    return NextResponse.json(
      { error: "Failed to add experience" },
      { status: 500 }
    )
  }
}
