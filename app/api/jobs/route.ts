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
        status: true
      },
      select: {
        id: true,
        jobCode: true,
        title: true,
        description: true,
        company: true,
        postFrom: true,
        postTo: true,
        status: true,
        industry: true,
        employmentType: true,
        employmentShift: true,
        shortDescription:true,
        totalPositions: true,
        minimumExperience: true,
        minimumSalary: true,
        locations: {
          select: {
            city: true,
            country: true
          }
        },
        createdAt: true,
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      jobs: jobs.map(job => ({
        ...job,
        id: job.id.toString(),
        jobCode: job.jobCode,
        postFrom: job.postFrom.toISOString().split('T')[0],
        postTo: job.postTo.toISOString().split('T')[0],
        createdAt: job.createdAt.toString(),
        locations: job.locations
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

