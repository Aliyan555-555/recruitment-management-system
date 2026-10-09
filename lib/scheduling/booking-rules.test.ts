import test from "node:test"
import assert from "node:assert/strict"
import { checkBookable, checkReschedulable, type BookingFacts } from "./booking-rules"

const NOW = new Date("2026-10-12T05:00:00.000Z")

function facts(over: Partial<BookingFacts> = {}, slot: Partial<BookingFacts["slot"]> = {}): BookingFacts {
  return {
    candidateId: "7",
    now: NOW,
    minLeadMins: 60,
    pipeline: { candidateId: "7", jobId: "1", overallStatus: "IN_PROGRESS", lockState: "NONE", currentStepOrder: 2 },
    pipelineStep: { status: "IN_PROGRESS", stepOrder: 2 },
    slot: { jobId: "1", startsAt: new Date("2026-10-13T05:00:00.000Z"), isBlocked: false, capacity: 1, bookedCount: 0, ...slot },
    hasActiveBooking: false,
    noShowCount: 0,
    ...over,
  }
}

test("a clean booking is allowed", () => {
  assert.equal(checkBookable(facts()), null)
})

test("someone else's pipeline is refused first", () => {
  assert.equal(checkBookable(facts({ pipeline: { candidateId: "9", jobId: "1", overallStatus: "IN_PROGRESS", lockState: "NONE", currentStepOrder: 2 } }))?.code, "NOT_YOURS")
})

test("closed, rejected or locked pipelines cannot book", () => {
  const base = { candidateId: "7", jobId: "1", currentStepOrder: 2 }
  assert.equal(checkBookable(facts({ pipeline: { ...base, overallStatus: "REJECTED", lockState: "LOCKED_REJECTED" } }))?.code, "PIPELINE_CLOSED")
  assert.equal(checkBookable(facts({ pipeline: { ...base, overallStatus: "COMPLETED", lockState: "NONE" } }))?.code, "PIPELINE_CLOSED")
})

test("slot must belong to the candidate's current, admitted round", () => {
  assert.equal(checkBookable(facts({}, { jobId: "2" }))?.code, "WRONG_ROUND")
  assert.equal(checkBookable(facts({ pipelineStep: null }))?.code, "WRONG_ROUND")
  assert.equal(checkBookable(facts({ pipelineStep: { status: "IN_PROGRESS", stepOrder: 3 } }))?.code, "WRONG_ROUND")
  assert.equal(checkBookable(facts({ pipelineStep: { status: "PENDING", stepOrder: 2 } }))?.code, "NOT_ADMITTED")
})

test("one active booking per round and a no-show cap", () => {
  assert.equal(checkBookable(facts({ hasActiveBooking: true }))?.code, "ALREADY_BOOKED")
  assert.equal(checkBookable(facts({ noShowCount: 2 }))?.code, "TOO_MANY_NO_SHOWS")
  assert.equal(checkBookable(facts({ noShowCount: 1 })), null)
})

test("slot state: blocked, past, too soon, full", () => {
  assert.equal(checkBookable(facts({}, { isBlocked: true }))?.code, "SLOT_UNAVAILABLE")
  assert.equal(checkBookable(facts({}, { startsAt: new Date("2026-10-12T04:00:00.000Z") }))?.code, "SLOT_UNAVAILABLE")
  assert.equal(checkBookable(facts({}, { startsAt: new Date("2026-10-12T05:30:00.000Z") }))?.code, "SLOT_TOO_SOON")
  assert.equal(checkBookable(facts({}, { capacity: 3, bookedCount: 3 }))?.code, "SLOT_FULL")
  assert.equal(checkBookable(facts({}, { capacity: 3, bookedCount: 2 })), null)
})

test("admin reschedule rules", () => {
  const slot = { isBlocked: false, startsAt: new Date("2026-10-13T05:00:00.000Z"), capacity: 1, bookedCount: 0 }
  assert.equal(checkReschedulable({ now: NOW, minLeadMins: 60, sameRound: true, slot }), null)
  assert.equal(checkReschedulable({ now: NOW, minLeadMins: 60, sameRound: false, slot })?.code, "WRONG_ROUND")
  assert.equal(checkReschedulable({ now: NOW, minLeadMins: 60, sameRound: true, slot: { ...slot, bookedCount: 1 } })?.code, "SLOT_FULL")
})
