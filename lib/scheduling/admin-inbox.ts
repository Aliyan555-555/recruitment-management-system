/**
 * Admin dashboard "To do today" inbox. Pure: the service gathers per-round facts, this turns them into a short,
 * prioritised list where every line links straight to the screen that resolves it.
 */

export type InboxSeverity = "high" | "medium" | "low"

export interface InboxItem {
  id: string
  severity: InboxSeverity
  title: string
  /** "Job › Round" context, when the item belongs to one round */
  context?: string
  href: string
  actionLabel: string
}

export interface RoundFacts {
  jobId: string
  jobTitle: string
  stepId: string
  stepName: string
  isInterview: boolean
  /** applicants waiting in Needs Review (PENDING) */
  newApplicants: number
  readyForDecision: number
  awaitingBooking: number
  freeSeats: number
  openSlots: number
}

export interface InboxFacts {
  rounds: RoundFacts[]
  /** pool interviewers (of active jobs) without availability */
  interviewersWithoutAvailability: string[]
  /** booked interviews that ended over 24h ago and still miss scorecards */
  overdueScorecards: number
}

const SEVERITY_ORDER: Record<InboxSeverity, number> = { high: 0, medium: 1, low: 2 }
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function buildInbox(f: InboxFacts): InboxItem[] {
  const items: Array<InboxItem & { weight: number }> = []

  for (const r of f.rounds) {
    const base = `/admin/jobs/${r.jobId}/rounds/${r.stepId}`
    const context = `${r.jobTitle} › ${r.stepName}`

    if (r.readyForDecision > 0) {
      items.push({
        id: `decide-${r.stepId}`,
        severity: "high",
        title: `${plural(r.readyForDecision, "candidate")} ready for a decision`,
        context,
        href: `${base}/candidates`,
        actionLabel: "Review",
        weight: r.readyForDecision,
      })
    }

    if (r.isInterview && r.awaitingBooking > 0 && r.freeSeats < r.awaitingBooking) {
      items.push({
        id: `seats-${r.stepId}`,
        severity: "medium",
        title:
          r.openSlots === 0
            ? `${plural(r.awaitingBooking, "candidate")} waiting, no interview slots open`
            : `${plural(r.awaitingBooking, "candidate")} waiting, only ${plural(r.freeSeats, "free seat")}`,
        context,
        href: `${base}/schedule`,
        actionLabel: "Open slots",
        weight: r.awaitingBooking - r.freeSeats,
      })
    }

    if (r.newApplicants > 0) {
      items.push({
        id: `review-${r.stepId}`,
        severity: "low",
        title: `${plural(r.newApplicants, "new applicant")} to review`,
        context,
        href: `/admin/jobs/${r.jobId}/applicants`,
        actionLabel: "Review",
        weight: r.newApplicants,
      })
    }
  }

  if (f.interviewersWithoutAvailability.length > 0) {
    const n = f.interviewersWithoutAvailability.length
    items.push({
      id: "availability",
      severity: "medium",
      title: `${plural(n, "interviewer")} ${n === 1 ? "has" : "have"} not shared availability: ${f.interviewersWithoutAvailability.slice(0, 3).join(", ")}${n > 3 ? "…" : ""}`,
      href: "/admin/interviewers",
      actionLabel: "View",
      weight: n,
    })
  }

  if (f.overdueScorecards > 0) {
    items.push({
      id: "scorecards",
      severity: "low",
      title: `${plural(f.overdueScorecards, "interview")} still missing scorecards after a day`,
      href: "/admin/calendar",
      actionLabel: "View",
      weight: f.overdueScorecards,
    })
  }

  return items
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.weight - a.weight)
    .map(({ weight: _weight, ...item }) => item)
}
