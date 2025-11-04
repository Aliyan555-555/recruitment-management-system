import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const jobId = BigInt(params.id)

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        skills: {
          select: {
            skillName: true
          }
        },
        locations: {
          orderBy: {
            city: 'asc'
          }
        },
        educationRequirements: {
          include: {
            educationLevel: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        workflow: {
          include: {
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
            }
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      }
    })

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      job: {
        id: job.id.toString(),
        jobCode: job.jobCode,
        title: job.title,
        company: job.company,
        description: job.description,
        postFrom: job.postFrom.toISOString().split('T')[0],
        postTo: job.postTo.toISOString().split('T')[0],
        status: job.status,
        industry: job.industry,
        employmentType: job.employmentType,
        employmentShift: job.employmentShift,
        totalPositions: job.totalPositions,
        minimumExperience: job.minimumExperience,
        certification: job.certification,
        minimumSalary: job.minimumSalary,
        benefits: job.benefits,
        locations: job.locations.map(loc => ({
          id: loc.id.toString(),
          city: loc.city,
          country: loc.country
        })),
        educationRequirements: job.educationRequirements.map(req => ({
          id: req.id.toString(),
          educationLevelId: req.educationLevelId.toString(),
          educationLevel: req.educationLevel.name,
          field: req.field,
          minimumGpa: req.minimumGpa,
          gpaScale: req.gpaScale,
          isRequired: req.isRequired,
          notes: req.notes
        })),
        createdAt: job.createdAt.toString(),
        updatedAt: job.updatedAt.toString(),
        deletedAt: job.deletedAt?.toString(),
        skills: job.skills,
        workflow: job.workflow ? {
          id: job.workflow.id.toString(),
          jobId: job.workflow.jobId.toString(),
          createdAt: job.workflow.createdAt.toString(),
          updatedAt: job.workflow.updatedAt.toString(),
          steps: job.workflow.steps.map(s => ({
            id: s.id.toString(),
            workflowId: s.workflowId.toString(),
            stepName: s.stepName,
            stepOrder: s.stepOrder,
            isRequired: s.isRequired,
            isSkippable: s.isSkippable,
            interviewerId: s.interviewerId?.toString(),
            status: s.status,
            createdAt: s.createdAt.toString(),
            updatedAt: s.updatedAt.toString(),
            interviewer: s.interviewer ? {
              id: s.interviewer.id.toString(),
              firstname: s.interviewer.firstname,
              lastname: s.interviewer.lastname,
              email: s.interviewer.email
            } : null
          }))
        } : null,
        _count: job._count
      }
    })
  } catch (error: any) {
    console.error("Error fetching job:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch job" },
      { status: 500 }
    )
  }
}

