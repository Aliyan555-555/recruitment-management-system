import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/rbac"
import { getOrgTimeZone } from "@/lib/scheduling/org-settings"

/** Interview slots in a date range across all jobs (admin agenda). */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const start = new Date(searchParams.get("startDate") ?? "")
  const end = new Date(searchParams.get("endDate") ?? "")
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return NextResponse.json({ error: "Choose a valid date range" }, { status: 400 })
  }
  if (end.getTime() - start.getTime() > 93 * 24 * 3600 * 1000) {
    return NextResponse.json({ error: "Choose at most 3 months at a time" }, { status: 400 })
  }
  const interviewerParam = searchParams.get("interviewerId")
  const interviewerId = interviewerParam && /^\d+$/.test(interviewerParam) ? BigInt(interviewerParam) : null

  try {
    const [timeZone, slots] = await Promise.all([
      getOrgTimeZone(),
      prisma.interviewSlot.findMany({
        where: {
          startsAt: { gte: start, lt: end },
          ...(interviewerId ? { interviewers: { some: { interviewerId } } } : {}),
        },
        orderBy: { startsAt: "asc" },
        take: 1500,
        include: {
          interviewers: { include: { interviewer: { select: { id: true, firstname: true, lastname: true } } } },
          step: { include: { workflow: { include: { job: { select: { id: true, title: true } } } } } },
          bookings: {
            where: { status: { in: ["RESERVED", "COMPLETED", "NO_SHOW"] } },
            include: { candidate: { select: { id: true, firstname: true, lastname: true } } },
          },
        },
      }),
    ])

    return NextResponse.json({
      timeZone,
      slots: slots.map((s) => ({
        id: s.id.toString(),
        stepId: s.stepId.toString(),
        stepName: s.step.stepName,
        jobId: s.step.workflow.job.id.toString(),
        jobTitle: s.step.workflow.job.title,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        capacity: s.capacity,
        bookedCount: s.bookedCount,
        isBlocked: s.isBlocked,
        mode: s.mode,
        interviewers: s.interviewers.map((i) => ({
          id: i.interviewer.id.toString(),
          name: `${i.interviewer.firstname} ${i.interviewer.lastname}`,
        })),
        candidates: s.bookings.map((b) => ({
          id: b.candidate.id.toString(),
          name: `${b.candidate.firstname} ${b.candidate.lastname}`,
          status: b.status,
        })),
      })),
    })
  } catch (error) {
    console.error("Calendar error:", error)
    return NextResponse.json({ error: "Failed to load calendar" }, { status: 500 })
  }
}
