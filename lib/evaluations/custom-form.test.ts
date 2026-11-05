import { test } from "node:test"
import assert from "node:assert/strict"
import {
  customFormSchema,
  normalizeCustomFormData,
  parseCustomFormSchema,
  scoreCustomForm,
  validateCustomForm,
} from "./custom-form"
import { aggregateEvaluations, scoreFormData } from "./scoring"

const form = customFormSchema.parse({
  recommendationEnabled: true,
  fields: [
    { key: "problemSolving", label: "Problem solving", type: "RATING", max: 5, weight: 2 },
    { key: "yearsRelevant", label: "Relevant years", type: "NUMBER", max: 20, required: false },
    { key: "level", label: "Seniority", type: "SELECT", options: ["Junior", "Mid", "Senior"] },
    { key: "notes", label: "Notes", type: "TEXT", required: false },
    { key: "remoteReady", label: "Remote ready", type: "BOOLEAN" },
  ],
})

const valid = {
  custom: { problemSolving: 4, level: "Mid", remoteReady: true },
  recommendedToHire: "Recommended",
}

test("schema rejects duplicate keys, missing max and select without options", () => {
  assert.equal(
    customFormSchema.safeParse({ fields: [{ key: "a", label: "A", type: "TEXT" }, { key: "A", label: "B", type: "TEXT" }] }).success,
    false
  )
  assert.equal(customFormSchema.safeParse({ fields: [{ key: "a", label: "A", type: "RATING" }] }).success, false)
  assert.equal(customFormSchema.safeParse({ fields: [{ key: "a", label: "A", type: "SELECT", options: ["x"] }] }).success, false)
  assert.equal(customFormSchema.safeParse({ fields: [], recommendationEnabled: false }).success, false)
  assert.equal(parseCustomFormSchema({ nope: true }), null)
})

test("validateCustomForm accepts a complete scorecard and skips optional blanks", () => {
  assert.equal(validateCustomForm(form, valid), null)
})

test("validateCustomForm reports missing, out-of-range and invalid values", () => {
  assert.match(validateCustomForm(form, { ...valid, custom: { ...valid.custom, problemSolving: undefined } })!, /Problem solving/)
  assert.match(validateCustomForm(form, { ...valid, custom: { ...valid.custom, problemSolving: 6 } })!, /1 to 5/)
  assert.match(validateCustomForm(form, { ...valid, custom: { ...valid.custom, level: "Principal" } })!, /invalid choice/)
  assert.match(validateCustomForm(form, { ...valid, custom: { ...valid.custom, yearsRelevant: 25 } })!, /between 0 and 20/)
  assert.match(validateCustomForm(form, { ...valid, recommendedToHire: "" })!, /Recommendation/)
})

test("scoring is weighted and ignores unanswered optional numbers", () => {
  assert.deepEqual(scoreCustomForm(form, valid), { total: 8, max: 10 })
  assert.deepEqual(scoreCustomForm(form, { custom: { ...valid.custom, yearsRelevant: 10 } }), { total: 18, max: 30 })
})

test("normalizeCustomFormData drops undeclared fields and feeds the shared aggregation", () => {
  const stored = normalizeCustomFormData(form, { ...valid, custom: { ...valid.custom, injected: "x" } })
  assert.equal("injected" in stored.custom, false)
  const scored = scoreFormData(stored)
  assert.equal(scored?.kind, "custom")
  assert.equal(scored?.percentage, 80)

  const agg = aggregateEvaluations([
    { submittedAt: 1, formData: stored },
    { submittedAt: 1, formData: normalizeCustomFormData(form, { ...valid, recommendedToHire: "no" }) },
  ])
  assert.equal(agg.submittedCount, 2)
  assert.equal(agg.scorePercentage, 80)
})
