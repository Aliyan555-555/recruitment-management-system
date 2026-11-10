import test from "node:test"
import assert from "node:assert/strict"
import ExcelJS from "exceljs"
import JSZip from "jszip"
import { buildWorkbook, DATA_SHEET, LISTS_SHEET, META_SHEET, type ExportRow } from "./build-xlsx"
import { enumOptions } from "./enums"
import { inspectXlsxContainer, parseWorkbook } from "./parse-xlsx"
import { coerceRows } from "./validate"
import type { SheetScope, TemplateDef } from "./types"

const SECRET = "unit-test-secret"
const scope: SheetScope = { jobId: "7", stepId: "21" }

const template: TemplateDef = {
  type: "TEST_SHEET",
  version: 1,
  title: "Test",
  maxRows: 10,
  columns: [
    { key: "name", header: "Candidate", type: "text", readOnly: true },
    { key: "decision", header: "Decision", type: "enum", required: true, options: enumOptions(["SHORTLIST", "REJECT", "MAYBE"]) },
    { key: "score", header: "Score", type: "integer", min: 0, max: 100 },
    { key: "phone", header: "Phone", type: "phone" },
    { key: "date", header: "Interview date", type: "date" },
    { key: "note", header: "Note", type: "text", maxLength: 200 },
  ],
}

const sampleRows: ExportRow[] = [
  { key: "app:1", state: "APPLIED", values: { name: "=HYPERLINK(\"http://evil\")", decision: "SHORTLIST", score: 80, phone: "03001234567", date: "2026-11-05", note: "-needs follow-up" } },
  { key: "app:2", state: "APPLIED", values: { name: "Sara", decision: "REJECT", score: 40 } },
]

async function reload(buf: Buffer) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf as unknown as ExcelJS.Buffer)
  return wb
}

const build = (rows = sampleRows, t = template) => buildWorkbook(t, rows, scope, { secret: SECRET })
const parse = (buf: Buffer, t = template, s = scope) => parseWorkbook(buf, { template: t, scope: s }, { secret: SECRET })

test("the built sheet has real dropdowns, hidden helper sheets and a frozen header", async () => {
  const wb = await reload(await build())
  const data = wb.getWorksheet(DATA_SHEET)!
  assert.equal(data.getCell("B2").dataValidation.type, "list")
  assert.match(String(data.getCell("B2").dataValidation.formulae?.[0]), /_Lists/)
  assert.equal(data.getCell("C2").dataValidation.type, "whole")
  assert.equal(wb.getWorksheet(LISTS_SHEET)!.state, "hidden")
  assert.equal(wb.getWorksheet(META_SHEET)!.state, "veryHidden")
  assert.equal(data.getCell("A1").value, "Candidate")
  assert.equal(data.getCell("B2").value, "Shortlist") // dropdown shows the label
  // "locked" is the Excel default, so it is only written for the editable (unlocked) cells
  assert.notEqual(data.getCell("A2").protection?.locked, false)
  assert.equal(data.getCell("B2").protection?.locked, false)
})

test("exported text that looks like a formula is neutralized in the file", async () => {
  const wb = await reload(await build())
  const data = wb.getWorksheet(DATA_SHEET)!
  assert.equal(String(data.getCell("A2").value).startsWith("'="), true)
  assert.equal(data.getCell("A2").type === ExcelJS.ValueType.Formula, false)
})

test("a downloaded sheet parses back and values survive the round trip", async () => {
  const result = await parse(await build())
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.rows.length, 2)
  assert.equal(result.rows[0].rowNumber, 2)
  assert.equal(result.rows[0].key, "app:1")
  assert.equal(result.rows[0].state, "APPLIED")

  const coerced = coerceRows(template, result.rows)
  assert.deepEqual(coerced[0].issues, [])
  assert.equal(coerced[0].values.decision, "SHORTLIST")
  assert.equal(coerced[0].values.score, 80)
  assert.equal(coerced[0].values.phone, "03001234567") // leading zero kept
  assert.equal(coerced[0].values.date, "2026-11-05")
  assert.equal(coerced[0].values.note, "-needs follow-up")
})

test("a file edited by hand outside the sheet is rejected", async () => {
  const wb = await reload(await build())
  const meta = wb.getWorksheet(META_SHEET)!
  meta.getCell("B1").value = String(meta.getCell("B1").value).replace('"7"', '"8"')
  const tampered = Buffer.from(await wb.xlsx.writeBuffer())
  const result = await parse(tampered)
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.fatal[0].code, "NOT_OUR_SHEET")
})

test("a sheet from another job or round, template or version is rejected", async () => {
  const buf = await build()
  const otherRound = await parse(buf, template, { jobId: "7", stepId: "22" })
  assert.equal(!otherRound.ok && otherRound.fatal[0].code, "WRONG_SCOPE")
  const otherJob = await parse(buf, template, { jobId: "9", stepId: "21" })
  assert.equal(!otherJob.ok && otherJob.fatal[0].code, "WRONG_SCOPE")
  const otherType = await parse(buf, { ...template, type: "OTHER" })
  assert.equal(!otherType.ok && otherType.fatal[0].code, "WRONG_TEMPLATE")
  const newer = await parse(buf, { ...template, version: 2 })
  assert.equal(!newer.ok && newer.fatal[0].code, "OLD_TEMPLATE")
})

