import ExcelJS from "exceljs"
import JSZip from "jszip"
import { DATA_SHEET, KEY_COLUMN, META_SHEET, STATE_COLUMN } from "./build-xlsx"
import { cellToPrimitive } from "./coerce"
import { checkMetaMatches, verifyMeta, type SheetMeta } from "./meta"
import { cleanText } from "./sanitize"
import { MAX_FILE_BYTES, MAX_ROWS, type FileIssue, type SheetRow, type SheetScope, type TemplateDef } from "./types"

const MAX_ZIP_ENTRIES = 200
const MAX_UNCOMPRESSED_BYTES = 60 * 1024 * 1024
const MAX_SHEET_ROWS_SCANNED = 100_000

export type ParseResult =
  | { ok: true; meta: SheetMeta; rows: SheetRow[]; ignoredColumns: string[] }
  | { ok: false; fatal: FileIssue[] }

const fail = (code: string, message: string): ParseResult => ({ ok: false, fatal: [{ code, message }] })

/**
 * Cheap checks on the zip container before any spreadsheet parser touches it: it must be a real zip, small,
 * not a decompression bomb, and free of macros, embedded objects and external links.
 */
export async function inspectXlsxContainer(buffer: Buffer): Promise<FileIssue | null> {
  if (buffer.length === 0) return { code: "EMPTY_FILE", message: "The file is empty." }
  if (buffer.length > MAX_FILE_BYTES) {
    return { code: "FILE_TOO_LARGE", message: `The file is larger than ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB.` }
  }
  // "PK\x03\x04": every .xlsx is a zip (an old .xls or a renamed .csv is not)
  if (buffer.readUInt32LE(0) !== 0x04034b50) {
    return { code: "NOT_XLSX", message: "This isn't an .xlsx file. Upload the sheet you downloaded, saved as Excel Workbook (.xlsx)." }
  }

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch {
    return { code: "CORRUPT_FILE", message: "The file is damaged and can't be opened." }
  }

  const names = Object.keys(zip.files)
  if (names.length > MAX_ZIP_ENTRIES) return { code: "ZIP_TOO_COMPLEX", message: "The file has too many parts to be a normal sheet." }

  let total = 0
  for (const name of names) {
    const lower = name.toLowerCase()
    if (lower.includes("vbaproject") || lower.endsWith(".bin")) {
      return { code: "MACROS_NOT_ALLOWED", message: "Files with macros aren't accepted. Save the sheet as a plain .xlsx." }
    }
    if (lower.startsWith("xl/externallinks/") || lower.startsWith("xl/embeddings/")) {
      return { code: "EXTERNAL_CONTENT", message: "Files with external links or embedded objects aren't accepted." }
    }
    if (zip.files[name].dir) continue
    const declared = (zip.files[name] as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize
    if (typeof declared !== "number") return { code: "CORRUPT_FILE", message: "The file is damaged and can't be opened." }
    total += declared
    if (total > MAX_UNCOMPRESSED_BYTES) return { code: "ZIP_BOMB", message: "The file expands to an unreasonable size and was rejected." }
  }
  return null
}

const headerText = (raw: unknown): string => {
  const { value } = cellToPrimitive(raw)
  return value === null || value instanceof Date ? "" : cleanText(String(value))
}

const keyText = (raw: unknown): string | null => {
  const { value } = cellToPrimitive(raw)
  if (value === null || value instanceof Date) return null
  const s = cleanText(String(value))
  return s === "" ? null : s
}

/**
 * Reads an uploaded sheet: verifies the signed meta (right screen, version, job and round), maps the header
 * row to the template's columns and returns the non-empty data rows. Cell values are NOT validated here.
 */
export async function parseWorkbook(
  buffer: Buffer,
  expected: { template: TemplateDef; scope: SheetScope },
  opts: { secret?: string } = {}
): Promise<ParseResult> {
  const container = await inspectXlsxContainer(buffer)
  if (container) return { ok: false, fatal: [container] }

  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer)
  } catch {
    return fail("CORRUPT_FILE", "The file couldn't be read. Open it in Excel, save it as .xlsx and upload it again.")
  }

  const metaSheet = wb.getWorksheet(META_SHEET)
  const verified = metaSheet
    ? verifyMeta(keyText(metaSheet.getCell("B1").value), keyText(metaSheet.getCell("B2").value), opts.secret)
    : ({ ok: false } as const)
  if (!verified.ok) {
    return fail("NOT_OUR_SHEET", "This file wasn't downloaded from this system, or it was changed outside the sheet. Download a fresh sheet.")
  }
  const mismatch = checkMetaMatches(verified.meta, expected)
  if (mismatch) return { ok: false, fatal: [mismatch] }

  const sheet = wb.getWorksheet(DATA_SHEET)
  if (!sheet) return fail("NO_DATA_SHEET", `The "${DATA_SHEET}" sheet is missing.`)
  if (sheet.rowCount > MAX_SHEET_ROWS_SCANNED) return fail("TOO_MANY_ROWS", "The sheet is far larger than expected.")

  // header row -> column index
  const byHeader = new Map<string, number>()
  const duplicates: string[] = []
  const headerRow = sheet.getRow(1)
  for (let c = 1; c <= sheet.columnCount; c++) {
    const text = headerText(headerRow.getCell(c).value)
    if (!text) continue
    if (byHeader.has(text)) duplicates.push(text)
    else byHeader.set(text, c)
  }
  if (duplicates.length) {
    return fail("DUPLICATE_HEADERS", `These column headers appear more than once: ${[...new Set(duplicates)].join(", ")}.`)
  }

  const missing = expected.template.columns.filter((c) => !c.readOnly && !byHeader.has(c.header)).map((c) => c.header)
  if (missing.length) return fail("MISSING_COLUMNS", `These columns are missing: ${missing.join(", ")}. Don't rename or delete column headers.`)

  const known = new Set<string>([...expected.template.columns.map((c) => c.header), KEY_COLUMN, STATE_COLUMN])
  const ignoredColumns = [...byHeader.keys()].filter((h) => !known.has(h))

  const keyIdx = byHeader.get(KEY_COLUMN)
  const stateIdx = byHeader.get(STATE_COLUMN)
  const limit = expected.template.maxRows ?? MAX_ROWS
  const rows: SheetRow[] = []

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r)
    const cells: Record<string, unknown> = {}
    let hasContent = false
    for (const col of expected.template.columns) {
      const idx = byHeader.get(col.header)
      const raw = idx ? row.getCell(idx).value : null
      cells[col.key] = raw
      if (!col.readOnly && raw !== null && raw !== undefined && !(typeof raw === "string" && raw.trim() === "")) hasContent = true
    }
    const key = keyIdx ? keyText(row.getCell(keyIdx).value) : null
    const state = stateIdx ? keyText(row.getCell(stateIdx).value) : null
    // a row with only read-only context and no key/edits is blank filler
    if (!hasContent && !key) continue
    rows.push({ rowNumber: r, cells, key, state })
    if (rows.length > limit) return fail("TOO_MANY_ROWS", `The sheet has more than ${limit} rows. Split it into smaller files.`)
  }

  if (rows.length === 0) return fail("NO_ROWS", "The sheet has no data rows.")
  return { ok: true, meta: verified.meta, rows, ignoredColumns }
}
