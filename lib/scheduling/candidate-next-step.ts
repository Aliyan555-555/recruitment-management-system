/**
 * "What should I do next?" for a candidate, per application. Pure; candidate-facing wording lives here so
 * the home banner and the My applications list always say the same thing.
 */

export type NextStepKind =
  | "RESPOND_TO_OFFER"
  | "BOOK_INTERVIEW"
  | "INTERVIEW_SOON"
  | "INTERVIEW_BOOKED"
  | "SLOTS_OPENING_SOON"
  | "AWAITING_RESULT"
  | "IN_REVIEW"
  | "OFFER_ACCEPTED"
  | "CLOSED"

export interface NextStepInput {
  pipelineId: string
  jobTitle: string
  overallStatus: string
  lockState: string
  /** current round of the pipeline */
  stepName: string | null
  stepStatus: string | null
  isInterview: boolean
  /** active booking in the current round */
  booking: { startsAt: Date; endsAt: Date; meetingLink: string | null } | null
  /** free bookable seats in the current round */
  freeSeats: number
  /** latest LOI / offer letter status in the pipeline, if any */
  letterStatus: string | null
  now: Date
}

export interface NextStep {
  pipelineId: string
  kind: NextStepKind
  /** lower = more urgent; null = nothing for the candidate to do, no banner */
  priority: number | null
  title: string
  detail: string | null
  cta: { label: string; href: string } | null
  /** booked interview start, for the UI to format in the org timezone */
  startsAt: string | null
}

const DAY = 24 * 3600_000

export function computeNextStep(i: NextStepInput): NextStep {
  const app = `/applications/${i.pipelineId}`
  const make = (kind: NextStepKind, priority: number | null, title: string, detail: string | null, cta: NextStep["cta"], startsAt: Date | null = null): NextStep => ({
    pipelineId: i.pipelineId,
    kind,
    priority,
    title,
    detail,
    cta,
    startsAt: startsAt ? startsAt.toISOString() : null,
  })

  if (i.letterStatus === "SENT") {
    return make("RESPOND_TO_OFFER", 1, `You have an offer for ${i.jobTitle}`, "Please review and respond.", { label: "View offer", href: app })
  }
  if (i.letterStatus === "ACCEPTED") {
    return make("OFFER_ACCEPTED", null, `Offer accepted for ${i.jobTitle}`, "The team will contact you about next steps.", { label: "View", href: app })
  }
  if (i.overallStatus !== "IN_PROGRESS" || i.lockState !== "NONE") {
    return make("CLOSED", null, `${i.jobTitle}: this application is closed`, null, { label: "View", href: app })
  }

  if (i.isInterview && i.booking) {
    const startsIn = i.booking.startsAt.getTime() - i.now.getTime()
    if (i.booking.endsAt.getTime() <= i.now.getTime()) {
      return make("AWAITING_RESULT", 6, `${i.jobTitle}: waiting for your ${i.stepName} result`, "We will let you know soon.", { label: "View", href: app })
    }
    if (startsIn <= DAY) {
      return make(
        "INTERVIEW_SOON",
        2,
        `Your ${i.stepName} for ${i.jobTitle} is coming up`,
        null,
        i.booking.meetingLink && startsIn <= 15 * 60_000 ? { label: "Join now", href: i.booking.meetingLink } : { label: "Details", href: app },
        i.booking.startsAt
      )
    }
    return make("INTERVIEW_BOOKED", 4, `Your ${i.stepName} for ${i.jobTitle} is booked`, null, { label: "Details", href: app }, i.booking.startsAt)
  }

  if (i.isInterview && i.stepStatus === "IN_PROGRESS") {
    return i.freeSeats > 0
      ? make("BOOK_INTERVIEW", 3, `Book your ${i.stepName} for ${i.jobTitle}`, "Choose a time that suits you.", { label: "Book now", href: app })
      : make("SLOTS_OPENING_SOON", 5, `${i.jobTitle}: interview times open soon`, "We will email you when you can book.", { label: "View", href: app })
  }

  if (i.isInterview && i.stepStatus === "COMPLETED") {
    return make("AWAITING_RESULT", 6, `${i.jobTitle}: waiting for your ${i.stepName} result`, "We will let you know soon.", { label: "View", href: app })
  }

  return make("IN_REVIEW", 7, `${i.jobTitle}: your application is being reviewed`, null, { label: "View", href: app })
}

/** The single most urgent action across applications (for the home page banner). */
export function mostUrgent(steps: NextStep[]): NextStep | null {
  const actionable = steps.filter((s) => s.priority !== null)
  if (actionable.length === 0) return null
  return actionable.sort((a, b) => a.priority! - b.priority! || (a.startsAt ?? "").localeCompare(b.startsAt ?? ""))[0]
}
