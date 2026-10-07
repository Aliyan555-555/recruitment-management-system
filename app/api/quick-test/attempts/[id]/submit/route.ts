import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireCandidate } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import {
  QuickTestAnswerError,
  finalizeAttempt,
  saveAnswers,
} from "@/lib/services/quick-test-service"
import { serializeCandidateAttempt } from "@/lib/quick-test/serializers"
import { isFinalStatus, isPastDeadline } from "@/lib/quick-test/rules"

export const runtime = "nodejs"

const bodySchema = z
  .object({
    answers: z
      .array(
        z.object({
          questionId: z.string().regex(/^\d+$/),
          selectedOption: z.string().min(1).max(500),
        })
      )
      .max(100)
      .optional(),
  })
  .optional()

/**
 * Finishes the attempt. The server clock is authoritative: inside the deadline (plus a short grace
 * period) the attempt is SUBMITTED, otherwise it is EXPIRED and scored on the answers already saved.
 * Safe to call repeatedly.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCandidate()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Candidate access required" }, { status: 401 })
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => undefined))
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    let attemptId: bigint
    try {
      attemptId = BigInt(params.id)
    } catch {
      return NextResponse.json({ error: "Invalid attempt id" }, { status: 400 })
    }

    const attempt = await prisma.quickTestAttempt.findUnique({ where: { id: attemptId } })
    if (!attempt || attempt.userId !== BigInt(user.id)) {
      return NextResponse.json({ error: "Quick test attempt not found" }, { status: 404 })
    }

    if (isFinalStatus(attempt.status)) {
      return NextResponse.json({ attempt: serializeCandidateAttempt(attempt), alreadySubmitted: true })
    }

    const pastDeadline = isPastDeadline(attempt.expiresAt)
    if (!pastDeadline && parsed.data?.answers?.length) {
      await saveAnswers(attempt.id, parsed.data.answers)
    }

    const finalized = await finalizeAttempt(attempt.id, pastDeadline ? "EXPIRED" : "SUBMITTED")
    if (!finalized) {
      return NextResponse.json({ error: "Quick test attempt not found" }, { status: 404 })
    }

    return NextResponse.json({
      attempt: serializeCandidateAttempt(finalized),
      expired: finalized.status === "EXPIRED",
    })
  } catch (error) {
    if (error instanceof QuickTestAnswerError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[Quick Test] Failed to submit:", error)
    return NextResponse.json({ error: "Failed to submit the quick test" }, { status: 500 })
  }
}
