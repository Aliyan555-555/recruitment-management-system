import test from "node:test"
import assert from "node:assert/strict"
import ExcelJS from "exceljs"
import { buildWorkbook, DATA_SHEET } from "./build-xlsx"
import { parseWorkbook } from "./parse-xlsx"
import {
  alreadyApplied,
  currentFromApplication,
  evaluateShortlistRow,
  SHORTLIST_TEMPLATE,
  type ShortlistCurrent,
} from "./templates/shortlist-rules"
import { validateSheet, type RowHandler } from "./validate"
import type { CoercedRow } from "./types"

const SECRET = "unit-test-secret"
const scope = { jobId: "7" }

const app = (over: Partial<Parameters<typeof currentFromApplication>[0]> = {}) =>
  currentFromApplication({ status: "SUBMITTED", reviewFlag: null, pipeline: null, ...over })

const row = (key: string | null, decision: string | null, state: string | null): CoercedRow => ({
  rowNumber: 2,
  key,
  state,
  issues: [],
  values: { decision },
})

test("fingerprint changes with status and flag, and is stable otherwise", () => {
  const base = app()
  assert.equal(app().fingerprint, base.fingerprint)
  assert.notEqual(app({ reviewFlag: "MAYBE" }).fingerprint, base.fingerprint)
  assert.notEqual(app({ status: "SHORTLISTED" }).fingerprint, base.fingerprint)
  assert.equal(base.actionable, true)
  assert.equal(app({ status: "SHORTLISTED" }).actionable, false)
})

test("alreadyApplied recognises the target state of each decision", () => {
  assert.equal(alreadyApplied("SHORTLIST", app({ status: "SHORTLISTED" })), true)
  assert.equal(alreadyApplied("SHORTLIST", app()), false)
  assert.equal(alreadyApplied("REJECT", app({ status: "REMOVED" })), true)
  assert.equal(alreadyApplied("MAYBE", app({ reviewFlag: "MAYBE" })), true)
  assert.equal(alreadyApplied("CLEAR_MAYBE", app()), true)
  assert.equal(alreadyApplied("CLEAR_MAYBE", app({ reviewFlag: "MAYBE" })), false)
  assert.equal(alreadyApplied(null, app()), false)
})

test("rows without a candidate reference or applicant are errors", () => {
  assert.equal(evaluateShortlistRow(row(null, "SHORTLIST", null), app()).issues?.[0].code, "NO_CANDIDATE_REF")
  assert.equal(evaluateShortlistRow(row("abc", "SHORTLIST", null), app()).issues?.[0].code, "NO_CANDIDATE_REF")
  assert.equal(evaluateShortlistRow(row("5", "SHORTLIST", null), undefined).issues?.[0].code, "NOT_AN_APPLICANT")
})

test("an empty decision, or one that is already in place, is no change", () => {
  const cur = app()
  assert.equal(evaluateShortlistRow(row("5", null, cur.fingerprint), cur).noChange, true)
  assert.equal(evaluateShortlistRow(row("5", "CLEAR_MAYBE", cur.fingerprint), cur).noChange, true)
  const shortlisted = app({ status: "SHORTLISTED" })
  const again = evaluateShortlistRow(row("5", "SHORTLIST", shortlisted.fingerprint), shortlisted)
  assert.equal(again.noChange, true)
  assert.equal(again.issues, undefined)
})

test("a blocked applicant can't be changed to something else", () => {
  const rejected = app({ status: "REMOVED", pipeline: { overallStatus: "REJECTED", lockState: "LOCKED_REJECTED", currentStepOrder: 1, steps: [] } })
  const result = evaluateShortlistRow(row("5", "SHORTLIST", "old"), rejected)
  assert.equal(result.issues?.[0].code, "NOT_ACTIONABLE")
  assert.equal(result.issues?.[0].severity, "error")
})

test("a changed applicant is stale, reject warns, shortlist is clean", () => {
  const cur = app()
  const stale = evaluateShortlistRow(row("5", "SHORTLIST", "somethingelse"), cur)
  assert.equal(stale.issues?.[0].code, "STALE_ROW")

  const reject = evaluateShortlistRow(row("5", "REJECT", cur.fingerprint), cur)
  assert.equal(reject.action, "REJECT")
  assert.equal(reject.issues?.[0].code, "REJECT_LOCKS")
  assert.equal(reject.issues?.[0].severity, "warning")
  assert.deepEqual(reject.snapshot, { fingerprint: cur.fingerprint })

  const ok = evaluateShortlistRow(row("5", "SHORTLIST", cur.fingerprint), cur)
  assert.equal(ok.action, "SHORTLIST")
  assert.deepEqual(ok.issues, [])
})

test("download -> edit in Excel -> upload -> review classifies every row", async () => {
  const people = new Map<string, ShortlistCurrent>([
    ["1", app()],
    ["2", app()],
    ["3", app()],
    ["4", app()],
    ["5", app()],
  ])
  const buf = await buildWorkbook(
    SHORTLIST_TEMPLATE,
    [...people.entries()].map(([id, cur], i) => ({
      key: id,
      state: cur.fingerprint,
      values: { candidate: `Person ${id}`, email: `p${id}@x.com`, phone: "03001234567", applied: "2026-11-01", quickTest: 50 + i, current: "Needs review", decision: null },
    })),
    scope,
    { secret: SECRET }
  )

  // the admin works in Excel: picks decisions from the dropdown (typed here), leaves one blank, repeats one person
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf as unknown as ExcelJS.Buffer)
  const sheet = wb.getWorksheet(DATA_SHEET)!
  sheet.getCell("G2").value = "Shortlist" // person 1 -> ready
  sheet.getCell("G3").value = "Reject" // person 2 -> warning
  sheet.getCell("G4").value = "shortlst" // person 3 -> typo, error with suggestion
  // person 4 left blank -> no change
  sheet.getCell("G6").value = "Shortlist" // person 5 -> but another admin flagged them Maybe after the download
  people.set("5", app({ reviewFlag: "MAYBE" }))
  const edited = Buffer.from(await wb.xlsx.writeBuffer())

  const parsed = await parseWorkbook(edited, { template: SHORTLIST_TEMPLATE, scope }, { secret: SECRET })
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return

  let loads = 0
  const handler: RowHandler<Map<string, ShortlistCurrent>> = {
    entityKey: (r) => r.key,
    decisionColumns: ["decision"],
    loadContext: async () => {
      loads += 1
      return people
    },
    evaluate: (r, ctx) => evaluateShortlistRow(r, r.key ? ctx.get(r.key) : undefined),
  }
  const { rows, summary } = await validateSheet(SHORTLIST_TEMPLATE, parsed.rows, handler)

  assert.deepEqual(rows.map((r) => r.status), ["READY", "WARNING", "ERROR", "NO_CHANGE", "ERROR"])
  assert.deepEqual(rows.map((r) => r.action), ["SHORTLIST", "REJECT", null, null, null])
  assert.match(rows[2].issues[0].message, /Did you mean "Shortlist"/)
  assert.equal(rows[4].issues.at(-1)?.code, "STALE_ROW")
  assert.deepEqual(summary, { total: 5, ready: 1, warning: 1, error: 2, noChange: 1, duplicateReview: 0, skipped: 0 })
  assert.equal(loads, 1)
})
