import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/rbac"
import { InterviewerServiceError, setInterviewerSuspended } from "@/lib/services/interviewer-service"

const patchSchema = z.object({ suspended: z.boolean() })

function parseId(raw: string): bigint | null {
  return /^\d+$/.test(raw) ? BigInt(raw) : null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = parseId(params.id)
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (id === null || !parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    await setInterviewerSuspended(id, parsed.data.suspended)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof InterviewerServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Update interviewer error:", error)
    return NextResponse.json({ error: "Failed to update interviewer" }, { status: 500 })
  }
}
