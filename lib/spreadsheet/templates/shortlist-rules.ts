import {
  eligibilityFromApplication,
  formatShortlistBlockedReason,
  type ShortlistBlockedReason,
} from "@/lib/admin/shortlist-eligibility"
import { sha256Hex } from "../dedupe"
import { enumOptions } from "../enums"
import type { CoercedRow, TemplateDef } from "../types"
import type { RowDecision } from "../validate"

/**
 * Shortlisting sheet: one row per applicant who still needs a decision. The admin picks Shortlist, Reject,
 * Maybe or Clear maybe; an empty decision leaves the applicant as is.
 */

export const SHORTLIST_DECISIONS = ["SHORTLIST", "REJECT", "MAYBE", "CLEAR_MAYBE"] as const
export type ShortlistDecision = (typeof SHORTLIST_DECISIONS)[number]

export const SHORTLIST_TEMPLATE: TemplateDef = {
  type: "SHORTLIST",
  version: 1,
  title: "Shortlisting",
  columns: [
    { key: "candidate", header: "Candidate", type: "text", readOnly: true, width: 26 },
    { key: "email", header: "Email", type: "text", readOnly: true, width: 30 },
    { key: "phone", header: "Phone", type: "text", readOnly: true, width: 16 },
    { key: "applied", header: "Applied on", type: "date", readOnly: true, width: 13 },
    { key: "quickTest", header: "Quick test %", type: "number", readOnly: true, width: 13 },
    { key: "current", header: "Current status", type: "text", readOnly: true, width: 16 },
    {
      key: "decision",
      header: "Decision",
      type: "enum",
      width: 16,
      options: enumOptions(SHORTLIST_DECISIONS, { CLEAR_MAYBE: "Clear maybe" }),
      note: "Leave empty to keep the applicant as is.",
    },
  ],
}

export const ACTION_LABELS: Record<string, string> = {
  SHORTLIST: "Shortlist",
  REJECT: "Reject",
  MAYBE: "Maybe",
  CLEAR_MAYBE: "Clear maybe",
}

/** What the sheet row is compared against: the applicant's state in the database right now. */
export interface ShortlistCurrent {
  fingerprint: string
  status: string
  reviewFlag: string | null
  actionable: boolean
  blockedReason: ShortlistBlockedReason | null
}

type AppForState = {
  status: string
  reviewFlag: string | null
  pipeline?: {
    overallStatus: string
    lockState: string
    currentStepOrder?: number | null
    steps?: Array<{ stepOrder: number; status: string }>
  } | null
}

export function currentFromApplication(app: AppForState): ShortlistCurrent {
  const eligibility = eligibilityFromApplication(app)
  const p = app.pipeline
  const raw = [app.status, p?.overallStatus ?? "", p?.lockState ?? "", p?.currentStepOrder ?? "", app.reviewFlag ?? ""].join("|")
  return {
    fingerprint: sha256Hex(raw).slice(0, 16),
    status: app.status,
    reviewFlag: app.reviewFlag,
    actionable: eligibility.actionable,
    blockedReason: eligibility.actionBlockedReason,
  }
}

/** True when the applicant is already in the state the decision asks for. */
export function alreadyApplied(decision: string | null, current: ShortlistCurrent): boolean {
  switch (decision) {
    case "SHORTLIST":
      return current.status === "SHORTLISTED" || current.status === "BATCH_ASSIGNED"
    case "REJECT":
      return current.status === "REMOVED"
    case "MAYBE":
      return current.reviewFlag === "MAYBE"
    case "CLEAR_MAYBE":
      return current.reviewFlag === null
    default:
      return false
  }
}

const err = (code: string, message: string) => ({ severity: "error" as const, code, message })

/** Pure decision for one row; the database facts come in as `current`. */
export function evaluateShortlistRow(row: CoercedRow, current: ShortlistCurrent | undefined): RowDecision {
  const decision = (row.values.decision as string | null) ?? null

  if (!row.key || !/^\d+$/.test(row.key)) {
    return { issues: [err("NO_CANDIDATE_REF", "This row isn't linked to an applicant. Don't add or reorder rows; use the downloaded sheet.")] }
  }
  if (!current) {
    return { issues: [err("NOT_AN_APPLICANT", "This candidate isn't an applicant of this job (anymore).")] }
  }
  if (decision === null) return { noChange: true, snapshot: { fingerprint: current.fingerprint } }

  if (alreadyApplied(decision, current)) {
    return { noChange: true, action: decision, snapshot: { fingerprint: current.fingerprint } }
  }
  if (!current.actionable) {
    const label = formatShortlistBlockedReason(current.blockedReason) ?? "no longer in the queue"
    return { issues: [err("NOT_ACTIONABLE", `Can't be changed here: ${label.toLowerCase()}.`)] }
  }
  if (row.state && row.state !== current.fingerprint) {
    return {
      issues: [err("STALE_ROW", "This applicant changed after you downloaded the sheet. Download a fresh sheet and redo this row.")],
    }
  }

  const issues =
    decision === "REJECT"
      ? [{ severity: "warning" as const, code: "REJECT_LOCKS", message: "Rejecting locks the applicant's pipeline." }]
      : []
  return { action: decision, issues, snapshot: { fingerprint: current.fingerprint } }
}
