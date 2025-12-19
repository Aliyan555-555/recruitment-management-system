import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ jobs: [], candidates: [] })
    }

    const searchQuery = query.trim()

    // Search for jobs
    const jobs = await prisma.job.findMany({
      where: {
        OR: [
          { title: { contains: searchQuery, mode: "insensitive" } },
          { company: { contains: searchQuery, mode: "insensitive" } },
          { description: { contains: searchQuery, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        company: true,
        employmentType: true,
        status: true,
        _count: {
          select: {
            applications: true,
          },
        },
      },
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
    })

    // Search for candidates (users with CANDIDATE role)
    const candidates = await prisma.user.findMany({
      where: {
        role: "CANDIDATE",
        OR: [
          { firstname: { contains: searchQuery, mode: "insensitive" } },
          { lastname: { contains: searchQuery, mode: "insensitive" } },
          { email: { contains: searchQuery, mode: "insensitive" } },
          { username: { contains: searchQuery, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        username: true,
        profileDetails: {
          select: {
            professionalGrade: true,
          },
        },
      },
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      jobs: jobs.map((job: any) => ({
        id: job.id.toString(),
        title: job.title,
        company: job.company,
        employmentType: job.employmentType,
        status: job.status,
        applicationCount: job._count.applications,
      })),
      candidates: candidates.map((candidate: any) => ({
        id: candidate.id.toString(),
        name: `${candidate.firstname} ${candidate.lastname}`,
        email: candidate.email,
        phone: candidate.username,
        professionalGrade: candidate.profileDetails?.professionalGrade || null,
        applicationCount: 0,
      })),
    })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    )
  }
}
