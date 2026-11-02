import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/rbac"
import { generatePdfFromHtml } from "@/lib/pdf-generator"

// GET /api/admin/jobs/[id]/rounds/[roundId]/candidates/[candidateId]/offer/generate-pdf - Generate Offer Letter PDF
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string; candidateId: string } }
) {
  const logPrefix = `[OFFER-PDF-GEN] [${params.id}-${params.roundId}-${params.candidateId}]`
  console.log(`${logPrefix} Starting Offer Letter PDF generation request`)

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
      },
      include: {
        pipeline: {
          include: {
            candidate: {
              select: {
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
      return NextResponse.json(
        { error: "LOI must be accepted before generating Offer Letter" },
        { status: 400 }
      )
    }

    const offerLetter = await prisma.offerLetter.findUnique({
      where: {
        letterOfIntentId: loi.id
      }
    })

    if (!offerLetter) {
      return NextResponse.json(
        { error: "Offer Letter not found. Please create Offer Letter first." },
        { status: 404 }
      )
    }

    // Extract HTML content from formData
    const formData = offerLetter.formData as any
    const htmlContent = formData?.content || (typeof formData === 'string' ? formData : null)

    if (!htmlContent) {
      return NextResponse.json(
        { error: "Offer Letter content not found." },
        { status: 400 }
      )
    }

    // Update generatedAt if not set
    if (!offerLetter.generatedAt) {
      const now = BigInt(Math.floor(Date.now() / 1000))
      await prisma.offerLetter.update({
        where: { id: offerLetter.id },
        data: {
          generatedAt: now,
          status: offerLetter.status === "DRAFTED" ? "DRAFTED" : offerLetter.status
        }
      })
    }

    console.log(`${logPrefix} Generating PDF buffer from HTML`)
    const pdfBuffer = await generatePdfFromHtml(htmlContent, {
      format: "A4",
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm"
      },
      printBackground: true
    })

    console.log(`${logPrefix} PDF generated successfully, size: ${pdfBuffer.length}`)

    const candidateName = `${pipelineStep.pipeline.candidate.firstname} ${pipelineStep.pipeline.candidate.lastname}`
    const filename = `OfferLetter_${candidateName.replace(/\s+/g, '_')}_${Date.now()}.pdf`

    // Return PDF as response
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error(`${logPrefix} CRITICAL ERROR:`, error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    )
  }
}
