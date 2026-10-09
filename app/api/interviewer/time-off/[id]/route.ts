import { NextResponse } from "next/server"
import { requireInterviewer } from "@/lib/rbac"
import { removeTimeOff, SchedulingError } from "@/lib/scheduling/availability-service"

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireInterviewer()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!/^\d+$/.test(params.id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    await removeTimeOff(BigInt(user.id), BigInt(params.id))
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof SchedulingError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Remove time off error:", error)
    return NextResponse.json({ error: "Failed to remove time off" }, { status: 500 })
  }
}
