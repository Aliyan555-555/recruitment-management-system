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

    const workflows = await prisma.jobWorkflow.findMany({
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true
          }
        },
        steps: {
          orderBy: {
            stepOrder: 'asc'
          }
        },
        _count: {
          select: {
            steps: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      workflows: workflows.map(workflow => ({
        id: workflow.id.toString(),
        jobId: workflow.jobId.toString(),
        jobTitle: workflow.job.title,
        jobCompany: workflow.job.company,
        totalSteps: workflow._count.steps,
        steps: workflow.steps.map(step => ({
          id: step.id.toString(),
          stepName: step.stepName,
          stepOrder: step.stepOrder,
          isRequired: step.isRequired,
          isSkippable: step.isSkippable
        })),
        createdAt: workflow.createdAt.toString()
      }))
    })
  } catch (error: any) {
    console.error("Error fetching workflows:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch workflows" },
      { status: 500 }
    )
  }
}

