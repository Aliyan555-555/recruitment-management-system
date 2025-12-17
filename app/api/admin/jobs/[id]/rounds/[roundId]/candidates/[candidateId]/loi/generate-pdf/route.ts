import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/rbac"
import puppeteer from "puppeteer"

// GET /api/admin/jobs/[id]/rounds/[roundId]/candidates/[candidateId]/loi/generate-pdf - Generate LOI PDF
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
        { error: "LOI not found. Please create LOI first." },
        { status: 404 }
      )
    }

    // Extract HTML content from formData
    const formData = loi.formData as any
    const htmlContent = formData?.content || (typeof formData === 'string' ? formData : null)

    if (!htmlContent) {
      return NextResponse.json(
        { error: "LOI content not found." },
        { status: 400 }
      )
    }

    // Update generatedAt if not set
    if (!loi.generatedAt) {
      const now = BigInt(Math.floor(Date.now() / 1000))
      await prisma.letterOfIntent.update({
        where: { id: loi.id },
        data: {
          generatedAt: now,
          status: loi.status === "DRAFTED" ? "DRAFTED" : loi.status
        }
      })
    }

    // Generate PDF from HTML using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    try {
      const page = await browser.newPage()
      
      // Set the HTML content
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
      })

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        printBackground: true
      })

      await browser.close()

      const candidateName = `${pipelineStep.pipeline.candidate.firstname} ${pipelineStep.pipeline.candidate.lastname}`
      const filename = `LOI_${candidateName.replace(/\s+/g, '_')}_${Date.now()}.pdf`

      // Return PDF as response
      return new NextResponse(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      })
    } catch (pdfError) {
      await browser.close()
      throw pdfError
    }
  } catch (error) {
    console.error("Error generating LOI PDF:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
