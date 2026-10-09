import { prisma } from "@/lib/prisma"
import { zonedDateKey } from "@/lib/timezone"
import { readStepConfig } from "@/lib/workflow/step-config"
import { activeKeyFor } from "./booking-service"
import { MAX_NO_SHOWS } from "./booking-rules"
import { getOrgTimeZone } from "./org-settings"
import { MIN_LEAD_MINUTES } from "./slot-service"

export type CandidateBookingState =
  | "NOT_APPLICABLE" // current round has no interview
  | "NOT_ADMITTED" // not shortlisted into the round yet
  | "AWAITING_BOOKING" // slots available, nothing booked
  | "NO_SLOTS" // admitted, but no free slot right now
  | "CONTACT_HR" // too many missed interviews
  | "BOOKED"

export interface CandidateSlotsView {
  state: CandidateBookingState
  timeZone: string
  step: {
    name: string
    durationMins: number
    mode: "REMOTE" | "ONSITE" | null
    groupSize: number
    panelSize: number
    instructions: string | null
  } | null
  booking: {
    id: string
    slotId: string
    startsAt: string
    endsAt: string
    mode: "REMOTE" | "ONSITE" | null
    meetingLink: string | null
    location: string | null
    interviewers: string[]
    isPast: boolean
  } | null
  days: Array<{ date: string; slots: Array<{ id: string; startsAt: string; endsAt: string; spotsLeft: number }> }>
}

/** Returns null when the pipeline does not belong to the candidate. */
export async function getCandidateSlotsView(candidateId: bigint, pipelineId: bigint): Promise<CandidateSlotsView | null> {
  const pipeline = await prisma.candidatePipeline.findFirst({
    where: { id: pipelineId, candidateId },
    select: {
      id: true,
      overallStatus: true,
      lockState: true,
      currentStepOrder: true,
      steps: {
        where: { stepOrder: { gte: 0 } },
        select: { id: true, status: true, stepOrder: true, workflowStep: true },
      },
    },
  })
  if (!pipeline) return null

  const timeZone = await getOrgTimeZone()
  const empty = (state: CandidateBookingState, step: CandidateSlotsView["step"] = null): CandidateSlotsView => ({
    state,
    timeZone,
    step,
    booking: null,
    days: [],
  })

  const current = pipeline.steps.find((s) => s.stepOrder === pipeline.currentStepOrder)
  if (!current || pipeline.overallStatus !== "IN_PROGRESS" || pipeline.lockState !== "NONE") return empty("NOT_APPLICABLE")

  const config = readStepConfig(current.workflowStep)
  if (!config.isInterview) return empty("NOT_APPLICABLE")

  const stepInfo = {
    name: current.workflowStep.stepName,
    durationMins: config.durationMins,
    mode: config.interviewMode,
    groupSize: config.groupSize,
    panelSize: config.panelSize,
    instructions: config.candidateInstructions,
  }

  const booking = await prisma.slotBooking.findFirst({
    where: { activeKey: activeKeyFor(current.workflowStep.id, candidateId) },
    include: {
      slot: { include: { interviewers: { include: { interviewer: { select: { firstname: true, lastname: true } } } } } },
    },
  })
  if (booking) {
    const mode = booking.slot.mode ?? config.interviewMode
    return {
      state: "BOOKED",
      timeZone,
      step: stepInfo,
      booking: {
        id: booking.id.toString(),
        slotId: booking.slotId.toString(),
        startsAt: booking.slot.startsAt.toISOString(),
        endsAt: booking.slot.endsAt.toISOString(),
        mode,
        meetingLink: mode === "REMOTE" ? booking.slot.meetingLink ?? config.meetingLink : null,
        location: mode === "ONSITE" ? booking.slot.location ?? config.location : null,
        interviewers: booking.slot.interviewers.map((i) => `${i.interviewer.firstname} ${i.interviewer.lastname}`),
        isPast: booking.slot.endsAt < new Date(),
      },
      days: [],
    }
  }

  if (current.status !== "IN_PROGRESS") return empty("NOT_ADMITTED", stepInfo)

  const noShows = await prisma.slotBooking.count({
    where: { candidateId, status: "NO_SHOW", slot: { stepId: current.workflowStep.id } },
  })
  if (noShows >= MAX_NO_SHOWS) return empty("CONTACT_HR", stepInfo)

  const earliest = new Date(Date.now() + MIN_LEAD_MINUTES * 60_000)
  const slots = await prisma.interviewSlot.findMany({
    where: { stepId: current.workflowStep.id, isBlocked: false, startsAt: { gt: earliest } },
    orderBy: { startsAt: "asc" },
    take: 500,
    select: { id: true, startsAt: true, endsAt: true, capacity: true, bookedCount: true },
  })

  const days = new Map<string, CandidateSlotsView["days"][number]["slots"]>()
  for (const s of slots) {
    if (s.bookedCount >= s.capacity) continue
    const key = zonedDateKey(s.startsAt, timeZone)
    days.set(key, [
      ...(days.get(key) ?? []),
      { id: s.id.toString(), startsAt: s.startsAt.toISOString(), endsAt: s.endsAt.toISOString(), spotsLeft: s.capacity - s.bookedCount },
    ])
  }

  return {
    state: days.size > 0 ? "AWAITING_BOOKING" : "NO_SLOTS",
    timeZone,
    step: stepInfo,
    booking: null,
    days: [...days.entries()].map(([date, daySlots]) => ({ date, slots: daySlots })),
  }
}

/** Candidate's upcoming booked interviews across applications (dashboard + application page). */
export async function listUpcomingInterviews(candidateId: bigint) {
  const timeZone = await getOrgTimeZone()
  const bookings = await prisma.slotBooking.findMany({
    where: { candidateId, status: "RESERVED", slot: { endsAt: { gt: new Date() } } },
    orderBy: { slot: { startsAt: "asc" } },
    take: 20,
    include: {
      slot: { include: { step: { include: { workflow: { include: { job: { select: { id: true, title: true, company: true } } } } } } } },
      pipelineStep: { select: { pipelineId: true } },
      application: { select: { id: true } },
    },
  })

  const pipelineByApplication = new Map(
    (
      await prisma.candidatePipeline.findMany({
        where: { applicationId: { in: bookings.map((b) => b.applicationId) } },
        select: { id: true, applicationId: true },
      })
    ).map((p) => [p.applicationId.toString(), p.id])
  )

  const interviews = bookings.map((b) => {
      const config = readStepConfig(b.slot.step)
      const mode = b.slot.mode ?? config.interviewMode
      const pipelineId = b.pipelineStep?.pipelineId ?? pipelineByApplication.get(b.applicationId.toString())
      return {
        id: b.id.toString(),
        bookingId: b.id.toString(),
        slotId: b.slotId.toString(),
        pipelineId: pipelineId?.toString() ?? null,
        applicationId: b.applicationId.toString(),
        jobTitle: b.slot.step.workflow.job.title,
        jobCompany: b.slot.step.workflow.job.company,
        stepName: b.slot.step.stepName,
        stepOrder: b.slot.step.stepOrder,
        startsAt: b.slot.startsAt.toISOString(),
        endsAt: b.slot.endsAt.toISOString(),
        mode,
        meetingLink: mode === "REMOTE" ? b.slot.meetingLink ?? config.meetingLink : null,
        location: mode === "ONSITE" ? b.slot.location ?? config.location : null,
      }
    })

  // `upcoming` keeps the shape the dashboard store already consumes
  return { timeZone, interviews, upcoming: interviews }
}
