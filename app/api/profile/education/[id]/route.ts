import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveInstituteForSave } from "@/lib/institutes-server"

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

    if (!body.degreeTitle?.trim() || !body.educationLevelId) {
      return NextResponse.json(
        { error: "Degree title and education level are required" },
        { status: 400 }
      )
    }

    const educationId = BigInt(params.id)
    const userId = BigInt(session.user.id)

    const existing = await prisma.userEducation.findUnique({
      where: { id: educationId },
    })

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Education not found" }, { status: 404 })
    }

    const inst = await resolveInstituteForSave(body.instituteId, body.institute)

    const education = await prisma.userEducation.update({
      where: { id: educationId },
      data: {
        degreeTitle: body.degreeTitle.trim(),
        educationLevelId: BigInt(body.educationLevelId),
        institute: inst.institute,
        instituteId: inst.instituteId,
        majorSubject: body.majorSubject?.trim() || null,
        grade: body.grade?.trim() || null,
        passingYear: body.passingYear?.trim() || null,
        country: body.country?.trim() || null,
        updatedAt: BigInt(Date.now()),
      },
      include: { educationLevel: true },
    })

    return NextResponse.json(formatEducationResponse(education))
  } catch (error) {
    console.error("Update education error:", error)
    return NextResponse.json(
      { error: "Failed to update education" },
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

    const educationId = BigInt(params.id)
    const userId = BigInt(session.user.id)

    const existing = await prisma.userEducation.findUnique({
      where: { id: educationId },
    })

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Education not found" }, { status: 404 })
    }

    await prisma.userEducation.delete({
      where: { id: educationId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete education error:", error)
    return NextResponse.json(
      { error: "Failed to delete education" },
      { status: 500 }
    )
  }
}

