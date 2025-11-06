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
          include: {
            interviewer: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true
              }
            }
          },
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
          isSkippable: step.isSkippable,
          interviewer: step.interviewer ? {
            id: step.interviewer.id.toString(),
            name: `${step.interviewer.firstname} ${step.interviewer.lastname}`,
            email: step.interviewer.email
          } : null
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

