import test from "node:test"
import assert from "node:assert/strict"
import { deriveInterviewStatus } from "./derived-status"

const now = new Date("2026-10-12T10:00:00.000Z")
const future = { endsAt: new Date("2026-10-12T11:00:00.000Z") }
const past = { endsAt: new Date("2026-10-12T09:00:00.000Z") }

test("lifecycle of an interview round", () => {
  const d = (stepStatus: string, booking: { endsAt: Date } | null, pipelineMovedOn = false) =>
    deriveInterviewStatus({ stepStatus, booking, pipelineMovedOn, now })

  assert.equal(d("PENDING", null), "NOT_ADMITTED")
  assert.equal(d("IN_PROGRESS", null), "AWAITING_BOOKING")
  assert.equal(d("IN_PROGRESS", future), "SCHEDULED")
  assert.equal(d("IN_PROGRESS", past), "AWAITING_FEEDBACK")
  assert.equal(d("COMPLETED", past), "READY_FOR_DECISION")
  assert.equal(d("COMPLETED", past, true), "DECIDED")
  assert.equal(d("REJECTED", null), "DECIDED")
  assert.equal(d("SKIPPED", null), "DECIDED")
})
