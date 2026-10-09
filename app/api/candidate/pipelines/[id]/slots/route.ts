import { NextResponse } from "next/server"
import { requireCandidate } from "@/lib/rbac"
import { getCandidateSlotsView } from "@/lib/scheduling/candidate-view"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireCandidate()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!/^\d+$/.test(params.id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    const view = await getCandidateSlotsView(BigInt(user.id), BigInt(params.id))
    if (!view) return NextResponse.json({ error: "Application not found" }, { status: 404 })
    return NextResponse.json(view)
  } catch (error) {
    console.error("Candidate slots error:", error)
    return NextResponse.json({ error: "Failed to load interview slots" }, { status: 500 })
  }
}
