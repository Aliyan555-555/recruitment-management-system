import { aggregateEvaluations } from "@/lib/evaluations/scoring"
import { deriveInterviewStatus, type InterviewStatus } from "./derived-status"

/**
 * One row per candidate on a round's Candidates tab. Pure: the service loads the facts, this decides the status,
 * the outcome wording and which actions the admin may take, so the UI never has to guess.
 */

export type RoundOutcome = "PASSED" | "REJECTED" | "SKIPPED" | null

export type RowAction =
  | "BOOK_FOR_CANDIDATE"
  | "REMIND"
  | "RESCHEDULE"
  | "CANCEL_BOOKING"
  | "NO_SHOW"
  | "PASS"
  | "REJECT"
  | "SKIP"

export interface RoundCandidateFacts {
  candidateId: string
  name: string
  email: string
  pipelineId: string
  stepStatus: string
  stepOrder: number
  pipelineCurrentStepOrder: number
  pipelineStatus: string
  roundIsRequired: boolean
  roundIsInterview: boolean
  /** active (RESERVED) booking in this round */
  booking: { id: string; slotId: string; startsAt: Date; endsAt: Date; interviewerIds: string[]; interviewerNames: string[] } | null
  /** latest finished booking (COMPLETED / NO_SHOW) when there is no active one */
  lastBooking: { status: string; startsAt: Date; interviewerIds: string[] } | null
  noShowCount: number
  evaluations: Array<{ evaluatorId: string; evaluatorName: string; submittedAt: bigint | number | null; recommendation: string | null; formData: unknown }>
  now: Date
}

export interface RoundCandidateRow {
  candidateId: string
  name: string
  email: string
  pipelineId: string
  status: InterviewStatus
  outcome: RoundOutcome
  booking: { id: string; slotId: string; startsAt: string; endsAt: string; interviewers: string[] } | null
  scorecards: {
    submitted: number
    expected: number
    scorePercentage: number | null
    recommendation: "HIRE" | "NO_HIRE" | null
    isSplit: boolean
    hireVotes: number
    noHireVotes: number
  }
  noShowCount: number
  actions: RowAction[]
  /** when PASS is offered before all scorecards are in, the UI asks for confirmation with this text */
  passWarning: string | null
}

export function buildRoundCandidateRow(f: RoundCandidateFacts): RoundCandidateRow {
  const movedOn = f.pipelineCurrentStepOrder > f.stepOrder || (f.pipelineStatus !== "IN_PROGRESS" && f.stepStatus === "COMPLETED")
  const status = deriveInterviewStatus({
    stepStatus: f.stepStatus,
    pipelineMovedOn: movedOn,
    booking: f.booking ? { endsAt: f.booking.endsAt } : null,
    now: f.now,
  })

  const outcome: RoundOutcome =
    f.stepStatus === "SKIPPED" ? "SKIPPED" : f.stepStatus === "REJECTED" || (f.pipelineStatus === "REJECTED" && !movedOn) ? "REJECTED" : status === "DECIDED" ? "PASSED" : null

  // expected scorecards = the panel of the interview that took place (active booking first, else the last one)
  const panel = f.booking?.interviewerIds ?? f.lastBooking?.interviewerIds ?? []
  const panelEvals = panel.length > 0 ? f.evaluations.filter((e) => panel.includes(e.evaluatorId)) : f.evaluations
  const agg = aggregateEvaluations(panelEvals)

  const actions: RowAction[] = []
  let passWarning: string | null = null
  const pipelineOpen = f.pipelineStatus === "IN_PROGRESS"

  if (pipelineOpen && !movedOn) {
    switch (status) {
      case "AWAITING_BOOKING":
        if (f.roundIsInterview) actions.push("BOOK_FOR_CANDIDATE", "REMIND")
        else actions.push("PASS")
        if (!f.roundIsRequired) actions.push("SKIP")
        actions.push("REJECT")
        break
      case "SCHEDULED":
        actions.push("RESCHEDULE", "CANCEL_BOOKING", "REJECT")
        break
      case "AWAITING_FEEDBACK":
        actions.push("PASS", "REJECT", "NO_SHOW")
        passWarning = `Only ${agg.submittedCount} of ${Math.max(panel.length, 1)} scorecards are in. Decide anyway?`
        break
      case "READY_FOR_DECISION":
        actions.push("PASS", "REJECT")
        break
      default:
        break
    }
  }

  return {
    candidateId: f.candidateId,
    name: f.name,
    email: f.email,
    pipelineId: f.pipelineId,
    status,
    outcome,
    booking: f.booking
      ? {
          id: f.booking.id,
          slotId: f.booking.slotId,
          startsAt: f.booking.startsAt.toISOString(),
          endsAt: f.booking.endsAt.toISOString(),
          interviewers: f.booking.interviewerNames,
        }
      : null,
    scorecards: {
      submitted: agg.submittedCount,
      expected: panel.length,
      scorePercentage: agg.submittedCount > 0 ? agg.scorePercentage : null,
      recommendation: agg.recommendation,
      isSplit: agg.isSplit,
      hireVotes: agg.hireVotes,
      noHireVotes: agg.noHireVotes,
    },
    noShowCount: f.noShowCount,
    actions,
    passWarning,
  }
}

export const STATUS_FILTERS: Array<{ key: InterviewStatus | "ALL"; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "AWAITING_BOOKING", label: "Needs booking" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "AWAITING_FEEDBACK", label: "Feedback pending" },
  { key: "READY_FOR_DECISION", label: "Ready for decision" },
  { key: "DECIDED", label: "Done" },
]
