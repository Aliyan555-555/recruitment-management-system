import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireInterviewer } from "@/lib/rbac"

export async function POST(req: NextRequest) {
  const user = await requireInterviewer()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { stepId, startsAt, endsAt, capacity } = body || {}
    if (!stepId || !startsAt || !endsAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const starts = new Date(startsAt)
    const ends = new Date(endsAt)
    if (!(starts instanceof Date) || !(ends instanceof Date) || isNaN(starts.getTime()) || isNaN(ends.getTime()) || ends <= starts) {
      return NextResponse.json({ error: "Invalid time range" }, { status: 400 })
    }

    const now = BigInt(Math.floor(Date.now() / 1000))
    const slot = await (prisma as any).interviewSlot.create({
      data: {
        stepId: BigInt(stepId),
        interviewerId: BigInt(user.id),
        startsAt: starts,
        endsAt: ends,
        capacity: typeof capacity === "number" && capacity > 0 ? capacity : 1,
        createdAt: now,
        updatedAt: now,
      }
    })

    return NextResponse.json({ id: slot.id.toString(), status: "OK" })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create slot" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const user = await requireInterviewer()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const stepId = searchParams.get("stepId")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const where: any = { interviewerId: BigInt(user.id) }
    if (stepId) where.stepId = BigInt(stepId)
    if (from || to) where.startsAt = {}
    if (from) where.startsAt.gte = new Date(from)
    if (to) where.startsAt.lte = new Date(to)

    const slots = await (prisma as any).interviewSlot.findMany({
      where,
      include: { _count: { select: { bookings: true } } },
      orderBy: { startsAt: "asc" }
    })

    return NextResponse.json({
      slots: (slots as any[]).map((s: any) => ({
        id: s.id.toString(),
        stepId: s.stepId.toString(),
        interviewerId: s.interviewerId.toString(),
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        capacity: s.capacity,
        isBlocked: s.isBlocked,
        booked: s._count.bookings,
      }))
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to list slots" }, { status: 500 })
  }
}


