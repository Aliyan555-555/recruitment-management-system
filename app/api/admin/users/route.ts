import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const role = searchParams.get("role")

    const where: any = {}
    
    if (role) {
      where.role = role
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        _count: {
          select: {
            candidatePipelines: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      users: users.map(u => ({
        id: u.id.toString(),
        username: u.username,
        email: u.email,
        firstname: u.firstname,
        lastname: u.lastname,
        role: u.role,
        phone1: u.phone1,
        phone2: u.phone2,
        institution: u.institution,
        department: u.department,
        city: u.city,
        country: u.country,
        stats: {
          pipelines: u._count.candidatePipelines,
        },
        createdAt: u.createdAt.toString()
      }))
    })
  } catch (error: any) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    )
  }
}

