import { NextResponse } from "next/server"
import { requireInterviewer } from "@/lib/rbac"
import { getInterviewerDashboard } from "@/lib/evaluations/service"

export async function GET() {
  const user = await requireInterviewer()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    return NextResponse.json(await getInterviewerDashboard(BigInt(user.id)))
  } catch (error) {
    console.error("Interviewer dashboard error:", error)
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 })
  }
}
