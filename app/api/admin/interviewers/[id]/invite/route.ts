import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { InterviewerServiceError, sendInterviewerInvite } from "@/lib/services/interviewer-service"

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!/^\d+$/.test(params.id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    const result = await sendInterviewerInvite(BigInt(params.id))
    return NextResponse.json({ invited: result.emailed })
  } catch (error) {
    if (error instanceof InterviewerServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Resend invite error:", error)
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 })
  }
}
