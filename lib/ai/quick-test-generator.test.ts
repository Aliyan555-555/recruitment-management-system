import { test } from "node:test"
import assert from "node:assert/strict"
import { parseQuickTestQuestions, stripHtml } from "./quick-test-generator"

const makeQuestions = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    question: `What is the right answer to question number ${i}?`,
    options: [`A${i}`, `B${i}`, `C${i}`, `D${i}`],
    correct: `A${i}`,
  }))

test("parseQuickTestQuestions returns equal points that sum to 100", () => {
  const result = parseQuickTestQuestions(JSON.stringify(makeQuestions(7)), 7)
  assert.equal(result.length, 7)
  assert.equal(result.reduce((sum, q) => sum + q.points, 0), 100)
  assert.ok(Math.max(...result.map((q) => q.points)) - Math.min(...result.map((q) => q.points)) <= 1)
})

test("parseQuickTestQuestions keeps the correct answer among shuffled options", () => {
  const result = parseQuickTestQuestions(JSON.stringify(makeQuestions(5)), 5, () => 0.3)
  for (const q of result) {
    assert.equal(q.options.length, 4)
    assert.ok(q.options.includes(q.correct))
  }
})

test("parseQuickTestQuestions accepts fenced and wrapped payloads", () => {
  const raw = "```json\n" + JSON.stringify({ questions: makeQuestions(5) }) + "\n```"
  assert.equal(parseQuickTestQuestions(raw, 5).length, 5)
})

test("parseQuickTestQuestions rejects bad payloads", () => {
  assert.throws(() => parseQuickTestQuestions("not json", 5))
  assert.throws(() => parseQuickTestQuestions(JSON.stringify(makeQuestions(3)), 5))
  const noMatch = makeQuestions(5).map((q) => ({ ...q, correct: "zzz" }))
  assert.throws(() => parseQuickTestQuestions(JSON.stringify(noMatch), 5))
  const dupes = makeQuestions(5).map((q) => ({ ...q, question: "The very same question text here?" }))
  assert.throws(() => parseQuickTestQuestions(JSON.stringify(dupes), 5))
})

test("parseQuickTestQuestions drops questions with duplicate options and trims extras", () => {
  const list = [
    { question: "Duplicate options question text?", options: ["x", "x", "y", "z"], correct: "x" },
    ...makeQuestions(6),
  ]
  const result = parseQuickTestQuestions(JSON.stringify(list), 5)
  assert.equal(result.length, 5)
  assert.ok(result.every((q) => q.question !== "Duplicate options question text?"))
})

test("stripHtml removes tags and truncates", () => {
  assert.equal(stripHtml("<p>Hello&nbsp;<b>World</b></p>", 100), "Hello World")
  assert.equal(stripHtml("abcdef", 3), "abc")
  assert.equal(stripHtml(null, 3), "")
})
