import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/rbac"
import { SchedulingError } from "@/lib/scheduling/availability-service"
import { deleteSlot, setSlotBlocked } from "@/lib/scheduling/slot-service"

const patchSchema = z.object({ isBlocked: z.boolean() })

export async function PATCH(req: NextRequest, { params }: { params: { slotId: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!/^\d+$/.test(params.slotId) || !parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    await setSlotBlocked(BigInt(params.slotId), parsed.data.isBlocked)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof SchedulingError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Update slot error:", error)
    return NextResponse.json({ error: "Failed to update slot" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { slotId: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!/^\d+$/.test(params.slotId)) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    await deleteSlot(BigInt(params.slotId))
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof SchedulingError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Delete slot error:", error)
    return NextResponse.json({ error: "Failed to delete slot" }, { status: 500 })
  }
}
