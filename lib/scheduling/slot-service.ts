import { prisma } from "@/lib/prisma"
import { dateKeyMinuteToUtc, addDaysToDateKey, zonedDateKey } from "@/lib/timezone"
import { readStepConfig } from "@/lib/workflow/step-config"
import { SchedulingError } from "./availability-service"
import { getOrgTimeZone } from "./org-settings"
import { deriveInterviewStatus } from "./derived-status"
import { generateSlots, listDateKeys, MAX_RANGE_DAYS, summarizeDrafts, type SlotDraft } from "./slot-generator"

/** Candidates cannot book a slot that starts sooner than this (gives interviewers notice). */
export const MIN_LEAD_MINUTES = 60

const nowSeconds = () => BigInt(Math.floor(Date.now() / 1000))

export interface DraftContext {
  stepId: bigint
  stepName: string
  timeZone: string
  config: ReturnType<typeof readStepConfig>
  drafts: SlotDraft[]
  poolSize: number
  warnings: string[]
}

async function loadInterviewStep(stepId: bigint) {
  const step = await prisma.workflowStep.findUnique({
    where: { id: stepId },
    include: {
      workflow: { select: { jobId: true } },
      interviewers: {
        where: { interviewer: { role: "INTERVIEWER", suspended: false, deletedAt: null } },
        include: { interviewer: { select: { id: true, firstname: true, lastname: true } } },
      },
    },
  })
  if (!step) throw new SchedulingError("Round not found", 404)
  const config = readStepConfig(step)
  if (!config.isInterview) throw new SchedulingError("Only interview rounds have slots")
  return { step, config }
}

function validateRange(fromDate: string, toDate: string, timeZone: string) {
  let days: string[]
  try {
    days = listDateKeys(fromDate, toDate)
  } catch {
    throw new SchedulingError("Choose a valid date range")
  }
  if (days.length === 0) throw new SchedulingError("End date must be on or after start date")
  if (days.length > MAX_RANGE_DAYS) throw new SchedulingError(`Choose at most ${MAX_RANGE_DAYS} days at a time`)
  if (toDate < zonedDateKey(new Date(), timeZone)) throw new SchedulingError("The date range is in the past")
}

export async function buildDrafts(stepId: bigint, fromDate: string, toDate: string): Promise<DraftContext> {
  const timeZone = await getOrgTimeZone()
  validateRange(fromDate, toDate, timeZone)
  const { step, config } = await loadInterviewStep(stepId)

  const pool = step.interviewers.map((p) => p.interviewer)
  const poolIds = pool.map((p) => p.id)
  const warnings: string[] = []
  if (pool.length === 0) warnings.push("No interviewers are assigned to this round. Add them in the job settings.")
  else if (pool.length < config.panelSize) {
    warnings.push(`This round needs ${config.panelSize} interviewers per session but only ${pool.length} ${pool.length === 1 ? "is" : "are"} assigned.`)
  }

  const rangeStart = dateKeyMinuteToUtc(addDaysToDateKey(fromDate, -1), 0, timeZone)
  const rangeEnd = dateKeyMinuteToUtc(addDaysToDateKey(toDate, 2), 0, timeZone)

  const [availability, timeOff, busy, load] = poolIds.length
    ? await Promise.all([
        prisma.interviewerAvailability.findMany({ where: { interviewerId: { in: poolIds }, isActive: true } }),
        prisma.interviewerTimeOff.findMany({ where: { interviewerId: { in: poolIds }, endsAt: { gt: rangeStart }, startsAt: { lt: rangeEnd } } }),
        prisma.slotInterviewer.findMany({
          where: {
            interviewerId: { in: poolIds },
            slot: { startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } },
          },
          select: { interviewerId: true, slot: { select: { startsAt: true, endsAt: true } } },
        }),
        prisma.slotInterviewer.groupBy({
          by: ["interviewerId"],
          where: { interviewerId: { in: poolIds }, slot: { startsAt: { gt: new Date() } } },
          _count: { _all: true },
        }),
      ])
    : [[], [], [], []]

  const withoutAvailability = pool.filter((p) => !availability.some((a) => a.interviewerId === p.id))
  if (pool.length > 0 && withoutAvailability.length === pool.length) {
    warnings.push("None of the assigned interviewers have set their availability yet.")
  } else if (withoutAvailability.length > 0) {
    warnings.push(`No availability set by: ${withoutAvailability.map((p) => `${p.firstname} ${p.lastname}`).join(", ")}.`)
  }

  const drafts = generateSlots({
    timeZone,
    fromDate,
    toDate,
    durationMins: config.durationMins,
    bufferMins: config.bufferMins,
    panelSize: config.panelSize,
    capacity: config.groupSize,
    now: new Date(),
    minLeadMins: MIN_LEAD_MINUTES,
    interviewers: pool.map((p) => ({
      id: p.id.toString(),
      availability: availability
        .filter((a) => a.interviewerId === p.id)
        .map((a) => ({
          dayOfWeek: a.dayOfWeek,
          date: a.date ? a.date.toISOString().slice(0, 10) : null,
          startMinute: a.startMinute,
          endMinute: a.endMinute,
        })),
      timeOff: timeOff.filter((t) => t.interviewerId === p.id).map((t) => ({ startsAt: t.startsAt, endsAt: t.endsAt })),
      busy: busy.filter((b) => b.interviewerId === p.id).map((b) => ({ startsAt: b.slot.startsAt, endsAt: b.slot.endsAt })),
      load: load.find((l) => l.interviewerId === p.id)?._count._all ?? 0,
    })),
  })

  return { stepId, stepName: step.stepName, timeZone, config, drafts, poolSize: pool.length, warnings }
}

