import ExcelJS from "exceljs"
import { createMeta, serializeMeta } from "./meta"
import { sanitizeForExport } from "./sanitize"
import { MAX_ROWS, type ColumnDef, type SheetScope, type TemplateDef } from "./types"

export const DATA_SHEET = "Data"
export const META_SHEET = "_Meta"
export const LISTS_SHEET = "_Lists"
export const KEY_COLUMN = "_key"
export const STATE_COLUMN = "_state"

export interface ExportRow {
  /** natural key of the target record, written to the hidden `_key` column */
  key?: string
  /** fingerprint of the record's current state, written to the hidden `_state` column */
  state?: string
  values: Record<string, unknown>
}

const colLetter = (index: number) => {
  let n = index
  let s = ""
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function cellValue(col: ColumnDef, raw: unknown): ExcelJS.CellValue {
  if (raw === null || raw === undefined || raw === "") return null
  switch (col.type) {
    case "enum": {
      const option = col.options?.find((o) => o.value === raw)
      return option ? option.label : sanitizeForExport(String(raw))
    }
    case "boolean":
      return raw ? "Yes" : "No"
    case "integer":
    case "number":
      return typeof raw === "number" ? raw : Number(raw)
    case "date": {
      const d = raw instanceof Date ? raw : new Date(`${String(raw).slice(0, 10)}T00:00:00.000Z`)
      return Number.isNaN(d.getTime()) ? null : d
    }
    default:
      return sanitizeForExport(String(raw))
  }
}

/**
 * Builds the sheet an admin downloads: real dropdowns for enum columns, text format for phone/email, locked
 * read-only columns, a frozen header, and the signed hidden meta sheet. Dropdowns and locks are a convenience:
 * the server validates every upload again.
 */
export async function buildWorkbook(
  template: TemplateDef,
  rows: ExportRow[],
  scope: SheetScope,
  opts: { secret?: string; now?: number } = {}
): Promise<Buffer> {
  const limit = template.maxRows ?? MAX_ROWS
  if (rows.length > limit) throw new Error(`Too many rows to export (${rows.length}; limit ${limit})`)

  const wb = new ExcelJS.Workbook()
  wb.creator = "Recruitment Management System"
  wb.created = new Date((opts.now ?? Date.now() / 1000) * 1000)

  const sheet = wb.addWorksheet(DATA_SHEET, { views: [{ state: "frozen", ySplit: 1 }] })
  const lists = wb.addWorksheet(LISTS_SHEET, { state: "hidden" })
  const meta = wb.addWorksheet(META_SHEET, { state: "veryHidden" })

  const columns = template.columns
  sheet.columns = [
    ...columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? Math.max(14, c.header.length + 4) })),
    { header: KEY_COLUMN, key: KEY_COLUMN, hidden: true, width: 12 },
    { header: STATE_COLUMN, key: STATE_COLUMN, hidden: true, width: 12 },
  ]

  // enum / boolean dropdown sources live on the hidden lists sheet, one column per enum column
  const listRanges = new Map<string, string>()
  let listCol = 0
  for (const c of columns) {
    if (c.type !== "enum" || !c.options?.length) continue
    listCol += 1
    c.options.forEach((o, i) => {
      lists.getCell(i + 1, listCol).value = o.label
    })
    listRanges.set(c.key, `'${LISTS_SHEET}'!$${colLetter(listCol)}$1:$${colLetter(listCol)}${c.options.length}`)
  }

  const header = sheet.getRow(1)
  header.font = { bold: true }
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1)
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: c.readOnly ? "FFE5E7EB" : c.required ? "FFFEF3C7" : "FFEFF6FF" },
    }
    const notes = [c.required && !c.readOnly ? "Required." : "", c.readOnly ? "Read only: edits are ignored." : "", c.note ?? ""]
    if (c.type === "enum" && c.options?.length) notes.push(`Choose: ${c.options.map((o) => o.label).join(", ")}.`)
    if (c.type === "date") notes.push("Format: YYYY-MM-DD.")
    const text = notes.filter(Boolean).join(" ")
    if (text) cell.note = text
  })

  rows.forEach((row, r) => {
    const excelRow = sheet.getRow(r + 2)
    columns.forEach((c, i) => {
      const cell = excelRow.getCell(i + 1)
      cell.value = cellValue(c, row.values[c.key])
      cell.protection = { locked: !!c.readOnly }

      if (c.type === "phone" || c.type === "email" || c.type === "text") cell.numFmt = "@"
      if (c.type === "date") cell.numFmt = "yyyy-mm-dd"

      if (c.readOnly) return
      const common = { allowBlank: !c.required, showErrorMessage: true, errorStyle: "stop" as const }
      if (c.type === "enum" && listRanges.has(c.key)) {
        cell.dataValidation = {
          ...common,
          type: "list",
          formulae: [listRanges.get(c.key)!],
          errorTitle: c.header,
          error: "Pick a value from the list.",
        }
      } else if (c.type === "boolean") {
        cell.dataValidation = { ...common, type: "list", formulae: ['"Yes,No"'], errorTitle: c.header, error: "Choose Yes or No." }
      } else if ((c.type === "integer" || c.type === "number") && (c.min !== undefined || c.max !== undefined)) {
        cell.dataValidation = {
          ...common,
          type: c.type === "integer" ? "whole" : "decimal",
          operator: "between",
          formulae: [c.min ?? -1e12, c.max ?? 1e12],
          errorTitle: c.header,
          error: `Enter a number between ${c.min ?? "-∞"} and ${c.max ?? "∞"}.`,
        }
      } else if (c.type === "text" && c.maxLength) {
        cell.dataValidation = {
          ...common,
          type: "textLength",
          operator: "lessThanOrEqual",
          formulae: [c.maxLength],
          errorTitle: c.header,
          error: `At most ${c.maxLength} characters.`,
        }
      }
    })
    excelRow.getCell(columns.length + 1).value = row.key ?? null
    excelRow.getCell(columns.length + 2).value = row.state ?? null
  })

  // no password: the lock only prevents accidental edits of read-only columns
  await sheet.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatColumns: true,
    autoFilter: true,
    sort: false,
  })

  const { payload, signature } = serializeMeta(createMeta(template, scope, opts.now), opts.secret)
  meta.getCell("A1").value = "payload"
  meta.getCell("B1").value = payload
  meta.getCell("A2").value = "signature"
  meta.getCell("B2").value = signature

  return Buffer.from(await wb.xlsx.writeBuffer())
}
