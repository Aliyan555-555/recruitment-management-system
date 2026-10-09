import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/rbac"
import { SchedulingError } from "@/lib/scheduling/availability-service"
import { notifySlotsPublished } from "@/lib/scheduling/notifications"
import { listRoundSlots, publishSlots } from "@/lib/scheduling/slot-service"

const rangeSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

function parseStepId(raw: string): bigint | null {
  return /^\d+$/.test(raw) ? BigInt(raw) : null
}

export async function GET(_req: NextRequest, { params }: { params: { stepId: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const stepId = parseStepId(params.stepId)
  if (stepId === null) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    return NextResponse.json(await listRoundSlots(stepId))
  } catch (error) {
    console.error("List slots error:", error)
    return NextResponse.json({ error: "Failed to load slots" }, { status: 500 })
  }
}

/** Publish: generate slots from interviewer availability for the chosen dates. */
export async function POST(req: NextRequest, { params }: { params: { stepId: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const stepId = parseStepId(params.stepId)
  const parsed = rangeSchema.safeParse(await req.json().catch(() => null))
  if (stepId === null || !parsed.success) return NextResponse.json({ error: "Choose a valid date range" }, { status: 400 })

  try {
    const result = await publishSlots(stepId, parsed.data.fromDate, parsed.data.toDate, BigInt(admin.id))
    // candidates already waiting for a slot get an email + in-app notice
    const notified = await notifySlotsPublished(stepId)
    return NextResponse.json({ ...result, notified }, { status: 201 })
  } catch (error) {
    if (error instanceof SchedulingError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Publish slots error:", error)
    return NextResponse.json({ error: "Failed to publish slots" }, { status: 500 })
  }
}
