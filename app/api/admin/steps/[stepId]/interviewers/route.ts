import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/rbac"
import { SchedulingError } from "@/lib/scheduling/availability-service"
import { getStepPool, setStepPool } from "@/lib/scheduling/step-pool-service"

const schema = z.object({ interviewerIds: z.array(z.string().regex(/^\d+$/)).max(200) })

export async function GET(_req: Request, { params }: { params: { stepId: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!/^\d+$/.test(params.stepId)) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    return NextResponse.json(await getStepPool(BigInt(params.stepId)))
  } catch (error) {
    if (error instanceof SchedulingError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Get round interviewers error:", error)
    return NextResponse.json({ error: "Failed to load interviewers" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { stepId: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!/^\d+$/.test(params.stepId)) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid interviewers" }, { status: 400 })

  try {
    await setStepPool(BigInt(params.stepId), parsed.data.interviewerIds)
    return NextResponse.json(await getStepPool(BigInt(params.stepId)))
  } catch (error) {
    if (error instanceof SchedulingError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("Set round interviewers error:", error)
    return NextResponse.json({ error: "Failed to save interviewers" }, { status: 500 })
  }
}
