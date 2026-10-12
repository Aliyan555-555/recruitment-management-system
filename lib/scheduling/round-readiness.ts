/**
 * "Is this interview round ready?" checklist shown on the admin Schedule tab. Pure: the service gathers the
 * facts, this decides what is missing and which button fixes it.
 */

export type ReadinessStatus = "ok" | "warn" | "todo"
export type ReadinessAction =
  | { kind: "EDIT_JOB"; label: string }
  | { kind: "REMIND_AVAILABILITY"; label: string; interviewerIds: string[] }
  | { kind: "PUBLISH"; label: string }

export interface ReadinessItem {
  id: "setup" | "pool" | "availability" | "slots" | "seats"
  status: ReadinessStatus
  title: string
  action?: ReadinessAction
}

export interface ReadinessInput {
  interviewMode: "REMOTE" | "ONSITE" | null
  meetingLink: string | null
  location: string | null
  panelSize: number
  pool: Array<{ id: string; name: string; hasAvailability: boolean }>
  /** future, unblocked slots */
  openSlots: number
  /** free seats in those slots */
  freeSeats: number
  /** shortlisted candidates without a booking */
  awaitingBooking: number
}

export interface ReadinessResult {
  /** nothing blocks candidates from booking */
  ready: boolean
  items: ReadinessItem[]
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function evaluateReadiness(i: ReadinessInput): ReadinessResult {
  const items: ReadinessItem[] = []
  const editJob: ReadinessAction = { kind: "EDIT_JOB", label: "Edit round settings" }

  // 1. mode + where
  if (!i.interviewMode) {
    items.push({ id: "setup", status: "todo", title: "Choose Remote or Onsite for this round", action: editJob })
  } else if (i.interviewMode === "REMOTE" && !i.meetingLink) {
    items.push({ id: "setup", status: "todo", title: "Add a meeting link for this remote round", action: editJob })
  } else if (i.interviewMode === "ONSITE" && !i.location) {
    items.push({ id: "setup", status: "todo", title: "Add a location for this onsite round", action: editJob })
  } else {
    items.push({ id: "setup", status: "ok", title: i.interviewMode === "REMOTE" ? "Remote, meeting link set" : "Onsite, location set" })
  }

  // 2. interviewer pool
  const assignAction: ReadinessAction = { kind: "EDIT_JOB", label: "Assign interviewers" }
  if (i.pool.length === 0) {
    items.push({ id: "pool", status: "todo", title: "No interviewers assigned to this round", action: assignAction })
  } else if (i.pool.length < i.panelSize) {
    items.push({
      id: "pool",
      status: "todo",
      title: `${plural(i.pool.length, "interviewer")} assigned, ${i.panelSize} needed per session`,
      action: assignAction,
    })
  } else {
    items.push({
      id: "pool",
      status: "ok",
      title: `${plural(i.pool.length, "interviewer")} assigned${i.panelSize > 1 ? ` (${i.panelSize} per session)` : ""}`,
    })
  }

  // 3. availability
  if (i.pool.length > 0) {
    const missing = i.pool.filter((p) => !p.hasAvailability)
    const withAvailability = i.pool.length - missing.length
    if (missing.length === 0) {
      items.push({ id: "availability", status: "ok", title: "Every interviewer has shared their availability" })
    } else {
      const names = missing.map((m) => m.name).join(", ")
      items.push({
        id: "availability",
        // blocking only when not enough people are left to run a session
        status: withAvailability >= i.panelSize ? "warn" : "todo",
        title: `No availability yet: ${names}`,
        action: { kind: "REMIND_AVAILABILITY", label: "Send reminder", interviewerIds: missing.map((m) => m.id) },
      })
    }
  }

  // 4. open slots
  if (i.openSlots === 0) {
    items.push({ id: "slots", status: "todo", title: "No open interview slots yet", action: { kind: "PUBLISH", label: "Open slots" } })
  } else {
    items.push({ id: "slots", status: "ok", title: `${plural(i.openSlots, "open slot")}, ${plural(i.freeSeats, "free seat")}` })
  }

  // 5. enough seats for the people waiting
  if (i.awaitingBooking > 0 && i.openSlots > 0 && i.freeSeats < i.awaitingBooking) {
    items.push({
      id: "seats",
      status: "warn",
      title: `${plural(i.awaitingBooking, "candidate")} waiting, only ${plural(i.freeSeats, "free seat")}`,
      action: { kind: "PUBLISH", label: "Open more slots" },
    })
  }

  return { ready: !items.some((it) => it.status === "todo"), items }
}
