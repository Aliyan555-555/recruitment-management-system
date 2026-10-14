import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { SchedulingError } from "@/lib/scheduling/availability-service"
import { getRoundCandidateDetail } from "@/lib/scheduling/round-candidates-service"

export async function GET(_req: Request, { params }: { params: { stepId: string; candidateId: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!/^\d+$/.test(params.stepId) || !/^\d+$/.test(params.candidateId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  try {
    return NextResponse.json(await getRoundCandidateDetail(BigInt(params.stepId), BigInt(params.candidateId)))
  } catch (error) {
    if (error instanceof SchedulingError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Round candidate detail error:", error)
    return NextResponse.json({ error: "Failed to load candidate" }, { status: 500 })
  }
}
