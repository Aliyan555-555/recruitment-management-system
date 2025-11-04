import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const educationId = BigInt(params.id)

    await prisma.userEducation.delete({
      where: { id: educationId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete education error:", error)
    return NextResponse.json(
      { error: "Failed to delete education" },
      { status: 500 }
    )
  }
}

