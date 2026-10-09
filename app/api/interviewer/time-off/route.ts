import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireInterviewer } from "@/lib/rbac"
import { addTimeOff, SchedulingError } from "@/lib/scheduling/availability-service"

const schema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().trim().max(255).optional().nullable(),
})

export async function POST(req: NextRequest) {
  const user = await requireInterviewer()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid dates" }, { status: 400 })

  try {
    const created = await addTimeOff(BigInt(user.id), {
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      reason: parsed.data.reason,
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof SchedulingError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Add time off error:", error)
    return NextResponse.json({ error: "Failed to add time off" }, { status: 500 })
  }
}
