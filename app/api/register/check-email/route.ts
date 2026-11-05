import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
})

// Lets the registration wizard fail fast on an already-registered email, before the
// candidate fills in the rest of the form. POST /api/register stays the authoritative check.
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const rateLimit = checkRateLimit(`register-email-check:${ip}`, 20, 60 * 1000)
    if (rateLimit.limited) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a minute and try again." },
        { status: 429 },
      )
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid email" },
        { status: 400 },
      )
    }

    const existing = await prisma.user.findFirst({
      where: { email: { equals: parsed.data.email, mode: "insensitive" } },
      select: { id: true },
    })

    return NextResponse.json({ exists: Boolean(existing) })
  } catch (error) {
    console.error("[Register] email check failed:", error)
    return NextResponse.json({ error: "Could not verify email right now" }, { status: 500 })
  }
}
