import { NextResponse } from "next/server"
import { requireCandidate } from "@/lib/rbac"
import { getCandidateNextSteps } from "@/lib/scheduling/candidate-next-step-service"

export async function GET() {
  const user = await requireCandidate()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    return NextResponse.json(await getCandidateNextSteps(BigInt(user.id)))
  } catch (error) {
    console.error("Candidate next steps error:", error)
    return NextResponse.json({ error: "Failed to load next steps" }, { status: 500 })
  }
}
