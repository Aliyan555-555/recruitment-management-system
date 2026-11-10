import test from "node:test"
import assert from "node:assert/strict"
import { coerceCell, cellToPrimitive } from "./coerce"
import { findDuplicates, importActiveKey, normalizeCnic, normalizeEmail, normalizeLoose, normalizePhone, sha256Hex } from "./dedupe"
import { enumOptions, humanize, matchEnum, type EnumMatch } from "./enums"
import { cleanText, looksLikeFormula, neutralizeFormula, restoreFormula, sanitizeForExport } from "./sanitize"
import type { ColumnDef } from "./types"

const decisionOptions = enumOptions(["SHORTLIST", "REJECT", "MAYBE", "CLEAR_MAYBE"], { CLEAR_MAYBE: "Clear maybe" })
const col = (over: Partial<ColumnDef>): ColumnDef => ({ key: "c", header: "Col", type: "text", ...over })

test("formula-looking text is neutralized on export and restored on import", () => {
  for (const v of ["=1+1", "+92300", "-Ali", "@SUM(A1)"]) {
    const safe = neutralizeFormula(v)
    assert.equal(safe, `'${v}`)
    assert.equal(restoreFormula(safe), v)
  }
  assert.equal(neutralizeFormula("Ali Khan"), "Ali Khan")
  // an apostrophe that does not protect a trigger is the user's own text
  assert.equal(restoreFormula("'Ali"), "'Ali")
  assert.equal(sanitizeForExport(42), 42)
  assert.equal(looksLikeFormula("  =A1"), true)
})

test("cleanText trims, strips control characters and normalizes unicode", () => {
  assert.equal(cleanText("  Ali\u0000 Khan\n "), "Ali  Khan")
  assert.equal(cleanText("é"), "é")
  assert.equal(cleanText("علی خان"), "علی خان")
})

test("enum values are matched by label or code, ignoring case and separators", () => {
  assert.deepEqual(matchEnum("shortlist", decisionOptions), { ok: true, option: decisionOptions[0] })
  assert.equal((matchEnum("CLEAR MAYBE", decisionOptions) as Extract<EnumMatch, { ok: true }>).option.value, "CLEAR_MAYBE")
  assert.equal((matchEnum("clear-maybe", decisionOptions) as Extract<EnumMatch, { ok: true }>).option.value, "CLEAR_MAYBE")
  assert.equal(humanize("STRONG_HIRE"), "Strong hire")
})

test("a typo gets a suggestion, an unrelated word does not", () => {
  const typo = matchEnum("SHORTLST", decisionOptions)
  assert.equal(typo.ok, false)
  assert.equal(!typo.ok && typo.suggestion?.value, "SHORTLIST")
  const other = matchEnum("banana", decisionOptions)
  assert.equal(!other.ok && other.suggestion, null)
})

test("enum cells: valid maps to the system value, invalid explains and suggests", () => {
  const c = col({ type: "enum", header: "Decision", options: decisionOptions, required: true })
  assert.equal(coerceCell(c, "Reject").value, "REJECT")
  const bad = coerceCell(c, "Shortlst")
  assert.equal(bad.value, null)
  assert.equal(bad.issues[0].code, "INVALID_ENUM")
  assert.match(bad.issues[0].message, /Did you mean "Shortlist"/)
  assert.equal(coerceCell(c, "").issues[0].code, "REQUIRED")
})

test("email is lowercased and validated", () => {
  const c = col({ type: "email", header: "Email" })
  assert.equal(coerceCell(c, "  Ali@Example.COM ").value, "ali@example.com")
  assert.equal(coerceCell(c, "not-an-email").issues[0].code, "INVALID_EMAIL")
  assert.equal(coerceCell(c, `${"a".repeat(95)}@x.com`).issues[0].code, "TOO_LONG")
})

test("phone keeps a leading zero, flags numeric cells, and rejects junk", () => {
  const c = col({ type: "phone", header: "Phone" })
  assert.equal(coerceCell(c, "0300 123-4567").value, "03001234567")
  assert.equal(coerceCell(c, "+92 300 1234567").value, "+923001234567")
  const numeric = coerceCell(c, 3001234567)
  assert.equal(numeric.issues[0].code, "PHONE_AS_NUMBER")
  assert.equal(numeric.issues[0].severity, "warning")
  assert.equal(coerceCell(c, "12345").issues[0].code, "INVALID_PHONE")
  assert.equal(coerceCell(c, "abc").issues[0].code, "INVALID_PHONE")
})

