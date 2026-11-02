import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePdfFromHtml } from "@/lib/pdf-generator";

// GET /api/candidate/offer/[id]/pdf - Get Offer Letter PDF for candidate
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const logPrefix = `[CANDIDATE-OFFER-PDF] [id=${params.id}]`;
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const offerId = BigInt(params.id);
    const userId = BigInt(session.user.id);

    const offer = await prisma.offerLetter.findUnique({
      where: { id: offerId },
      include: {
        candidate: {
          select: {
            id: true,
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
    });

    if (!offer) {
      return NextResponse.json(
        { error: "Offer Letter not found" },
        { status: 404 },
      );
    }

    // Ensure the candidate can only access their own Offer Letter
    if (offer.candidateId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized - You can only view your own Offer Letter" },
        { status: 403 },
      );
    }

    // Extract HTML content from formData
    const formData = offer.formData as any;
    const htmlContent =
      formData?.content || (typeof formData === "string" ? formData : null);

    if (!htmlContent) {
      return NextResponse.json(
        { error: "Offer Letter content not found." },
        { status: 400 },
      );
    }

    console.log(`${logPrefix} Generating PDF buffer from HTML`);
    const pdfBuffer = await generatePdfFromHtml(htmlContent, {
      format: "A4",
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
      printBackground: true,
    });

    const candidateName = `${offer.candidate.firstname} ${offer.candidate.lastname}`;
    const filename = `OfferLetter_${candidateName.replace(/\s+/g, "_")}_${Date.now()}.pdf`;

    // Return PDF as response
    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error(`${logPrefix} CRITICAL ERROR:`, error);
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
