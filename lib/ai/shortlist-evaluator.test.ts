import test from "node:test"
import assert from "node:assert/strict"
import { parseBatchResponse } from "./shortlist-evaluator"

const item = (id: string, over: object = {}) => ({
  id,
  skillsScore: 80,
  educationScore: 70,
  experienceScore: 60,
  successCriteriaScore: 50,
  confidence: 90,
  educationSatisfied: true,
  mandatoryChecklist: [{ requirement: "React", priority: "REQUIRED", met: true, note: "Listed" }],
  strengths: ["a", "b", "c", "d"],
  concerns: [],
  reasoning: "Solid fit.",
  ...over,
})

test("parseBatchResponse keeps valid items and drops invalid ones", () => {
  const raw = JSON.stringify({
    results: [item("c1"), item("c2", { skillsScore: "not a number" }), item("c3", { reasoning: "" })],
  })
  const parsed = parseBatchResponse(raw)
  assert.deepEqual([...parsed.keys()], ["c1"])
  assert.equal(parsed.get("c1")!.strengths.length, 3) // trimmed, not rejected
})

test("parseBatchResponse clamps scores and accepts fenced / bare-array output", () => {
  const fenced = "```json\n" + JSON.stringify([item("c1", { skillsScore: 140, confidence: -5 })]) + "\n```"
  const parsed = parseBatchResponse(fenced)
  assert.equal(parsed.get("c1")!.skillsScore, 100)
  assert.equal(parsed.get("c1")!.confidence, 0)
})

test("parseBatchResponse tolerates garbage", () => {
  assert.equal(parseBatchResponse("sorry, I cannot help").size, 0)
  assert.equal(parseBatchResponse(JSON.stringify({ results: "nope" })).size, 0)
})
