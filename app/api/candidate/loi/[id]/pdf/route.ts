import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import puppeteer from "puppeteer"

// GET /api/candidate/loi/[id]/pdf - Get LOI PDF for candidate
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const loiId = BigInt(params.id)
    const userId = BigInt(session.user.id)

    const loi = await prisma.letterOfIntent.findUnique({
      where: { id: loiId },
      include: {
        candidate: {
          select: {
            id: true,
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

    if (!loi) {
      return NextResponse.json(
        { error: "LOI not found" },
        { status: 404 }
      )
    }

    // Ensure the candidate can only access their own LOI
    if (loi.candidateId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized - You can only view your own LOI" },
        { status: 403 }
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

      const candidateName = `${loi.candidate.firstname} ${loi.candidate.lastname}`
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


