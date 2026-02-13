import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const offerId = BigInt(params.id);
    const body = await req.json();
    const { status } = body;

    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const offer = await prisma.offerLetter.findUnique({
      where: { id: offerId },
      include: {
        candidate: true,
      },
    });

    if (!offer) {
      return NextResponse.json(
        { error: "Offer letter not found" },
        { status: 404 },
      );
    }

    // Convert session.user.id to BigInt for comparison
    const userIdBigInt = BigInt(session.user.id);

    if (offer.candidateId !== userIdBigInt) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Strict check: Offer must be in SENT state to be acted upon
    if (offer.status !== "SENT") {
      // If already in the target state, return success idempotently
      if (offer.status === status) {
        return NextResponse.json({
          success: true,
          message: "Offer is already in this state",
        });
      }
      return NextResponse.json(
        { error: "Offer letter is not in a pending state" },
        { status: 400 },
      );
    }

    const now = BigInt(Math.floor(Date.now() / 1000));
    const updateData: any = {
      status: status,
      updatedAt: now,
    };

    if (status === "ACCEPTED") {
      updateData.acceptedAt = now;
    } else if (status === "REJECTED") {
      updateData.rejectedAt = now;
    }

    // Update Offer Letter
    const updatedOffer = await prisma.offerLetter.update({
      where: { id: offerId },
      data: updateData,
    });

    // Update Pipeline Step and Overall Status
    if (offer.pipelineStepId) {
      const pipelineStep = await prisma.candidatePipelineStep.findUnique({
        where: { id: offer.pipelineStepId },
        select: { id: true, pipelineId: true, status: true },
      });

      if (pipelineStep) {
        if (status === "ACCEPTED") {
          // Update Pipeline Step to COMPLETED
          if (pipelineStep.status !== "COMPLETED") {
            await prisma.candidatePipelineStep.update({
              where: { id: pipelineStep.id },
              data: {
                status: "COMPLETED",
                completedAt: now,
              },
            });
          }

          // Update Overall Pipeline to COMPLETED (HOPEFULLY HIRED)
          await prisma.candidatePipeline.update({
            where: { id: pipelineStep.pipelineId },
            data: {
              overallStatus: "COMPLETED",
              completedAt: now,
            },
          });
        } else if (status === "REJECTED") {
          // Update Pipeline Step to REJECTED
          if (pipelineStep.status !== "REJECTED") {
            await prisma.candidatePipelineStep.update({
              where: { id: pipelineStep.id },
              data: {
                status: "REJECTED",
                completedAt: now,
              },
            });
          }

          // Update Overall Pipeline to REJECTED
          await prisma.candidatePipeline.update({
            where: { id: pipelineStep.pipelineId },
            data: {
              overallStatus: "REJECTED",
              completedAt: now,
              lockState: "LOCKED_REJECTED",
            },
          });
        }
      }
    }

    // Convert BigInt values to strings for JSON serialization
    const serializedOffer = JSON.parse(
      JSON.stringify(updatedOffer, (key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    );

    return NextResponse.json({ success: true, offer: serializedOffer });
  } catch (error: any) {
    console.error("Error updating offer letter status:", error);
    return NextResponse.json(
      { error: "Failed to update offer letter status" },
      { status: 500 },
    );
  }
}
