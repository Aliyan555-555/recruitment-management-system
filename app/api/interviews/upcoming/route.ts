import { NextResponse } from "next/server"
import { requireCandidate } from "@/lib/rbac"
import { listUpcomingInterviews } from "@/lib/scheduling/candidate-view"

export async function GET() {
  const user = await requireCandidate()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    return NextResponse.json(await listUpcomingInterviews(BigInt(user.id)))
  } catch (error) {
    console.error("Upcoming interviews error:", error)
    return NextResponse.json({ error: "Failed to load interviews" }, { status: 500 })
  }
}
