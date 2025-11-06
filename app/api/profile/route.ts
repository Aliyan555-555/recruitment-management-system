import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = BigInt(session.user.id)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        educations: {
          include: {
            educationLevel: true,
            instituteRef: true
          }
        },
        skills: true,
        cvs: {
          where: { deletedAt: null },
          orderBy: { updatedAt: 'desc' }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        phone1: user.phone1,
        phone2: user.phone2,
        institution: user.institution,
        department: user.department,
        address: user.address,
        city: user.city,
        country: user.country,
        educations: user.educations.map(edu => ({
          id: edu.id.toString(),
          degreeTitle: edu.degreeTitle,
          educationLevelId: edu.educationLevelId.toString(),
          institute: edu.institute,
          instituteId: edu.instituteId?.toString(),
          majorSubject: edu.majorSubject,
          grade: edu.grade,
          passingYear: edu.passingYear?.toString(),
          country: edu.country,
          educationLevel: edu.educationLevel ? {
            id: edu.educationLevel.id.toString(),
            name: edu.educationLevel.name
          } : null,
          instituteRef: edu.instituteRef ? {
            id: edu.instituteRef.id.toString(),
            name: edu.instituteRef.name
          } : null
        })),
        skills: user.skills.map(skill => ({
          id: skill.id.toString(),
          skillName: skill.skillName,
          level: skill.level
        })),
        cvs: user.cvs.map(cv => ({
          id: cv.id.toString(),
          filename: cv.filename,
          filepath: cv.filepath,
          status: cv.status
        }))
      }
    })
  } catch (error: any) {
    console.error("Profile fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const userId = session.user.id

    const updated = await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        firstname: body.firstName,
        lastname: body.lastName,
        phone1: body.phone1 && body.phone1.trim() ? body.phone1.trim() : null,
        phone2: body.phone2 && body.phone2.trim() ? body.phone2.trim() : null,
        institution: body.institution && body.institution.trim() ? body.institution.trim() : null,
        department: body.department && body.department.trim() ? body.department.trim() : null,
        address: body.address && body.address.trim() ? body.address.trim() : null,
        city: body.city && body.city.trim() ? body.city.trim() : null,
        country: body.country && body.country.trim() ? body.country.trim() : null,
        updatedAt: BigInt(Date.now())
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        firstname: updated.firstname,
        lastname: updated.lastname,
        phone1: updated.phone1,
        phone2: updated.phone2,
        institution: updated.institution,
        department: updated.department,
        address: updated.address,
        city: updated.city,
        country: updated.country
      }
    })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}

