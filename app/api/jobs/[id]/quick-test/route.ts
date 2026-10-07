import { NextRequest, NextResponse } from "next/server"
import { requireCandidate } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { getCurrentAttempt, getEnabledQuickTest } from "@/lib/services/quick-test-service"
import { serializeCandidateAttempt, serializeQuickTestConfig } from "@/lib/quick-test/serializers"
import { toCandidateState } from "@/lib/quick-test/rules"

export const runtime = "nodejs"

/** Quick test requirement + the signed-in candidate's attempt state for a job. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireCandidate()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Candidate access required" }, { status: 401 })
    }

    let jobId: bigint
    try {
      jobId = BigInt(params.id)
    } catch {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 })
    }

    const userId = BigInt(user.id)
    const config = await getEnabledQuickTest(jobId)
    if (!config) {
      return NextResponse.json({ required: false, state: "NOT_REQUIRED" })
    }

    const [attempt, application] = await Promise.all([
      getCurrentAttempt(jobId, userId),
      prisma.jobsApplied.findUnique({
        where: { jobId_userId: { jobId, userId } },
        select: { id: true },
      }),
    ])

    return NextResponse.json({
      required: true,
      state: toCandidateState(attempt?.status),
      hasApplied: application != null,
      config: serializeQuickTestConfig(config),
      attempt: attempt ? serializeCandidateAttempt(attempt) : null,
    })
  } catch (error) {
    console.error("[Quick Test] Failed to load status:", error)
    return NextResponse.json({ error: "Failed to load quick test status" }, { status: 500 })
  }
}
