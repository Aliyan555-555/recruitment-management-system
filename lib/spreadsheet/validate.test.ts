import test from "node:test"
import assert from "node:assert/strict"
import { enumOptions } from "./enums"
import { staleIssue, validateSheet, type RowHandler } from "./validate"
import type { CoercedRow, SheetRow, TemplateDef } from "./types"

const template: TemplateDef = {
  type: "T",
  version: 1,
  title: "T",
  columns: [
    { key: "name", header: "Candidate", type: "text", readOnly: true },
    { key: "decision", header: "Decision", type: "enum", required: true, options: enumOptions(["SHORTLIST", "REJECT", "MAYBE"]) },
    { key: "score", header: "Score", type: "integer", min: 0, max: 100 },
  ],
}

const row = (rowNumber: number, key: string | null, decision: unknown, extra: Partial<SheetRow> = {}): SheetRow => ({
  rowNumber,
  key,
  state: "APPLIED",
  cells: { decision, score: null },
  ...extra,
})

/** Fake database: current state per candidate. */
type Ctx = Map<string, { state: string; decision: string }>
const db: Ctx = new Map([
  ["c1", { state: "APPLIED", decision: "NONE" }],
  ["c2", { state: "APPLIED", decision: "SHORTLIST" }], // already shortlisted
  ["c3", { state: "SHORTLISTED_LATER", decision: "NONE" }], // moved on since the download
  ["c4", { state: "APPLIED", decision: "NONE" }],
])

let loadCalls = 0
const handler: RowHandler<Ctx> = {
  entityKey: (r) => r.key,
  decisionColumns: ["decision"],
  async loadContext(rows: CoercedRow[]) {
    loadCalls += 1
    return new Map(rows.flatMap((r) => (r.key && db.has(r.key) ? [[r.key, db.get(r.key)!] as const] : [])))
  },
  evaluate(r, ctx) {
    const current = r.key ? ctx.get(r.key) : undefined
    if (!current) return { issues: [{ severity: "error", code: "NOT_FOUND", message: "Candidate not found." }] }
    const stale = staleIssue(r.state, current.state)
    if (stale) return { issues: [stale] }
    if (current.decision === r.values.decision) return { noChange: true, action: String(r.values.decision) }
    const issues = r.values.decision === "REJECT" ? [{ severity: "warning" as const, code: "IRREVERSIBLE", message: "Rejection locks the pipeline." }] : []
    return { action: String(r.values.decision), issues, snapshot: current, normalized: { decision: r.values.decision } }
  },
}

test("rows are classified: ready, warning, no change, stale, unknown, invalid", async () => {
  loadCalls = 0
  const { rows, summary } = await validateSheet(
    template,
    [
      row(2, "c1", "Shortlist"), // READY
      row(3, "c4", "Reject"), // WARNING
      row(4, "c2", "Shortlist"), // NO_CHANGE
      row(5, "c3", "Shortlist"), // stale -> ERROR
      row(6, "zzz", "Shortlist"), // not found -> ERROR
      row(7, "c1x", "Shortlst"), // invalid enum -> ERROR before any DB work
    ],
    handler
  )
  assert.deepEqual(rows.map((r) => r.status), ["READY", "WARNING", "NO_CHANGE", "ERROR", "ERROR", "ERROR"])
  assert.equal(rows[3].issues.at(-1)?.code, "STALE_ROW")
  assert.equal(rows[5].issues[0].code, "INVALID_ENUM")
  assert.deepEqual(summary, { total: 6, ready: 1, warning: 1, error: 3, noChange: 1, duplicateReview: 0, skipped: 0 })
  assert.equal(loadCalls, 1, "database facts are loaded once for the whole file")
})

test("the same record twice with the same decision: later row is ignored with a warning", async () => {
  const { rows, summary } = await validateSheet(template, [row(2, "c1", "Shortlist"), row(3, "c1", "shortlist")], handler)
  assert.deepEqual(rows.map((r) => r.status), ["READY", "SKIPPED"])
  assert.equal(rows[1].issues.at(-1)?.code, "DUPLICATE_ROW")
  assert.equal(summary.skipped, 1)
})

test("the same record twice with different decisions: both rows fail", async () => {
  const { rows } = await validateSheet(template, [row(2, "c1", "Shortlist"), row(3, "c1", "Reject"), row(4, "c4", "Maybe")], handler)
  assert.deepEqual(rows.map((r) => r.status), ["ERROR", "ERROR", "READY"])
  assert.match(rows[0].issues.at(-1)!.message, /rows 2, 3/)
  assert.equal(rows[0].issues.at(-1)!.code, "CONFLICTING_ROWS")
})

test("a row with a type error is not used for duplicate detection", async () => {
  const { rows } = await validateSheet(template, [row(2, "c1", "Shortlist"), row(3, "c1", "???")], handler)
  assert.deepEqual(rows.map((r) => r.status), ["READY", "ERROR"])
})

test("a handler can send a row to duplicate review, and stale checks ignore missing state", async () => {
  const reviewing: RowHandler<null> = {
    entityKey: (r) => r.key,
    decisionColumns: ["decision"],
    loadContext: async () => null,
    evaluate: () => ({ duplicateReview: true, issues: [{ severity: "warning", code: "POSSIBLE_DUPLICATE", message: "Matches by phone." }] }),
  }
  const { rows } = await validateSheet(template, [row(2, "c1", "Shortlist")], reviewing)
  assert.equal(rows[0].status, "DUPLICATE_REVIEW")
  assert.equal(staleIssue(null, "X"), null)
  assert.equal(staleIssue("X", null), null)
  assert.equal(staleIssue("X", "X"), null)
  assert.equal(staleIssue("X", "Y")?.code, "STALE_ROW")
})
