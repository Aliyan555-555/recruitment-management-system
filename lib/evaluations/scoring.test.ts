import test from "node:test"
import assert from "node:assert/strict"
import { aggregateEvaluations, scoreFormData, validatePanelForm, validateSkillsForm, DEFAULT_SKILL_MAX } from "./scoring"

const fullSkills = (rating: number) =>
  Object.fromEntries(Object.entries(DEFAULT_SKILL_MAX).map(([k, max]) => [k, { rating: Math.min(rating, max), max }]))

test("skills scorecard scoring", () => {
  const s = scoreFormData({ skills: fullSkills(5) })!
  assert.equal(s.kind, "skills")
  assert.equal(s.max, 150)
  assert.equal(s.total, 60) // ten skills at 5 + two at 5
  assert.equal(s.percentage, 40)
})

test("panel behaviours scoring", () => {
  const s = scoreFormData({ focusGroup: { panel: { behaviors: [{ rating: 4 }, { rating: 3 }, { rating: 2 }] } } })!
  assert.deepEqual([s.total, s.max, s.percentage, s.kind], [9, 12, 75, "panel"])
})

test("legacy focus group scoring sums internal + external", () => {
  const s = scoreFormData({ focusGroup: { internal: { score: 20, maxScore: 40 }, external: { score: 30, maxScore: 40 } } })!
  assert.deepEqual([s.total, s.max, s.percentage, s.kind], [50, 80, 63, "legacy-focus-group"])
  assert.equal(scoreFormData(null), null)
  assert.equal(scoreFormData({}), null)
})

test("validation", () => {
  assert.match(validateSkillsForm({ skills: { appearance: { rating: 5 } } })!, /All skill ratings/)
  assert.equal(validateSkillsForm({ skills: fullSkills(5), recommendedToHire: "HIRE" }), null)
  assert.match(validateSkillsForm({ skills: { ...fullSkills(5), appearance: { rating: 99, max: 10 } }, recommendedToHire: "HIRE" })!, /range/)
  assert.match(validatePanelForm({ focusGroup: { panel: { behaviors: [{ rating: 5 }] } }, recommendedToHire: "HIRE" })!, /1 to 4/)
  assert.equal(validatePanelForm({ focusGroup: { panel: { behaviors: [{ rating: 3 }] } }, recommendedToHire: "NO_HIRE" }), null)
})

test("aggregate ignores drafts, averages scores, majority decides", () => {
  const card = (rating: number, rec: string, submitted: number | null) => ({
    submittedAt: submitted,
    formData: { skills: fullSkills(rating), recommendedToHire: rec },
  })
  const agg = aggregateEvaluations([card(10, "HIRE", 1), card(6, "HIRE", 2), card(2, "NO_HIRE", 3), card(10, "HIRE", null)])
  assert.equal(agg.submittedCount, 3)
  assert.equal(agg.recommendation, "HIRE")
  assert.deepEqual([agg.hireVotes, agg.noHireVotes, agg.isSplit], [2, 1, false])
  assert.ok(agg.scorePercentage > 0 && agg.scorePercentage < 100)
})

test("a tie is reported as split, nothing submitted gives no recommendation", () => {
  const card = (rec: string) => ({ submittedAt: 1, formData: { skills: fullSkills(5), recommendedToHire: rec } })
  const tie = aggregateEvaluations([card("HIRE"), card("NO_HIRE")])
  assert.equal(tie.recommendation, null)
  assert.equal(tie.isSplit, true)
  const none = aggregateEvaluations([{ submittedAt: null, formData: {} }])
  assert.deepEqual([none.submittedCount, none.recommendation, none.isSplit], [0, null, false])
})
