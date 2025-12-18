import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/rbac"
import { sendOfferLetterSentEmail } from "@/lib/email"

// GET /api/admin/jobs/[id]/rounds/[roundId]/candidates/[candidateId]/offer - Get Offer Letter data
// GET /api/admin/jobs/[id]/rounds/[roundId]/candidates/[candidateId]/offer - Get Offer Letter data
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

    // Check if LOI exists and is accepted
    const loi = await prisma.letterOfIntent.findUnique({
      where: {
        pipelineStepId_candidateId: {
          pipelineStepId: pipelineStep.id,
          candidateId: BigInt(params.candidateId)
        }
      }
    })

    if (!loi || loi.status !== "ACCEPTED") {
      return NextResponse.json({
        error: "LOI must be accepted before generating Offer Letter",
        loiStatus: loi?.status || null
      }, { status: 400 })
    }

    const offerLetter = await prisma.offerLetter.findUnique({
      where: {
        letterOfIntentId: loi.id
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

    // Fetch candidate and job data
    let candidateData = null
    let jobData = null

    if (offerLetter) {
      candidateData = {
        id: offerLetter.candidate.id.toString(),
        name: `${offerLetter.candidate.firstname} ${offerLetter.candidate.lastname}`,
        email: offerLetter.candidate.email
      }
      jobData = {
        id: offerLetter.job.id.toString(),
        title: offerLetter.job.title,
        company: offerLetter.job.company
      }
    } else {
      // Fetch candidate and job data when offer letter doesn't exist
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

    if (!offerLetter) {
      return NextResponse.json({
        offerLetter: null,
        loi: {
          id: loi.id.toString(),
          status: loi.status
        },
        candidate: candidateData,
        job: jobData
      })
    }

    // Extract content from formData
    const formData = offerLetter.formData as any
    const content = formData?.content || null

    return NextResponse.json({
      offerLetter: {
        id: offerLetter.id.toString(),
        status: offerLetter.status,
        content: content,
        generatedAt: offerLetter.generatedAt?.toString(),
        sentAt: offerLetter.sentAt?.toString(),
        acceptedAt: offerLetter.acceptedAt?.toString(),
        rejectedAt: offerLetter.rejectedAt?.toString(),
        expiredAt: offerLetter.expiredAt?.toString(),
        createdAt: offerLetter.createdAt.toString(),
        updatedAt: offerLetter.updatedAt.toString()
      },
      loi: {
        id: loi.id.toString(),
        status: loi.status
      },
      candidate: candidateData,
      job: jobData
    })
  } catch (error) {
    console.error("Error fetching Offer Letter:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/jobs/[id]/rounds/[roundId]/candidates/[candidateId]/offer - Create/update Offer Letter
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
    const { content, status } = body

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
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

    // Check if LOI exists and is accepted
    const loi = await prisma.letterOfIntent.findUnique({
      where: {
        pipelineStepId_candidateId: {
          pipelineStepId: pipelineStep.id,
          candidateId: BigInt(params.candidateId)
        }
      }
    })

    if (!loi) {
      return NextResponse.json(
        { error: "LOI must be created and accepted before generating Offer Letter" },
        { status: 400 }
      )
    }

    if (loi.status !== "ACCEPTED") {
      return NextResponse.json(
        { error: `LOI must be accepted. Current status: ${loi.status}` },
        { status: 400 }
      )
    }

    const now = BigInt(Math.floor(Date.now() / 1000))
    const candidateIdBigInt = BigInt(params.candidateId)
    const jobIdBigInt = BigInt(params.id)

    // Check if Offer Letter already exists
    const existingOffer = await prisma.offerLetter.findUnique({
      where: {
        letterOfIntentId: loi.id
      }
    })

    let offerLetter
    const updateData: any = {
      formData: { content },
      updatedAt: now
    }

    // Update status-specific timestamps
    if (status === "SENT" && !existingOffer?.sentAt) {
      updateData.sentAt = now
      updateData.status = "SENT"
    } else if (status === "ACCEPTED" && !existingOffer?.acceptedAt) {
      updateData.acceptedAt = now
      updateData.status = "ACCEPTED"
    } else if (status === "REJECTED" && !existingOffer?.rejectedAt) {
      updateData.rejectedAt = now
      updateData.status = "REJECTED"
    } else if (status) {
      updateData.status = status
    }

    if (existingOffer) {
      // Update existing Offer Letter
      offerLetter = await prisma.offerLetter.update({
        where: { id: existingOffer.id },
        data: updateData
      })
    } else {
      // Create new Offer Letter
      offerLetter = await prisma.offerLetter.create({
        data: {
          letterOfIntentId: loi.id,
          pipelineStepId: pipelineStep.id,
          candidateId: candidateIdBigInt,
          jobId: jobIdBigInt,
          formData: { content },
          status: status || "DRAFTED",
          generatedAt: now,
          createdAt: now,
          updatedAt: now,
          ...(status === "SENT" && { sentAt: now })
        }
      })
    }

    return NextResponse.json({
      success: true,
      offerLetter: {
        id: offerLetter.id.toString(),
        status: offerLetter.status,
        content: content
      }
    })
  } catch (error) {
    console.error("Error creating/updating Offer Letter:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/admin/jobs/[id]/rounds/[roundId]/candidates/[candidateId]/offer - Update Offer Letter status
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

    const loi = await prisma.letterOfIntent.findUnique({
      where: {
        pipelineStepId_candidateId: {
          pipelineStepId: pipelineStep.id,
          candidateId: BigInt(params.candidateId)
        }
      }
    })

    if (!loi) {
      return NextResponse.json(
        { error: "LOI not found" },
        { status: 404 }
      )
    }

    const existingOffer = await prisma.offerLetter.findUnique({
      where: {
        letterOfIntentId: loi.id
      }
    })

    if (!existingOffer) {
      return NextResponse.json(
        { error: "Offer Letter not found" },
        { status: 404 }
      )
    }

    const now = BigInt(Math.floor(Date.now() / 1000))
    const updateData: any = {
      status,
      updatedAt: now
    }

    // Update status-specific timestamps
    if (status === "SENT" && !existingOffer.sentAt) {
      updateData.sentAt = now
    } else if (status === "ACCEPTED" && !existingOffer.acceptedAt) {
      updateData.acceptedAt = now
    } else if (status === "REJECTED" && !existingOffer.rejectedAt) {
      updateData.rejectedAt = now
    } else if (status === "EXPIRED" && !existingOffer.expiredAt) {
      updateData.expiredAt = now
    }

    const updatedOffer = await prisma.offerLetter.update({
      where: { id: existingOffer.id },
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

    // Mark pipeline step as COMPLETED when offer letter is sent
    if (status === "SENT" && !existingOffer.sentAt) {
      await prisma.candidatePipelineStep.update({
        where: { id: pipelineStep.id },
        data: {
          status: "COMPLETED",
          completedAt: now
        }
      })
    }

    // Send email notification if marked as SENT
    if (status === "SENT" && !existingOffer.sentAt) {
      await sendOfferLetterSentEmail(
        updatedOffer.candidate.email,
        `${updatedOffer.candidate.firstname} ${updatedOffer.candidate.lastname}`,
        updatedOffer.job.title,
        updatedOffer.job.company,
        params.id,
        updatedOffer.id.toString()
      )
    }

    return NextResponse.json({
      success: true,
      offerLetter: {
        id: updatedOffer.id.toString(),
        status: updatedOffer.status,
        sentAt: updatedOffer.sentAt?.toString(),
        acceptedAt: updatedOffer.acceptedAt?.toString(),
        rejectedAt: updatedOffer.rejectedAt?.toString()
      }
    })
  } catch (error) {
    console.error("Error updating Offer Letter status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