test("a file signed with a different secret is rejected", async () => {
  const result = await parseWorkbook(await build(), { template, scope }, { secret: "someone-else" })
  assert.equal(!result.ok && result.fatal[0].code, "NOT_OUR_SHEET")
})

test("a workbook that never came from us has no meta and is rejected", async () => {
  const wb = new ExcelJS.Workbook()
  wb.addWorksheet(DATA_SHEET).addRow(["Candidate", "Decision"])
  const result = await parse(Buffer.from(await wb.xlsx.writeBuffer()))
  assert.equal(!result.ok && result.fatal[0].code, "NOT_OUR_SHEET")
})

test("container guards: not a zip, empty, macros, external links, zip bomb", async () => {
  assert.equal((await inspectXlsxContainer(Buffer.from("a,b\n1,2\n")))?.code, "NOT_XLSX")
  assert.equal((await inspectXlsxContainer(Buffer.alloc(0)))?.code, "EMPTY_FILE")
  assert.equal((await inspectXlsxContainer(Buffer.alloc(5 * 1024 * 1024 + 1)))?.code, "FILE_TOO_LARGE")

  const macro = new JSZip().file("xl/vbaProject.bin", "x").file("[Content_Types].xml", "<x/>")
  assert.equal((await inspectXlsxContainer(await macro.generateAsync({ type: "nodebuffer" })))?.code, "MACROS_NOT_ALLOWED")

  const link = new JSZip().file("xl/externalLinks/externalLink1.xml", "<x/>")
  assert.equal((await inspectXlsxContainer(await link.generateAsync({ type: "nodebuffer" })))?.code, "EXTERNAL_CONTENT")

  const bomb = new JSZip().file("xl/worksheets/sheet1.xml", Buffer.alloc(70 * 1024 * 1024))
  const bombBuf = await bomb.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
  assert.ok(bombBuf.length < 5 * 1024 * 1024, "the bomb itself must be small to be a bomb")
  assert.equal((await inspectXlsxContainer(bombBuf))?.code, "ZIP_BOMB")

  const result = await parse(bombBuf)
  assert.equal(!result.ok && result.fatal[0].code, "ZIP_BOMB")
})

test("row limit, missing columns and duplicate headers are fatal; extra columns are ignored", async () => {
  const many = Array.from({ length: 5 }, (_, i) => ({ key: `app:${i}`, values: { decision: "REJECT" } }))
  const limited = await parse(await build(many), { ...template, maxRows: 3 })
  assert.equal(!limited.ok && limited.fatal[0].code, "TOO_MANY_ROWS")

  const extraRequired: TemplateDef = { ...template, columns: [...template.columns, { key: "x", header: "Brand new", type: "text" }] }
  const missing = await parse(await build(), extraRequired)
  assert.equal(!missing.ok && missing.fatal[0].code, "MISSING_COLUMNS")
  assert.match(!missing.ok ? missing.fatal[0].message : "", /Brand new/)

  const wb = await reload(await build())
  const data = wb.getWorksheet(DATA_SHEET)!
  data.getCell("A1").value = "Decision" // now two "Decision" headers
  const dup = await parse(Buffer.from(await wb.xlsx.writeBuffer()))
  assert.equal(!dup.ok && dup.fatal[0].code, "DUPLICATE_HEADERS")

  const wb2 = await reload(await build())
  wb2.getWorksheet(DATA_SHEET)!.getCell("J1").value = "My own column"
  const extra = await parse(Buffer.from(await wb2.xlsx.writeBuffer()))
  assert.equal(extra.ok && extra.ignoredColumns.includes("My own column"), true)
})

test("blank filler rows are skipped and an empty sheet is reported", async () => {
  const wb = await reload(await build())
  const data = wb.getWorksheet(DATA_SHEET)!
  data.getCell("B5").value = null
  data.getCell("A8").value = "just context" // read-only column only, no key
  const ok = await parse(Buffer.from(await wb.xlsx.writeBuffer()))
  assert.equal(ok.ok && ok.rows.length, 2)

  const empty = await parse(await build([]))
  assert.equal(!empty.ok && empty.fatal[0].code, "NO_ROWS")
})

test("formulas typed into cells are not trusted", async () => {
  const wb = await reload(await build())
  const data = wb.getWorksheet(DATA_SHEET)!
  data.getCell("C2").value = { formula: "40+40" } as ExcelJS.CellFormulaValue // no cached result
  data.getCell("F2").value = "=HYPERLINK(\"http://evil\")"
  const result = await parse(Buffer.from(await wb.xlsx.writeBuffer()))
  assert.equal(result.ok, true)
  if (!result.ok) return
  const codes = coerceRows(template, result.rows)[0].issues.map((i) => i.code)
  assert.ok(codes.includes("FORMULA_NO_RESULT"))
  assert.ok(codes.includes("FORMULA_TEXT"))
})

test("exporting more rows than the template allows throws", async () => {
  const many = Array.from({ length: 11 }, (_, i) => ({ key: `app:${i}`, values: { decision: "REJECT" } }))
  await assert.rejects(() => build(many), /Too many rows/)
})
