import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateResetTokenSchema } from "@/lib/validations"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate input
    const validation = validateResetTokenSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      )
    }

    const { token } = validation.data

    // Find token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { email: true } } }
    })

    if (!resetToken) {
      return NextResponse.json(
        { valid: false, message: "Invalid or expired token" },
        { status: 200 } // Return 200 to handle in UI gracefully
      )
    }

    // Check if used
    if (resetToken.usedAt) {
      return NextResponse.json(
        { valid: false, message: "This link has already been used" },
        { status: 200 }
      )
    }

    // Check if expired
    const now = BigInt(Date.now())
    if (resetToken.expiresAt < now) {
      return NextResponse.json(
        { valid: false, message: "This link has expired" },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { valid: true, email: resetToken.user.email },
      { status: 200 }
    )

  } catch (error) {
    console.error("Validate token error:", error)
    return NextResponse.json(
      { error: "An error occurred while validating the token." },
      { status: 500 }
    )
  }
}
