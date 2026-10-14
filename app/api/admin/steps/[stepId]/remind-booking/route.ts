import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/rbac"
import { SchedulingError } from "@/lib/scheduling/availability-service"
import { remindToBook } from "@/lib/scheduling/round-candidates-service"

const schema = z.object({ candidateIds: z.array(z.string().regex(/^\d+$/)).min(1).max(500) })

export async function POST(req: NextRequest, { params }: { params: { stepId: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!/^\d+$/.test(params.stepId) || !parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    return NextResponse.json(await remindToBook(BigInt(params.stepId), parsed.data.candidateIds.map((id) => BigInt(id))))
  } catch (error) {
    if (error instanceof SchedulingError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Remind booking error:", error)
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 })
  }
}
