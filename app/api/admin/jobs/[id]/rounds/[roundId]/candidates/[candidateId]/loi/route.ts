import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/rbac"
import { sendLOISentEmail } from "@/lib/email"

// GET /api/admin/jobs/[id]/rounds/[roundId]/candidates/[candidateId]/loi - Get LOI data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string; candidateId: string } }
) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const pipelineStep = await prisma.candidatePipelineStep.findFirst({
      where: {
        workflowStepId: BigInt(params.roundId),
        pipeline: {
          jobId: BigInt(params.id),
          candidateId: BigInt(params.candidateId)
        }
      }
    })

    if (!pipelineStep) {
      return NextResponse.json(
        { error: "Pipeline step not found" },
        { status: 404 }
      )
    }

    const loi = await prisma.letterOfIntent.findUnique({
      where: {
        pipelineStepId_candidateId: {
          pipelineStepId: pipelineStep.id,
          candidateId: BigInt(params.candidateId)
        }
      },
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
        }
      }
    })

    // Fetch candidate and job data separately if LOI doesn't exist
    let candidateData = null
    let jobData = null

    if (loi) {
      candidateData = {
        id: loi.candidate.id.toString(),
        name: `${loi.candidate.firstname} ${loi.candidate.lastname}`,
        email: loi.candidate.email
      }
      jobData = {
        id: loi.job.id.toString(),
        title: loi.job.title,
        company: loi.job.company
      }
    } else {
      // Fetch candidate and job data when LOI doesn't exist
      const candidate = await prisma.user.findUnique({
        where: { id: BigInt(params.candidateId) },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true
        }
      })

      const job = await prisma.job.findUnique({
        where: { id: BigInt(params.id) },
        select: {
          id: true,
          title: true,
          company: true
        }
      })

      if (candidate) {
        candidateData = {
          id: candidate.id.toString(),
          name: `${candidate.firstname} ${candidate.lastname}`,
          email: candidate.email
        }
      }

      if (job) {
        jobData = {
          id: job.id.toString(),
          title: job.title,
          company: job.company
        }
      }
    }

    if (!loi) {
      return NextResponse.json({
        loi: null,
        candidate: candidateData,
        job: jobData
      })
    }

    // Extract content from formData (backward compatible)
    const formData = loi.formData as any
    const content = formData?.content || (typeof formData === 'string' ? formData : null) || 
                    (formData ? JSON.stringify(formData) : null)

    return NextResponse.json({
      loi: {
        id: loi.id.toString(),
        status: loi.status,
        content: content, // HTML content
        generatedAt: loi.generatedAt?.toString(),
        sentAt: loi.sentAt?.toString(),
        acceptedAt: loi.acceptedAt?.toString(),
        rejectedAt: loi.rejectedAt?.toString(),
        expiredAt: loi.expiredAt?.toString(),
        createdAt: loi.createdAt.toString(),
        updatedAt: loi.updatedAt.toString()
      },
      candidate: candidateData,
      job: jobData
    })
  } catch (error) {
    console.error("Error fetching LOI:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/jobs/[id]/rounds/[roundId]/candidates/[candidateId]/loi - Create/update LOI
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string; candidateId: string } }
) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { content, formData, status } = body

    // Support both content (HTML) and formData (for backward compatibility)
    const htmlContent = content || (formData?.content) || null

    if (!htmlContent && !formData) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      )
    }

    // Store content in formData field as JSON
    const dataToStore = htmlContent ? { content: htmlContent } : formData

    const pipelineStep = await prisma.candidatePipelineStep.findFirst({
      where: {
        workflowStepId: BigInt(params.roundId),
        pipeline: {
          jobId: BigInt(params.id),
          candidateId: BigInt(params.candidateId)
        }
      }
    })

    if (!pipelineStep) {
      return NextResponse.json(
        { error: "Pipeline step not found" },
        { status: 404 }
      )
    }

    const now = BigInt(Math.floor(Date.now() / 1000))
    const candidateIdBigInt = BigInt(params.candidateId)
    const jobIdBigInt = BigInt(params.id)

    // Check if LOI already exists
    const existingLOI = await prisma.letterOfIntent.findUnique({
      where: {
        pipelineStepId_candidateId: {
          pipelineStepId: pipelineStep.id,
          candidateId: candidateIdBigInt
        }
      }
    })

    let loi
    const updateData: any = {
      formData: dataToStore,
      updatedAt: now
    }

    // Update status-specific timestamps
    if (status === "SENT" && !existingLOI?.sentAt) {
      updateData.sentAt = now
      updateData.status = "SENT"
    } else if (status === "ACCEPTED" && !existingLOI?.acceptedAt) {
      updateData.acceptedAt = now
      updateData.status = "ACCEPTED"
    } else if (status === "REJECTED" && !existingLOI?.rejectedAt) {
      updateData.rejectedAt = now
      updateData.status = "REJECTED"
    } else if (status) {
      updateData.status = status
    }

    if (existingLOI) {
      // Update existing LOI
      loi = await prisma.letterOfIntent.update({
        where: { id: existingLOI.id },
        data: updateData
      })
    } else {
      // Create new LOI
      loi = await prisma.letterOfIntent.create({
        data: {
          pipelineStepId: pipelineStep.id,
          candidateId: candidateIdBigInt,
          jobId: jobIdBigInt,
          formData: dataToStore,
          status: status || "DRAFTED",
          generatedAt: now,
          createdAt: now,
          updatedAt: now,
          ...(status === "SENT" && { sentAt: now })
        }
      })
    }

    const loiFormData = loi.formData as any
    const loiContent = loiFormData?.content || (typeof loiFormData === 'string' ? loiFormData : null)

    return NextResponse.json({
      success: true,
      loi: {
        id: loi.id.toString(),
        status: loi.status,
        content: loiContent
      }
    })
  } catch (error) {
    console.error("Error creating/updating LOI:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/admin/jobs/[id]/rounds/[roundId]/candidates/[candidateId]/loi - Update LOI status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string; candidateId: string } }
) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      )
    }

    const pipelineStep = await prisma.candidatePipelineStep.findFirst({
      where: {
        workflowStepId: BigInt(params.roundId),
        pipeline: {
          jobId: BigInt(params.id),
          candidateId: BigInt(params.candidateId)
        }
      }
    })

    if (!pipelineStep) {
      return NextResponse.json(
        { error: "Pipeline step not found" },
        { status: 404 }
      )
    }

    const existingLOI = await prisma.letterOfIntent.findUnique({
      where: {
        pipelineStepId_candidateId: {
          pipelineStepId: pipelineStep.id,
          candidateId: BigInt(params.candidateId)
        }
      }
    })

    if (!existingLOI) {
      return NextResponse.json(
        { error: "LOI not found" },
        { status: 404 }
      )
    }

    const now = BigInt(Math.floor(Date.now() / 1000))
    const updateData: any = {
      status,
      updatedAt: now
    }

    // Update status-specific timestamps
    if (status === "SENT" && !existingLOI.sentAt) {
      updateData.sentAt = now
    } else if (status === "ACCEPTED" && !existingLOI.acceptedAt) {
      updateData.acceptedAt = now
    } else if (status === "REJECTED" && !existingLOI.rejectedAt) {
      updateData.rejectedAt = now
    } else if (status === "EXPIRED" && !existingLOI.expiredAt) {
      updateData.expiredAt = now
    }

    const updatedLOI = await prisma.letterOfIntent.update({
      where: { id: existingLOI.id },
      data: updateData,
      include: {
        candidate: {
          select: {
            email: true,
            firstname: true,
            lastname: true
          }
        },
        job: {
          select: {
            title: true,
            company: true
          }
        }
      }
    })

    // Send email notification if marked as SENT
    if (status === "SENT" && !existingLOI.sentAt) {
      await sendLOISentEmail(
        updatedLOI.candidate.email,
        `${updatedLOI.candidate.firstname} ${updatedLOI.candidate.lastname}`,
        updatedLOI.job.title,
        updatedLOI.job.company,
        params.id,
        updatedLOI.id.toString()
      )
    }

    return NextResponse.json({
      success: true,
      loi: {
        id: updatedLOI.id.toString(),
        status: updatedLOI.status,
        sentAt: updatedLOI.sentAt?.toString(),
        acceptedAt: updatedLOI.acceptedAt?.toString(),
        rejectedAt: updatedLOI.rejectedAt?.toString()
      }
    })
  } catch (error) {
    console.error("Error updating LOI status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

