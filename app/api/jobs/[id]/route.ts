import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const jobId = BigInt(params.id)

    const job = await prisma.job.findUnique({
      where: { id: jobId },
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
            lastname: true,
            email: true
          }
        },
        applications: {
          where: { userId: BigInt(session.user.id) }
        }
      }
    })

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      )
    }

    // Check if user has already applied
    const hasApplied = job.applications.length > 0
    const userApplication = hasApplied ? job.applications[0] : null

    return NextResponse.json({
      job: {
        id: job.id.toString(),
        title: job.title,
        company: job.company,
        shortDescription: job.shortDescription || "",
        description: job.description || "",
        locations: job.locations?.map(loc => ({ 
          city: loc.city, 
          country: loc.country || "" 
        })),
        employmentType: job.employmentType,
        employmentShift: job.employmentShift,
        minimumExperience: job.minimumExperience,
        certification: job.certification || undefined,
        minimumSalary: job.minimumSalary || undefined,
        benefits: job.benefits || undefined,
        totalPositions: job.totalPositions || undefined,
        jobCode: job.jobCode || undefined,
        postFrom: job.postFrom.toISOString(),
        postTo: job.postTo.toISOString(),
        skills: job.skills.map((s: any) => s.skillName),
        minimumEducation: job.educationRequirements?.[0]?.educationLevel?.name || undefined,
        createdBy: `${job.creator.firstname} ${job.creator.lastname}`,
        creatorEmail: job.creator.email
      },
      hasApplied,
      application: userApplication ? {
        id: userApplication.id.toString(),
        status: userApplication.status,
        appliedAt: new Date(Number(userApplication.appliedAt) * 1000).toISOString()
      } : null
    })
  } catch (error: any) {
    console.error("Error fetching job:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch job" },
      { status: 500 }
    )
  }
}

