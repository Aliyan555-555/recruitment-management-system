import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const formatEducationResponse = (education: any) => ({
  id: education.id.toString(),
  degreeTitle: education.degreeTitle,
  educationLevelId: education.educationLevelId.toString(),
  educationLevel: education.educationLevel
    ? {
        id: education.educationLevel.id.toString(),
        name: education.educationLevel.name,
      }
    : null,
  institute: education.institute,
  instituteId: education.instituteId ? education.instituteId.toString() : undefined,
  majorSubject: education.majorSubject,
  grade: education.grade,
  passingYear: education.passingYear ?? undefined,
  country: education.country ?? undefined,
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const userId = BigInt(session.user.id)

    if (!body.degreeTitle?.trim() || !body.educationLevelId) {
      return NextResponse.json(
        { error: "Degree title and education level are required" },
        { status: 400 }
      )
    }

    const education = await prisma.userEducation.create({
      data: {
        userId: userId,
        educationLevelId: BigInt(body.educationLevelId),
        degreeTitle: body.degreeTitle.trim(),
        institute: body.institute?.trim() || null,
        instituteId: body.instituteId ? BigInt(body.instituteId) : null,
        majorSubject: body.majorSubject?.trim() || null,
        grade: body.grade?.trim() || null,
        passingYear: body.passingYear?.trim() || null,
        country: body.country?.trim() || null,
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now()),
      },
      include: {
        educationLevel: true,
      },
    })

    return NextResponse.json(formatEducationResponse(education))
  } catch (error) {
    console.error("Add education error:", error)
    return NextResponse.json(
      { error: "Failed to add education" },
      { status: 500 }
    )
  }
}

