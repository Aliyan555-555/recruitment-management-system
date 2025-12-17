
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

    const loiId = BigInt(params.id)
    const { status } = await req.json()

    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const loi = await prisma.letterOfIntent.findUnique({
      where: { id: loiId },
      include: {
        candidate: true
      }
    })

    if (!loi) {
      return NextResponse.json({ error: "LOI not found" }, { status: 404 })
    }

    if (loi.candidateId !== BigInt(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (loi.status !== "SENT") {
       // Allow changing if it was already accepted/rejected? Maybe not for now to keep it simple.
       // The user said "option to candidate have see LOI and make action".
       // If it's already acted upon, maybe we shouldn't allow changing it easily.
       return NextResponse.json({ error: "LOI is not in a pending state" }, { status: 400 })
    }

    const updateData: any = {
      status: status,
      updatedAt: BigInt(Date.now() / 1000)
    }

    if (status === "ACCEPTED") {
      updateData.acceptedAt = BigInt(Date.now() / 1000)
    } else if (status === "REJECTED") {
      updateData.rejectedAt = BigInt(Date.now() / 1000)
    }

    const updatedLoi = await prisma.letterOfIntent.update({
      where: { id: loiId },
      data: updateData
    })

    return NextResponse.json({ success: true, loi: updatedLoi })

  } catch (error: any) {
    console.error("Error updating LOI status:", error)
    return NextResponse.json({ error: "Failed to update LOI status" }, { status: 500 })
  }
}
