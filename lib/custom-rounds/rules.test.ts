import { test } from "node:test"
import assert from "node:assert/strict"
import { parseCustomRoundTemplateInput } from "./rules"

const base = {
  name: "Technical assessment",
  isInterview: true,
  interviewMode: "REMOTE",
  durationMins: 45,
  panelSize: 2,
  bufferMins: 10,
  capacityPerSlot: 1,
  evaluation: {
    recommendationEnabled: true,
    fields: [{ key: "problemSolving", label: "Problem solving", type: "RATING", max: 5, required: true, weight: 1 }],
  },
}

test("a complete template is accepted", () => {
  assert.equal(parseCustomRoundTemplateInput(base).ok, true)
})

test("name, duration and form are validated", () => {
  assert.equal(parseCustomRoundTemplateInput({ ...base, name: "x" }).ok, false)
  assert.equal(parseCustomRoundTemplateInput({ ...base, durationMins: 2 }).ok, false)
  assert.equal(parseCustomRoundTemplateInput({ ...base, durationMins: null }).ok, false)
  assert.equal(parseCustomRoundTemplateInput({ ...base, evaluation: { fields: [{ key: "a", label: "A", type: "RATING" }] } }).ok, false)
  assert.equal(parseCustomRoundTemplateInput({ ...base, evaluation: { recommendationEnabled: false, fields: [] } }).ok, false)
})

test("a non-scheduled round drops scheduling settings", () => {
  const parsed = parseCustomRoundTemplateInput({ ...base, isInterview: false, durationMins: null })
  assert.equal(parsed.ok, true)
  if (parsed.ok) {
    assert.equal(parsed.value.durationMins, null)
    assert.equal(parsed.value.interviewMode, null)
    assert.equal(parsed.value.panelSize, 1)
  }
})
