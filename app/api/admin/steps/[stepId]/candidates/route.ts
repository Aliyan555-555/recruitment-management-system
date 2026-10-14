import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { SchedulingError } from "@/lib/scheduling/availability-service"
import { getRoundCandidates } from "@/lib/scheduling/round-candidates-service"

export async function GET(_req: Request, { params }: { params: { stepId: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!/^\d+$/.test(params.stepId)) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    return NextResponse.json(await getRoundCandidates(BigInt(params.stepId)))
  } catch (error) {
    if (error instanceof SchedulingError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Round candidates error:", error)
    return NextResponse.json({ error: "Failed to load candidates" }, { status: 500 })
  }
}
