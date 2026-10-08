import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { scoreRemainingCandidates } from "@/lib/services/ai-shortlist-service"

// Explicitly AI-score candidates that were excluded by hard filters (after an admin relaxed a filter).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const ids: unknown = body?.candidateIds
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500) {
      return NextResponse.json({ error: "candidateIds is required" }, { status: 400 })
    }

    let candidateIds: bigint[]
    try {
      candidateIds = ids.map((id) => BigInt(id))
    } catch {
      return NextResponse.json({ error: "Invalid candidateIds" }, { status: 400 })
    }

    const result = await scoreRemainingCandidates(BigInt(params.id), BigInt(params.runId), candidateIds)
    if (!result.success) {
      const status =
        result.code === "RUN_NOT_FOUND" ? 404 : result.code === "RUN_IN_PROGRESS" ? 409 : 400
      return NextResponse.json({ error: result.error, code: result.code }, { status })
    }
    return NextResponse.json({ success: true, count: result.count }, { status: 202 })
  } catch (error: any) {
    console.error("Error scoring remaining candidates:", error)
    return NextResponse.json({ error: error.message || "Failed to score candidates" }, { status: 500 })
  }
}
