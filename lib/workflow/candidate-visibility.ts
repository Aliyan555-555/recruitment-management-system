/**
 * Which hiring rounds a candidate may see, and under what name.
 *
 * - Before a candidate is shortlisted they see no rounds at all.
 * - After shortlisting they see every round. A round the admin switched `showName` off for still
 *   appears in the list, but as "Hidden round": its name, type and instructions are not sent.
 *
 * This must happen on the server: hidden details are omitted from the response, not hidden in the UI.
 */

const SHORTLISTED_APPLICATION_STATUSES = ["SHORTLISTED", "BATCH_ASSIGNED"]
const ADMITTED_STEP_STATUSES = ["IN_PROGRESS", "COMPLETED", "SKIPPED"]

/** Shown instead of a round's name when the admin chose not to reveal it. */
export const HIDDEN_ROUND_NAME = "Hidden round"

export interface ShortlistEvidence {
  applicationStatus?: string | null
  pipelineSteps: Array<{ status: string; stepOrder: number }>
  /** The candidate holds (or held) an interview booking for this application. */
  hasBooking?: boolean
}

/**
 * A candidate counts as shortlisted once an admin admitted them to a round. Rejection alone is not
 * evidence: a candidate rejected during screening was never shortlisted, but one rejected after
 * progressing (a later step exists, or they had an interview booked) was.
 */
export function isCandidateShortlisted(evidence: ShortlistEvidence): boolean {
  if (evidence.applicationStatus && SHORTLISTED_APPLICATION_STATUSES.includes(evidence.applicationStatus)) {
    return true
  }
  if (evidence.hasBooking) return true
  return evidence.pipelineSteps.some(
    (step) => ADMITTED_STEP_STATUSES.includes(step.status) || step.stepOrder > 1
  )
}

/** Candidates who are not shortlisted see no rounds; shortlisted candidates see all of them. */
export function filterStepsForCandidate<T>(steps: T[], shortlisted: boolean): T[] {
  return shortlisted ? steps : []
}

/** The round's name for a candidate: the real name, or "Hidden round" when the admin turned it off. */
export function candidateRoundName(step: { stepName: string; showName: boolean }): string {
  return step.showName ? step.stepName : HIDDEN_ROUND_NAME
}

/** Same, for use inside a sentence ("Book your ..."): a hidden round reads as "next round". */
export function candidateRoundPhrase(step: { stepName: string; showName: boolean }): string {
  return step.showName ? step.stepName : "next round"
}
