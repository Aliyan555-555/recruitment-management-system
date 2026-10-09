import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { SchedulingError } from "@/lib/scheduling/availability-service"
import { previewSlots } from "@/lib/scheduling/slot-service"

export async function GET(req: NextRequest, { params }: { params: { stepId: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const fromDate = searchParams.get("fromDate") ?? ""
  const toDate = searchParams.get("toDate") ?? ""
  if (!/^\d+$/.test(params.stepId) || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    return NextResponse.json({ error: "Choose a valid date range" }, { status: 400 })
  }

  try {
    return NextResponse.json(await previewSlots(BigInt(params.stepId), fromDate, toDate))
  } catch (error) {
    if (error instanceof SchedulingError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Preview slots error:", error)
    return NextResponse.json({ error: "Failed to preview slots" }, { status: 500 })
  }
}
