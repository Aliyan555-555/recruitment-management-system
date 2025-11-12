import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const jobs = await prisma.job.findMany({
      where: {
        deletedAt: null,
        status: true,
        postTo: {
          gte: new Date()
        }
      },
      include: {
        skills: true,
        educationRequirements: {
          include: {
            educationLevel: true
          }
        },
        locations: {
          select: {
            city: true,
            country: true
          }
        },
        creator: {
          select: {
            firstname: true,
            lastname: true
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json({
      jobs: jobs.map(job => ({
        id: job.id.toString(),
        title: job.title,
        company: job.company,
        status: job.status,
        shortDescription: job.shortDescription || "",
        description: job.description || undefined,
        locations: job.locations?.map((loc) => ({
          city: loc.city,
          country: loc.country || ""
        })),
        employmentType: job.employmentType,
        postFrom: job.postFrom.toISOString(),
        postTo: job.postTo.toISOString(),
        skills: job.skills.map((s) => s.skillName),
        minimumEducation: job.educationRequirements?.[0]?.educationLevel?.name || undefined,
        createdBy: `${job.creator.firstname} ${job.creator.lastname}`,
        applicationCount: job._count.applications,
        _count: {
          applications: job._count.applications,
        },
      }))
    })
  } catch (error: any) {
    console.error("Error fetching jobs:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch jobs" },
      { status: 500 }
    )
  }
}

