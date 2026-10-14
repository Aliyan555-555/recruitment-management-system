import test from "node:test"
import assert from "node:assert/strict"
import { normalizeStep } from "./step-persistence"

test("normalizeStep leaves the interviewer pool untouched when the payload omits it", () => {
  assert.equal(normalizeStep({ stepType: "SCREENING_INTERVIEW", stepOrder: 1 } as any).interviewerIds, undefined)
})

test("normalizeStep still cleans an explicit interviewer list and ignores it for non-interview rounds", () => {
  assert.deepEqual(normalizeStep({ stepType: "SCREENING_INTERVIEW", stepOrder: 1, interviewerIds: ["1", "1", "x", 2] } as any).interviewerIds, ["1", "2"])
  assert.deepEqual(normalizeStep({ stepType: "OFFER", stepOrder: 2, interviewerIds: ["1"] } as any).interviewerIds, [])
})
