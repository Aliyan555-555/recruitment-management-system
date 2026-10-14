import test from "node:test"
import assert from "node:assert/strict"
import { buildQuickTestRows, matchJobSkills, screeningCriteria, summarizeScreeningForm } from "./dossier-helpers"

test("screening criteria map every criterion, null when unrated", () => {
  const rows = screeningCriteria({ skills: { appearance: { rating: 7, max: 10 }, experience: { rating: 20, max: 25 } } })
  assert.equal(rows.length, 12)
  assert.deepEqual(rows.find((r) => r.key === "appearance"), { key: "appearance", label: "Appearance & outward personality", rating: 7, max: 10 })
  assert.equal(rows.find((r) => r.key === "itSkills")!.rating, null)
})

test("screening summary exposes score, recommendation and comments", () => {
  const s = summarizeScreeningForm({ skills: { appearance: { rating: 5, max: 10 } }, recommendedToHire: "HIRE", comments: "  good  " })
  assert.equal(s.total, 5)
  assert.equal(s.recommendation, "HIRE")
  assert.equal(s.comments, "good")
  assert.equal(summarizeScreeningForm({}).recommendation, null)
})

test("job skills match candidate skills case/alias-insensitively", () => {
  const r = matchJobSkills(
    [
      { skillName: "React", priority: "REQUIRED" },
      { skillName: "Docker", priority: "PREFERRED" },
    ],
    [{ skillName: "react", level: 4, verifiedLevel: "EXPERT", assessmentPercent: 90 }]
  )
  assert.equal(r.matchedCount, 1)
  assert.equal(r.percentage, 50)
  assert.equal(r.skills[0].verifiedLevel, "EXPERT")
  assert.equal(r.skills[1].matched, false)
})

test("quick test rows are ordered and joined with answers", () => {
  const rows = buildQuickTestRows(
    [
      { id: BigInt(2), question: "B?", options: ["x", "y"], correctOption: "y", points: 10, order: 2 },
      { id: BigInt(1), question: "A?", options: ["a", "b"], correctOption: "a", points: 10, order: 1 },
    ],
    [{ questionId: BigInt(1), selectedOption: "a", isCorrect: true, pointsAwarded: 10 }]
  )
  assert.deepEqual(rows.map((r) => r.order), [1, 2])
  assert.equal(rows[0].isCorrect, true)
  assert.equal(rows[1].selectedOption, null)
  assert.equal(rows[1].pointsAwarded, 0)
})
