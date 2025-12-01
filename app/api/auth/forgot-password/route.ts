import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"
import { forgotPasswordSchema } from "@/lib/validations"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate input
    const validation = forgotPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    const { email } = validation.data

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, firstname: true, lastname: true, userStatus: true }
    })

    // If user doesn't exist or is not active, return success anyway for security
    // (prevent email enumeration)
    if (!user || user.userStatus !== "ACTIVE") {
      return NextResponse.json(
        { message: "If an account exists with this email, you will receive a password reset link." },
        { status: 200 }
      )
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = BigInt(Date.now() + 10 * 60 * 1000) // 10 minutes from now

    // Save token to database
    // First, invalidate any existing unused tokens for this user
    // We can do this by marking them as used or deleting them. 
    // The requirement says "Invalidate any existing unused tokens". 
    // Deleting them is cleaner for this use case, or we can just ignore them.
    // Let's delete old unused tokens to keep the table clean.
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null
      }
    })

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        createdAt: BigInt(Date.now())
      }
    })

    // Send email
    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password/${token}`
    const userName = `${user.firstname} ${user.lastname}`
    
    await sendPasswordResetEmail(email, userName, resetLink)

    return NextResponse.json(
      { message: "If an account exists with this email, you will receive a password reset link." },
      { status: 200 }
    )

  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "An error occurred while processing your request." },
      { status: 500 }
    )
  }
}
