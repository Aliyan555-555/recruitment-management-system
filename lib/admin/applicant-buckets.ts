// Pure grouping of a job's applicants into review tabs and filter buckets.
// Shared by the applicants API (counts) and the Applicants page (lists), so the
// numbers on tabs always match the rows shown.
import { CandidateFilterFacts, evaluateFilters, ShortlistFilters } from "../ai-shortlist/filters"
import type { ShortlistQueueTab } from "./shortlist-eligibility"

export type ApplicantTab = "to_review" | "maybe" | "shortlisted" | "rejected"
export const APPLICANT_TABS: ApplicantTab[] = ["to_review", "maybe", "shortlisted", "rejected"]

export function applicantTab(queueTab: ShortlistQueueTab, reviewFlag: string | null | undefined): ApplicantTab {
  if (queueTab === "shortlisted") return "shortlisted"
  if (queueTab === "rejected") return "rejected"
  return reviewFlag === "MAYBE" ? "maybe" : "to_review"
}

export interface BucketableApplicant {
  tab: ApplicantTab
  filterFacts?: CandidateFilterFacts | null
}

export interface TabGroup<T> {
  match: T[]
  needsReview: T[]
  filteredOut: (T & { filterReasons: string[] })[]
  total: number
}

/** Hard filters only apply to undecided tabs (to_review, maybe); decided tabs show everyone. */
export function groupApplicants<T extends BucketableApplicant>(
  rows: T[],
  filters: ShortlistFilters
): Record<ApplicantTab, TabGroup<T>> {
  const out = Object.fromEntries(
    APPLICANT_TABS.map((t) => [t, { match: [], needsReview: [], filteredOut: [], total: 0 }])
  ) as unknown as Record<ApplicantTab, TabGroup<T>>

  for (const row of rows) {
    const group = out[row.tab]
    group.total++
    if (row.tab === "shortlisted" || row.tab === "rejected") {
      group.match.push(row)
      continue
    }
    const ev = evaluateFilters(row.filterFacts, filters)
    if (ev.bucket === "FILTERED_OUT") {
      group.filteredOut.push({
        ...row,
        filterReasons: ev.checks.filter((c) => c.outcome === "FAIL").map((c) => c.reason),
      })
    } else if (ev.bucket === "NEEDS_REVIEW") {
      group.needsReview.push(row)
    } else {
      group.match.push(row)
    }
  }
  return out
}
