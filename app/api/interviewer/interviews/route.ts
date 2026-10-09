import { NextRequest, NextResponse } from "next/server"
import { requireInterviewer } from "@/lib/rbac"
import { listInterviewerInterviews, type InterviewTab } from "@/lib/evaluations/service"

const TABS: InterviewTab[] = ["upcoming", "needs-feedback", "completed"]

export async function GET(req: NextRequest) {
  const user = await requireInterviewer()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tab = new URL(req.url).searchParams.get("tab") ?? "upcoming"
  if (!TABS.includes(tab as InterviewTab)) return NextResponse.json({ error: "Invalid tab" }, { status: 400 })

  try {
    return NextResponse.json(await listInterviewerInterviews(BigInt(user.id), tab as InterviewTab))
  } catch (error) {
    console.error("List interviews error:", error)
    return NextResponse.json({ error: "Failed to load interviews" }, { status: 500 })
  }
}
