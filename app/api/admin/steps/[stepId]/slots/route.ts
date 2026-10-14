import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/rbac"
import { SchedulingError } from "@/lib/scheduling/availability-service"
import { notifySlotsPublished } from "@/lib/scheduling/notifications"
import { listRoundSlots, publishSlots, publishSpecificSlots } from "@/lib/scheduling/slot-service"

const slotItemSchema = z.object({
  startsAt: z.string(),
  endsAt: z.string(),
  interviewerIds: z.array(z.string().regex(/^\d+$/)),
  capacity: z.number().int().min(1).optional(),
  mode: z.enum(["REMOTE", "ONSITE"]).nullable().optional(),
  meetingLink: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
})

const rangeSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const postSchema = z.union([
  rangeSchema,
  z.object({
    slots: z.array(slotItemSchema).min(1),
  }),
])

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

/** Publish: generate slots from interviewer availability for the chosen dates OR publish selected slots. */
export async function POST(req: NextRequest, { params }: { params: { stepId: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const stepId = parseStepId(params.stepId)
  const parsed = postSchema.safeParse(await req.json().catch(() => null))
  if (stepId === null || !parsed.success) return NextResponse.json({ error: "Choose a valid date range or slot list" }, { status: 400 })

  try {
    let result: { created: number }
    if ("slots" in parsed.data) {
      result = await publishSpecificSlots(stepId, parsed.data.slots, BigInt(admin.id))
    } else {
      result = await publishSlots(stepId, parsed.data.fromDate, parsed.data.toDate, BigInt(admin.id))
    }
    // candidates already waiting for a slot get an email + in-app notice
    const notified = await notifySlotsPublished(stepId)
    return NextResponse.json({ ...result, notified }, { status: 201 })
  } catch (error) {
    if (error instanceof SchedulingError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Publish slots error:", error)
    return NextResponse.json({ error: "Failed to publish slots" }, { status: 500 })
  }
}
