/**
 * Pure eligibility rules for booking an interview slot. The service loads the facts, this module decides.
 * Each failure carries a stable code (for the UI) and a candidate-friendly message.
 */

export type BookingErrorCode =
  | "NOT_YOURS"
  | "PIPELINE_CLOSED"
  | "WRONG_ROUND"
  | "NOT_ADMITTED"
  | "ALREADY_BOOKED"
  | "TOO_MANY_NO_SHOWS"
  | "SLOT_UNAVAILABLE"
  | "SLOT_TOO_SOON"
  | "SLOT_FULL"

export const BOOKING_MESSAGES: Record<BookingErrorCode, string> = {
  NOT_YOURS: "This application does not belong to you.",
  PIPELINE_CLOSED: "This application is no longer active.",
  WRONG_ROUND: "This slot is not for your current round.",
  NOT_ADMITTED: "You can book once you have been shortlisted for this round.",
  ALREADY_BOOKED: "You already have an interview booked for this round.",
  TOO_MANY_NO_SHOWS: "Please contact the recruitment team to arrange a new interview time.",
  SLOT_UNAVAILABLE: "This slot is no longer available.",
  SLOT_TOO_SOON: "This slot starts too soon to book. Please choose a later one.",
  SLOT_FULL: "This slot has just been taken. Please choose another one.",
}

export const MAX_NO_SHOWS = 2

export interface BookingFacts {
  candidateId: string
  now: Date
  minLeadMins: number
  pipeline: {
    candidateId: string
    jobId: string
    overallStatus: string
    lockState: string
    currentStepOrder: number
  }
  /** the candidate's pipeline step for the slot's round, if one exists */
  pipelineStep: { status: string; stepOrder: number } | null
  slot: {
    jobId: string
    startsAt: Date
    isBlocked: boolean
    capacity: number
    bookedCount: number
  }
  hasActiveBooking: boolean
  noShowCount: number
}

export interface BookingFailure {
  code: BookingErrorCode
  message: string
}

function fail(code: BookingErrorCode): BookingFailure {
  return { code, message: BOOKING_MESSAGES[code] }
}

export function checkBookable(f: BookingFacts): BookingFailure | null {
  if (f.pipeline.candidateId !== f.candidateId) return fail("NOT_YOURS")
  if (f.pipeline.overallStatus !== "IN_PROGRESS" || f.pipeline.lockState !== "NONE") return fail("PIPELINE_CLOSED")
  if (f.slot.jobId !== f.pipeline.jobId) return fail("WRONG_ROUND")
  if (!f.pipelineStep) return fail("WRONG_ROUND")
  if (f.pipelineStep.stepOrder !== f.pipeline.currentStepOrder) return fail("WRONG_ROUND")
  if (f.pipelineStep.status !== "IN_PROGRESS") return fail("NOT_ADMITTED")
  if (f.hasActiveBooking) return fail("ALREADY_BOOKED")
  if (f.noShowCount >= MAX_NO_SHOWS) return fail("TOO_MANY_NO_SHOWS")
  if (f.slot.isBlocked) return fail("SLOT_UNAVAILABLE")
  if (f.slot.startsAt.getTime() <= f.now.getTime()) return fail("SLOT_UNAVAILABLE")
  if (f.slot.startsAt.getTime() < f.now.getTime() + f.minLeadMins * 60_000) return fail("SLOT_TOO_SOON")
  if (f.slot.bookedCount >= f.slot.capacity) return fail("SLOT_FULL")
  return null
}

/** Admin-side rule for moving a booking to another slot (candidate state checks do not apply). */
export function checkReschedulable(f: {
  now: Date
  minLeadMins: number
  sameRound: boolean
  slot: { isBlocked: boolean; startsAt: Date; capacity: number; bookedCount: number }
}): BookingFailure | null {
  if (!f.sameRound) return fail("WRONG_ROUND")
  if (f.slot.isBlocked || f.slot.startsAt.getTime() <= f.now.getTime()) return fail("SLOT_UNAVAILABLE")
  if (f.slot.startsAt.getTime() < f.now.getTime() + f.minLeadMins * 60_000) return fail("SLOT_TOO_SOON")
  if (f.slot.bookedCount >= f.slot.capacity) return fail("SLOT_FULL")
  return null
}
