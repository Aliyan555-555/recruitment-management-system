import { NextRequest, NextResponse } from "next/server"
import { requireInterviewer } from "@/lib/rbac"
import { EvaluationError, saveDraft, submitEvaluation } from "@/lib/evaluations/service"

async function readFormData(req: NextRequest) {
  const body = await req.json().catch(() => null)
  return body && typeof body === "object" ? (body as { formData?: unknown }).formData : undefined
}

/** Autosave a draft scorecard. */
export async function PUT(req: NextRequest, { params }: { params: { bookingId: string } }) {
  const user = await requireInterviewer()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!/^\d+$/.test(params.bookingId)) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    await saveDraft(BigInt(user.id), BigInt(params.bookingId), await readFormData(req))
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof EvaluationError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Save draft error:", error)
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 })
  }
}

/** Final submission. */
export async function POST(req: NextRequest, { params }: { params: { bookingId: string } }) {
  const user = await requireInterviewer()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!/^\d+$/.test(params.bookingId)) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    const result = await submitEvaluation(BigInt(user.id), BigInt(params.bookingId), await readFormData(req))
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof EvaluationError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Submit evaluation error:", error)
    return NextResponse.json({ error: "Failed to submit scorecard" }, { status: 500 })
  }
}
