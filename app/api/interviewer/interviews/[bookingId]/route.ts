import { NextResponse } from "next/server"
import { requireInterviewer } from "@/lib/rbac"
import { EvaluationError, getInterviewDetail } from "@/lib/evaluations/service"

export async function GET(_req: Request, { params }: { params: { bookingId: string } }) {
  const user = await requireInterviewer()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!/^\d+$/.test(params.bookingId)) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    return NextResponse.json(await getInterviewDetail(BigInt(user.id), BigInt(params.bookingId)))
  } catch (error) {
    if (error instanceof EvaluationError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Interview detail error:", error)
    return NextResponse.json({ error: "Failed to load interview" }, { status: 500 })
  }
}
