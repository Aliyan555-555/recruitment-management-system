/**
 * One status per candidate per interview round, derived from booking + scorecards (no extra DB column).
 * Admin, interviewer and candidate screens all use the same wording.
 */

export type InterviewStatus =
  | "NOT_ADMITTED" // waiting in the review queue
  | "AWAITING_BOOKING"
  | "SCHEDULED"
  | "AWAITING_FEEDBACK"
  | "READY_FOR_DECISION"
  | "DECIDED" // moved to the next round, completed, or rejected

export const INTERVIEW_STATUS_LABEL: Record<InterviewStatus, string> = {
  NOT_ADMITTED: "Not shortlisted yet",
  AWAITING_BOOKING: "Awaiting booking",
  SCHEDULED: "Scheduled",
  AWAITING_FEEDBACK: "Awaiting feedback",
  READY_FOR_DECISION: "Ready for decision",
  DECIDED: "Decided",
}

export interface DerivedStatusInput {
  stepStatus: string // CandidatePipelineStep.status
  /** the pipeline has moved past this round, or ended */
  pipelineMovedOn: boolean
  /** active (RESERVED) booking for the round, if any */
  booking: { endsAt: Date } | null
  now: Date
}

export function deriveInterviewStatus(i: DerivedStatusInput): InterviewStatus {
  if (i.stepStatus === "REJECTED" || i.stepStatus === "SKIPPED" || i.pipelineMovedOn) return "DECIDED"
  if (i.stepStatus === "COMPLETED") return "READY_FOR_DECISION"
  if (i.stepStatus === "PENDING") return "NOT_ADMITTED"
  if (!i.booking) return "AWAITING_BOOKING"
  return i.booking.endsAt.getTime() > i.now.getTime() ? "SCHEDULED" : "AWAITING_FEEDBACK"
}