test("numbers: type, integer and range checks", () => {
  const score = col({ type: "integer", header: "Score", min: 0, max: 100 })
  assert.equal(coerceCell(score, 80).value, 80)
  assert.equal(coerceCell(score, "75").value, 75)
  assert.equal(coerceCell(score, 80.5).issues[0].code, "NOT_AN_INTEGER")
  assert.equal(coerceCell(score, 101).issues[0].code, "OUT_OF_RANGE")
  assert.equal(coerceCell(score, "abc").issues[0].code, "NOT_A_NUMBER")
  assert.equal(coerceCell(score, true).issues[0].code, "NOT_A_NUMBER")
  assert.equal(coerceCell(col({ type: "number" }), 3.5).value, 3.5)
})

test("dates: ISO text, real calendar dates, Excel date cells", () => {
  const c = col({ type: "date", header: "Date" })
  assert.equal(coerceCell(c, "2026-11-05").value, "2026-11-05")
  assert.equal(coerceCell(c, new Date("2026-11-05T00:00:00.000Z")).value, "2026-11-05")
  assert.equal(coerceCell(c, "2026-02-30").issues[0].code, "INVALID_DATE")
  assert.equal(coerceCell(c, "05/11/2026").issues[0].code, "INVALID_DATE")
  assert.equal(coerceCell(c, new Date("nope")).issues[0].code, "INVALID_DATE")
})

test("booleans accept yes/no style values", () => {
  const c = col({ type: "boolean", header: "Send email" })
  assert.equal(coerceCell(c, "Yes").value, true)
  assert.equal(coerceCell(c, "n").value, false)
  assert.equal(coerceCell(c, "maybe").issues[0].code, "INVALID_BOOLEAN")
})

test("text: limit, formula guard, restored apostrophe", () => {
  const c = col({ type: "text", header: "Note", maxLength: 5 })
  assert.equal(coerceCell(c, "abcdef").issues[0].code, "TOO_LONG")
  assert.equal(coerceCell(col({ header: "Note" }), "=cmd()").issues[0].code, "FORMULA_TEXT")
  assert.equal(coerceCell(col({ header: "Note" }), "'-Ali").value, "-Ali")
  assert.equal(coerceCell(col({ header: "Note" }), "   ").value, null)
})

test("rich text, hyperlink, formula and error cells are unwrapped or rejected", () => {
  assert.equal(cellToPrimitive({ richText: [{ text: "Ali " }, { text: "Khan" }] }).value, "Ali Khan")
  assert.equal(cellToPrimitive({ text: "site", hyperlink: "http://x" }).value, "site")
  const withResult = cellToPrimitive({ formula: "1+1", result: 2 })
  assert.equal(withResult.value, 2)
  assert.equal(withResult.issues[0].code, "FORMULA_VALUE")
  assert.equal(cellToPrimitive({ formula: "1+1" }).issues[0].code, "FORMULA_NO_RESULT")
  assert.equal(cellToPrimitive({ error: "#N/A" }).issues[0].code, "EXCEL_ERROR")
})

test("identity normalizers fold equivalent spellings together", () => {
  assert.equal(normalizeEmail(" Ali@X.com "), "ali@x.com")
  const forms = ["0300 1234567", "+92 300 1234567", "00923001234567", "0300-1234567"]
  assert.equal(new Set(forms.map(normalizePhone)).size, 1)
  assert.equal(normalizePhone("0300 1234567"), "923001234567")
  assert.equal(normalizeCnic("35202-1234567-1"), "3520212345671")
  assert.equal(normalizeLoose("  Lahöre   CITY "), "lahore city")
})

test("duplicate grouping and keys", () => {
  const dups = findDuplicates(["a", "b", "a", "c", "c", "c"], (x) => x)
  assert.deepEqual([...dups.keys()].sort(), ["a", "c"])
  assert.equal(findDuplicates([{ k: null }, { k: null }], (x) => x.k).size, 0)
  assert.equal(importActiveKey("SHORTLIST", "5", null), "SHORTLIST:5:-")
  assert.equal(sha256Hex("abc").length, 64)
})
