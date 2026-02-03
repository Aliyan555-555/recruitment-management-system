import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import puppeteer from "puppeteer";

// GET /api/admin/jobs/[id]/rounds/[roundId]/candidates/[candidateId]/loi/generate-pdf - Generate LOI PDF
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string; candidateId: string } },
) {
  const logPrefix = `[LOI-PDF-GEN] [${params.id}-${params.roundId}-${params.candidateId}]`;
  console.log(`${logPrefix} Starting PDF generation request`);

  try {
    const user = await requireAdmin();
    console.log(`${logPrefix} Admin check passed for user: ${user?.id}`);

    if (!user) {
      console.warn(`${logPrefix} Unauthorized access attempt`);
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 },
      );
    }

    console.log(`${logPrefix} Fetching pipeline step`);
    const pipelineStep = await prisma.candidatePipelineStep.findFirst({
      where: {
        workflowStepId: BigInt(params.roundId),
        pipeline: {
          jobId: BigInt(params.id),
          candidateId: BigInt(params.candidateId),
        },
      },
      include: {
        pipeline: {
          include: {
            candidate: {
              select: {
                firstname: true,
                lastname: true,
              },
            },
            job: {
              select: {
                title: true,
                company: true,
              },
            },
          },
        },
      },
    });

    if (!pipelineStep) {
      console.error(`${logPrefix} Pipeline step not found`);
      return NextResponse.json(
        { error: "Pipeline step not found" },
        { status: 404 },
      );
    }

    console.log(`${logPrefix} Fetching LOI record`);
    const loi = await prisma.letterOfIntent.findUnique({
      where: {
        pipelineStepId_candidateId: {
          pipelineStepId: pipelineStep.id,
          candidateId: BigInt(params.candidateId),
        },
      },
    });

    if (!loi) {
      console.error(`${logPrefix} LOI record not found`);
      return NextResponse.json(
        { error: "LOI not found. Please create LOI first." },
        { status: 404 },
      );
    }

    // Extract HTML content from formData
    const formData = loi.formData as any;
    const htmlContent =
      formData?.content || (typeof formData === "string" ? formData : null);

    if (!htmlContent) {
      console.error(`${logPrefix} LOI content is missing/empty`);
      return NextResponse.json(
        { error: "LOI content not found." },
        { status: 400 },
      );
    }
    console.log(
      `${logPrefix} LOI content found, length: ${htmlContent.length}`,
    );

    // Update generatedAt if not set
    if (!loi.generatedAt) {
      console.log(`${logPrefix} Updating generatedAt timestamp`);
      const now = BigInt(Math.floor(Date.now() / 1000));
      await prisma.letterOfIntent.update({
        where: { id: loi.id },
        data: {
          generatedAt: now,
          status: loi.status === "DRAFTED" ? "DRAFTED" : loi.status,
        },
      });
    }

    // Generate PDF from HTML using Puppeteer
    console.log(`${logPrefix} Launching Puppeteer`);
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      console.log(`${logPrefix} Puppeteer launched successfully`);
    } catch (launchError) {
      console.error(`${logPrefix} Failed to launch Puppeteer:`, launchError);
      throw new Error(
        `Puppeteer launch failed: ${launchError instanceof Error ? launchError.message : String(launchError)}`,
      );
    }

    try {
      const page = await browser.newPage();

      console.log(`${logPrefix} Setting page content`);
      // Set the HTML content
      await page.setContent(htmlContent, {
        waitUntil: "networkidle0",
      });

      console.log(`${logPrefix} Generating PDF buffer`);
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
          top: "20mm",
          right: "20mm",
          bottom: "20mm",
          left: "20mm",
        },
        printBackground: true,
      });

      await browser.close();
      console.log(
        `${logPrefix} PDF generated successfully, size: ${pdfBuffer.length}`,
      );

      const candidateName = `${pipelineStep.pipeline.candidate.firstname} ${pipelineStep.pipeline.candidate.lastname}`;
      const filename = `LOI_${candidateName.replace(/\s+/g, "_")}_${Date.now()}.pdf`;

      // Return PDF as response
      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": pdfBuffer.length.toString(),
        },
      });
    } catch (pdfError) {
      console.error(`${logPrefix} Error during PDF generation:`, pdfError);
      if (browser) await browser.close();
      throw pdfError;
    }
  } catch (error) {
    console.error(`[LOI-PDF-GEN] CRITICAL ERROR:`, error);
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
      { status: 500 },
    );
  }
}
