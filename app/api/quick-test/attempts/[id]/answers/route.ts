import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireCandidate } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import {
  QuickTestAnswerError,
  ensureAttemptCurrent,
  saveAnswers,
} from "@/lib/services/quick-test-service"
import { isFinalStatus } from "@/lib/quick-test/rules"

export const runtime = "nodejs"

const bodySchema = z.object({
  questionId: z.string().regex(/^\d+$/, "Invalid question id"),
  selectedOption: z.string().min(1).max(500),
})

/** Autosaves a single answer so progress survives a reload or an expired timer. */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCandidate()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Candidate access required" }, { status: 401 })
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request body" },
        { status: 400 }
      )
    }

    let attemptId: bigint
    try {
      attemptId = BigInt(params.id)
    } catch {
      return NextResponse.json({ error: "Invalid attempt id" }, { status: 400 })
    }

    const found = await prisma.quickTestAttempt.findUnique({ where: { id: attemptId } })
    if (!found || found.userId !== BigInt(user.id)) {
      return NextResponse.json({ error: "Quick test attempt not found" }, { status: 404 })
    }

    const attempt = await ensureAttemptCurrent(found)
    if (isFinalStatus(attempt.status)) {
      return NextResponse.json(
        { error: "This quick test is already finished", code: "ATTEMPT_CLOSED" },
        { status: 409 }
      )
    }

    await saveAnswers(attempt.id, [parsed.data])
    return NextResponse.json({ saved: true })
  } catch (error) {
    if (error instanceof QuickTestAnswerError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[Quick Test] Failed to save answer:", error)
    return NextResponse.json({ error: "Failed to save answer" }, { status: 500 })
  }
}
