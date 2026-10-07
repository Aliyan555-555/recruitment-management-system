import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { ensureAttemptCurrent } from "@/lib/services/quick-test-service"
import { serializeAdminAttemptDetail } from "@/lib/quick-test/serializers"

export const runtime = "nodejs"

/** Full question-by-question breakdown of one attempt (admins see the correct answers). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; attemptId: string } }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    let jobId: bigint
    let attemptId: bigint
    try {
      jobId = BigInt(params.id)
      attemptId = BigInt(params.attemptId)
    } catch {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    }

    const found = await prisma.quickTestAttempt.findFirst({
      where: { id: attemptId, jobId },
      include: {
        questions: true,
        answers: true,
        user: { select: { firstname: true, lastname: true, email: true } },
      },
    })

    if (!found) {
      return NextResponse.json({ error: "Quick test attempt not found" }, { status: 404 })
    }

    const attempt = await ensureAttemptCurrent(found)
    // Re-read answers if lazy finalisation just scored them.
    const answers =
      attempt.status !== found.status
        ? await prisma.quickTestAnswer.findMany({ where: { attemptId } })
        : found.answers

    return NextResponse.json({
      candidate: {
        name: `${found.user.firstname} ${found.user.lastname}`.trim(),
        email: found.user.email,
      },
      attempt: serializeAdminAttemptDetail(attempt, found.questions, answers),
    })
  } catch (error) {
    console.error("[Quick Test] Admin detail failed:", error)
    return NextResponse.json({ error: "Failed to load quick test attempt" }, { status: 500 })
  }
}
