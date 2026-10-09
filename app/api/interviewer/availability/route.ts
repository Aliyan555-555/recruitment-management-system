import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireInterviewer } from "@/lib/rbac"
import { getAvailability, replaceAvailability, SchedulingError } from "@/lib/scheduling/availability-service"

const minute = z.number().int().min(0).max(1440)
const schema = z.object({
  weekly: z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), startMinute: minute, endMinute: minute })).max(70),
  oneOff: z
    .array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startMinute: minute, endMinute: minute }))
    .max(200),
})

export async function GET() {
  const user = await requireInterviewer()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    return NextResponse.json(await getAvailability(BigInt(user.id)))
  } catch (error) {
    console.error("Get availability error:", error)
    return NextResponse.json({ error: "Failed to load availability" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const user = await requireInterviewer()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid availability" }, { status: 400 })

  try {
    await replaceAvailability(BigInt(user.id), parsed.data)
    return NextResponse.json(await getAvailability(BigInt(user.id)))
  } catch (error) {
    if (error instanceof SchedulingError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Save availability error:", error)
    return NextResponse.json({ error: "Failed to save availability" }, { status: 500 })
  }
}
