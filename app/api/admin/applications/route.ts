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
    const status = searchParams.get("status")
    const jobId = searchParams.get("jobId")

    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (jobId) {
      where.jobId = BigInt(jobId)
    }

    const applications = await prisma.jobsApplied.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true
          }
        },
        job: {
          select: {
            id: true,
            title: true,
            company: true
          }
        },
        pipeline: {
          select: {
            id: true,
            currentStepOrder: true,
            overallStatus: true,
            _count: {
              select: {
                steps: true
              }
            }
          }
        }
      },
      orderBy: {
        appliedAt: 'desc'
      }
    })

    return NextResponse.json({
      applications: applications.map(app => ({
        id: app.id.toString(),
        candidateName: `${app.user.firstname} ${app.user.lastname}`,
        candidateEmail: app.user.email,
        jobTitle: app.job.title,
        jobCompany: app.job.company,
        status: app.status,
        appliedAt: app.appliedAt.toString(),
        pipeline: app.pipeline ? {
          id: app.pipeline.id.toString(),
          currentStep: app.pipeline.currentStepOrder,
          totalSteps: app.pipeline._count.steps,
          overallStatus: app.pipeline.overallStatus
        } : null
      }))
    })
  } catch (error: any) {
    console.error("Error fetching applications:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch applications" },
      { status: 500 }
    )
  }
}

