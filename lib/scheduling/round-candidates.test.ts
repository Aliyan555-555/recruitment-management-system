import test from "node:test"
import assert from "node:assert/strict"
import { buildRoundCandidateRow, type RoundCandidateFacts } from "./round-candidates"

const NOW = new Date("2026-10-12T10:00:00.000Z")
const H = 3600_000

const facts = (over: Partial<RoundCandidateFacts> = {}): RoundCandidateFacts => ({
  candidateId: "7",
  name: "Ayesha Khan",
  email: "a@example.test",
  pipelineId: "70",
  stepStatus: "IN_PROGRESS",
  stepOrder: 1,
  pipelineCurrentStepOrder: 1,
  pipelineStatus: "IN_PROGRESS",
  roundIsRequired: true,
  roundIsInterview: true,
  booking: null,
  lastBooking: null,
  noShowCount: 0,
  evaluations: [],
  now: NOW,
  ...over,
})

const booking = (startInH: number, ids = ["1"]) => ({
  id: "b1",
  slotId: "s1",
  startsAt: new Date(NOW.getTime() + startInH * H),
  endsAt: new Date(NOW.getTime() + (startInH + 0.5) * H),
  interviewerIds: ids,
  interviewerNames: ids.map((i) => `Iv ${i}`),
})

const card = (evaluatorId: string, rec: string, submitted = true) => ({
  evaluatorId,
  evaluatorName: `Iv ${evaluatorId}`,
  submittedAt: submitted ? 1 : null,
  recommendation: rec,
  formData: { recommendedToHire: rec, focusGroup: { panel: { behaviors: [{ rating: 3 }] } } },
})

test("waiting to book: admin can book for them, remind, reject; skip only when optional", () => {
  const req = buildRoundCandidateRow(facts())
  assert.equal(req.status, "AWAITING_BOOKING")
  assert.deepEqual(req.actions, ["BOOK_FOR_CANDIDATE", "REMIND", "REJECT"])
  const opt = buildRoundCandidateRow(facts({ roundIsRequired: false }))
  assert.ok(opt.actions.includes("SKIP"))
})

test("scheduled: reschedule / cancel / reject", () => {
  const row = buildRoundCandidateRow(facts({ booking: booking(24) }))
  assert.equal(row.status, "SCHEDULED")
  assert.deepEqual(row.actions, ["RESCHEDULE", "CANCEL_BOOKING", "REJECT"])
  assert.deepEqual(row.booking?.interviewers, ["Iv 1"])
})

test("feedback pending: admin can decide anyway with a warning (panel member missing)", () => {
  const row = buildRoundCandidateRow(facts({ booking: booking(-2, ["1", "2"]), evaluations: [card("1", "HIRE")] }))
  assert.equal(row.status, "AWAITING_FEEDBACK")
  assert.ok(row.actions.includes("PASS") && row.actions.includes("NO_SHOW"))
  assert.match(row.passWarning!, /1 of 2 scorecards/)
  assert.equal(row.scorecards.submitted, 1)
  assert.equal(row.scorecards.expected, 2)
})

test("ready for decision: pass / reject, with aggregated scorecards of the panel only", () => {
  const row = buildRoundCandidateRow(
    facts({
      stepStatus: "COMPLETED",
      lastBooking: { status: "COMPLETED", startsAt: new Date(NOW.getTime() - 2 * H), interviewerIds: ["1", "2"] },
      evaluations: [card("1", "HIRE"), card("2", "NO_HIRE"), card("9", "HIRE")],
    })
  )
  assert.equal(row.status, "READY_FOR_DECISION")
  assert.deepEqual(row.actions, ["PASS", "REJECT"])
  assert.equal(row.scorecards.isSplit, true)
  assert.equal(row.scorecards.submitted, 2, "evaluator 9 is not on the panel")
  assert.equal(row.passWarning, null)
})

test("outcomes once decided; no actions", () => {
  const passed = buildRoundCandidateRow(facts({ stepStatus: "COMPLETED", pipelineCurrentStepOrder: 2 }))
  assert.deepEqual([passed.status, passed.outcome, passed.actions.length], ["DECIDED", "PASSED", 0])
  const rejected = buildRoundCandidateRow(facts({ stepStatus: "REJECTED", pipelineStatus: "REJECTED" }))
  assert.deepEqual([rejected.outcome, rejected.actions.length], ["REJECTED", 0])
  const skipped = buildRoundCandidateRow(facts({ stepStatus: "SKIPPED", pipelineCurrentStepOrder: 2 }))
  assert.equal(skipped.outcome, "SKIPPED")
  // rejected later in another round still shows as passed here
  const laterRejected = buildRoundCandidateRow(facts({ stepStatus: "COMPLETED", pipelineCurrentStepOrder: 2, pipelineStatus: "REJECTED" }))
  assert.equal(laterRejected.outcome, "PASSED")
})

test("non-interview round in progress can be passed directly", () => {
  const row = buildRoundCandidateRow(facts({ roundIsInterview: false }))
  assert.deepEqual(row.actions, ["PASS", "REJECT"])
})
