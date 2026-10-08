import test from "node:test"
import assert from "node:assert/strict"
import { matchInstitute, normalizeInstituteName } from "./institutes"

const institutes = [
  { id: "1", name: "NED University of Engineering and Technology", aliases: ["NED", "NEDUET", "NED University"] },
  { id: "2", name: "University of Karachi", aliases: ["Karachi University", "KU"] },
]

test("normalize strips punctuation and noise words", () => {
  assert.equal(normalizeInstituteName("The University of Karachi."), "university karachi")
})

test("matches by name and alias, case/punctuation insensitive", () => {
  assert.equal(matchInstitute("NEDUET", institutes), "1")
  assert.equal(matchInstitute("ned university", institutes), "1")
  assert.equal(matchInstitute("University Of Karachi", institutes), "2")
  assert.equal(matchInstitute("Karachi University", institutes), "2")
  assert.equal(matchInstitute("KU", institutes), "2")
})

test("multi-word alias with trailing city still matches", () => {
  assert.equal(matchInstitute("NED University Karachi", institutes), "1")
})

test("unknown or empty text does not match", () => {
  assert.equal(matchInstitute("Random College", institutes), null)
  assert.equal(matchInstitute("", institutes), null)
  assert.equal(matchInstitute("KU Leuven Belgium", institutes), null)
})