export async function previewSlots(stepId: bigint, fromDate: string, toDate: string) {
  const ctx = await buildDrafts(stepId, fromDate, toDate)
  const summary = summarizeDrafts(ctx.drafts, (d) => zonedDateKey(d, ctx.timeZone))
  return {
    timeZone: ctx.timeZone,
    total: summary.total,
    perDay: summary.perDay,
    interviewersUsed: summary.interviewersUsed,
    candidateCapacity: summary.total * ctx.config.groupSize,
    warnings: ctx.warnings,
    config: {
      durationMins: ctx.config.durationMins,
      bufferMins: ctx.config.bufferMins,
      panelSize: ctx.config.panelSize,
      groupSize: ctx.config.groupSize,
      mode: ctx.config.interviewMode,
      poolSize: ctx.poolSize,
    },
  }
}

export async function publishSlots(stepId: bigint, fromDate: string, toDate: string, adminId: bigint) {
  // The advisory lock serializes concurrent publishes for the same round so slots cannot be duplicated.
  const created = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${stepId})`
      const ctx = await buildDrafts(stepId, fromDate, toDate)
      if (ctx.drafts.length === 0) {
        throw new SchedulingError(ctx.warnings[0] ?? "No free time found in this date range")
      }

      const now = nowSeconds()
      let count = 0
      for (const d of ctx.drafts) {
        const slot = await tx.interviewSlot.create({
          data: {
            stepId,
            startsAt: d.startsAt,
            endsAt: d.endsAt,
            capacity: d.capacity,
            mode: ctx.config.interviewMode,
            meetingLink: ctx.config.interviewMode === "REMOTE" ? ctx.config.meetingLink : null,
            location: ctx.config.interviewMode === "ONSITE" ? ctx.config.location : null,
            createdBy: adminId,
            createdAt: now,
            updatedAt: now,
          },
          select: { id: true },
        })
        await tx.slotInterviewer.createMany({
          data: d.interviewerIds.map((id) => ({ slotId: slot.id, interviewerId: BigInt(id) })),
        })
        count++
      }
      return count
    },
    { timeout: 60_000, maxWait: 10_000 }
  )
  return { created }
}

export async function setSlotBlocked(slotId: bigint, blocked: boolean) {
  const slot = await prisma.interviewSlot.findUnique({ where: { id: slotId }, select: { id: true } })
  if (!slot) throw new SchedulingError("Slot not found", 404)
  await prisma.interviewSlot.update({ where: { id: slotId }, data: { isBlocked: blocked, updatedAt: nowSeconds() } })
}

export async function deleteSlot(slotId: bigint) {
  const slot = await prisma.interviewSlot.findUnique({ where: { id: slotId }, select: { id: true, bookedCount: true } })
  if (!slot) throw new SchedulingError("Slot not found", 404)
  if (slot.bookedCount > 0) throw new SchedulingError("This slot has bookings. Cancel or reschedule them first.", 409)
  await prisma.interviewSlot.delete({ where: { id: slotId } })
}

/** Slots of a round for the admin Schedule tab (past two days onward). */
export async function listRoundSlots(stepId: bigint) {
  const timeZone = await getOrgTimeZone()
  const since = new Date(Date.now() - 2 * 24 * 3600 * 1000)
  const slots = await prisma.interviewSlot.findMany({
    where: { stepId, startsAt: { gte: since } },
    orderBy: { startsAt: "asc" },
    take: 1000,
    include: {
      interviewers: { include: { interviewer: { select: { id: true, firstname: true, lastname: true } } } },
      bookings: {
        where: { status: { in: ["RESERVED", "COMPLETED", "NO_SHOW"] } },
        include: { candidate: { select: { id: true, firstname: true, lastname: true, email: true } } },
      },
    },
  })

  return {
    timeZone,
    slots: slots.map((s) => ({
      id: s.id.toString(),
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
      bookings: s.bookings.map((b) => ({
        id: b.id.toString(),
        status: b.status,
        candidateId: b.candidate.id.toString(),
        candidateName: `${b.candidate.firstname} ${b.candidate.lastname}`,
        candidateEmail: b.candidate.email,
      })),
    })),
  }
}

// ---------------------------------------------------------------------------------------------
// Round overview (admin Schedule tab counters + candidates waiting to book)
// ---------------------------------------------------------------------------------------------

export async function getRoundOverview(stepId: bigint) {
  const now = new Date()
  const step = await prisma.workflowStep.findUnique({ where: { id: stepId }, select: { stepOrder: true, isRequired: true } })
  if (!step) throw new SchedulingError("Round not found", 404)

  const rows = await prisma.candidatePipelineStep.findMany({
    where: { workflowStepId: stepId, status: { in: ["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED", "SKIPPED"] } },
    select: {
      status: true,
      pipeline: {
        select: {
          currentStepOrder: true,
          overallStatus: true,
          candidate: { select: { id: true, firstname: true, lastname: true, email: true } },
        },
      },
      slotBookings: {
        where: { status: "RESERVED" },
        select: { slot: { select: { endsAt: true } } },
        take: 1,
      },
    },
  })

  const counts = { awaitingBooking: 0, scheduled: 0, awaitingFeedback: 0, readyForDecision: 0 }
  const awaiting: Array<{ id: string; name: string; email: string }> = []

  for (const r of rows) {
    const booking = r.slotBookings[0] ? { endsAt: r.slotBookings[0].slot.endsAt } : null
    const status = deriveInterviewStatus({
      stepStatus: r.status,
      booking,
      now,
      pipelineMovedOn: r.pipeline.currentStepOrder > step.stepOrder || r.pipeline.overallStatus !== "IN_PROGRESS",
    })
    if (status === "AWAITING_BOOKING") {
      counts.awaitingBooking++
      awaiting.push({
        id: r.pipeline.candidate.id.toString(),
        name: `${r.pipeline.candidate.firstname} ${r.pipeline.candidate.lastname}`,
        email: r.pipeline.candidate.email,
      })
    } else if (status === "SCHEDULED") counts.scheduled++
    else if (status === "AWAITING_FEEDBACK") counts.awaitingFeedback++
    else if (status === "READY_FOR_DECISION") counts.readyForDecision++
  }

  const openSeats = await prisma.interviewSlot.aggregate({
    where: { stepId, isBlocked: false, startsAt: { gt: new Date(Date.now() + MIN_LEAD_MINUTES * 60_000) } },
    _sum: { capacity: true, bookedCount: true },
  })
  const freeSeats = Math.max(0, (openSeats._sum.capacity ?? 0) - (openSeats._sum.bookedCount ?? 0))

  return { counts, awaiting: awaiting.slice(0, 50), freeSeats, isRequired: step.isRequired }
}
