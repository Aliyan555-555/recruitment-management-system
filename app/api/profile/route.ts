import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

