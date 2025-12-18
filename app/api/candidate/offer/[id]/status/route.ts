
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const offerId = BigInt(params.id)
    const { status } = await req.json()

    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const offer = await prisma.offerLetter.findUnique({
      where: { id: offerId },
      include: {
        candidate: true
      }
    })

    if (!offer) {
      return NextResponse.json({ error: "Offer letter not found" }, { status: 404 })
    }

    if (offer.candidateId !== BigInt(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (offer.status !== "SENT") {
      return NextResponse.json({ error: "Offer letter is not in a pending state" }, { status: 400 })
    }

    const updateData: any = {
      status: status,
      updatedAt: BigInt(Math.floor(Date.now() / 1000))
    }

    if (status === "ACCEPTED") {
      updateData.acceptedAt = BigInt(Math.floor(Date.now() / 1000))
    } else if (status === "REJECTED") {
      updateData.rejectedAt = BigInt(Math.floor(Date.now() / 1000))
    }

    const updatedOffer = await prisma.offerLetter.update({
      where: { id: offerId },
      data: updateData
    })

    // Convert BigInt values to strings for JSON serialization
    const serializedOffer = JSON.parse(
      JSON.stringify(updatedOffer, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    )

    return NextResponse.json({ success: true, offer: serializedOffer })

  } catch (error: any) {
    console.error("Error updating offer letter status:", error)
    return NextResponse.json({ error: "Failed to update offer letter status" }, { status: 500 })
  }
}
