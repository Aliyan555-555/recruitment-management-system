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
      where.overallStatus = status
    }
    
    if (jobId) {
      where.jobId = BigInt(jobId)
    }

    const pipelines = await prisma.candidatePipeline.findMany({
      where,
      include: {
        candidate: {
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
        application: {
          select: {
            id: true,
            status: true,
            appliedAt: true
          }
        },
        _count: {
          select: {
            steps: true
          }
        }
      },
      orderBy: {
        startedAt: 'desc'
      }
    })

    return NextResponse.json({
      pipelines: pipelines.map(p => ({
        id: p.id.toString(),
        candidateName: `${p.candidate.firstname} ${p.candidate.lastname}`,
        candidateEmail: p.candidate.email,
        jobTitle: p.job.title,
        jobCompany: p.job.company,
        status: p.overallStatus,
        currentStep: p.currentStepOrder,
        totalSteps: p._count.steps,
        startedAt: p.startedAt.toString()
      }))
    })
  } catch (error: any) {
    console.error("Error fetching pipelines:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch pipelines" },
      { status: 500 }
    )
  }
}

