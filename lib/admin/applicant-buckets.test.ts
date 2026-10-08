import test from "node:test"
import assert from "node:assert/strict"
import { applicantTab, groupApplicants } from "./applicant-buckets"

const facts = (dob: string | null) => ({ dob, instituteIds: [], hasInstituteText: false, cgpa: null })

test("applicantTab maps queue + maybe flag", () => {
  assert.equal(applicantTab("applied", null), "to_review")
  assert.equal(applicantTab("applied", "MAYBE"), "maybe")
  assert.equal(applicantTab("shortlisted", "MAYBE"), "shortlisted")
  assert.equal(applicantTab("rejected", null), "rejected")
})

test("groupApplicants buckets undecided tabs by filters and counts every row", () => {
  const filters = { ageRange: { min: 20, max: 30, asOf: "2026-10-01" } }
  const rows = [
    { id: "a", tab: "to_review" as const, filterFacts: facts("2000-01-01") }, // 26 match
    { id: "b", tab: "to_review" as const, filterFacts: facts("1980-01-01") }, // 46 out
    { id: "c", tab: "to_review" as const, filterFacts: facts(null) }, // needs review
    { id: "d", tab: "maybe" as const, filterFacts: facts("1980-01-01") }, // maybe, out
    { id: "e", tab: "shortlisted" as const, filterFacts: facts("1980-01-01") }, // decided: ignore filters
  ]
  const g = groupApplicants(rows, filters)
  assert.deepEqual(g.to_review.match.map((r) => r.id), ["a"])
  assert.deepEqual(g.to_review.needsReview.map((r) => r.id), ["c"])
  assert.deepEqual(g.to_review.filteredOut.map((r) => r.id), ["b"])
  assert.match(g.to_review.filteredOut[0].filterReasons[0], /above 30/)
  assert.equal(g.to_review.total, 3)
  assert.equal(g.maybe.filteredOut.length, 1)
  assert.deepEqual(g.shortlisted.match.map((r) => r.id), ["e"])
  // every row is in exactly one list
  const listed = Object.values(g).reduce((n, t) => n + t.match.length + t.needsReview.length + t.filteredOut.length, 0)
  assert.equal(listed, rows.length)
})

test("no filters -> everything undecided matches", () => {
  const g = groupApplicants([{ tab: "to_review" as const, filterFacts: null }], {})
  assert.equal(g.to_review.match.length, 1)
})
