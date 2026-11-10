/**
 * Shared types of the .xlsx import/export framework.
 * A "template" describes one screen's sheet: its columns, their types and the allowed enum values.
 */

export type ColumnType = "text" | "email" | "phone" | "integer" | "number" | "date" | "enum" | "boolean"

export interface EnumOption {
  /** stored/system value, e.g. "SHORTLIST" */
  value: string
  /** what the admin sees in the dropdown, e.g. "Shortlist" */
  label: string
}

export interface ColumnDef {
  key: string
  /** exact header text in row 1 of the sheet */
  header: string
  type: ColumnType
  required?: boolean
  /** shown for context only: the cell is locked and any edit is ignored */
  readOnly?: boolean
  options?: EnumOption[]
  maxLength?: number
  min?: number
  max?: number
  width?: number
  /** shown as a note on the header cell */
  note?: string
}

export interface TemplateDef {
  type: string
  /** bump when columns change so old downloaded sheets are rejected with a clear message */
  version: number
  title: string
  columns: ColumnDef[]
  /** hard row limit for uploads (default MAX_ROWS) */
  maxRows?: number
}

export type Severity = "error" | "warning" | "info"

export interface Issue {
  severity: Severity
  code: string
  column?: string
  message: string
}

/** Where a sheet belongs; checked on upload so Round 1's sheet can never be applied to Round 2. */
export interface SheetScope {
  jobId?: string
  stepId?: string
}

export type CellPrimitive = string | number | boolean | null

/** One data row as read from the file, before validation. */
export interface SheetRow {
  /** 1-based Excel row number, so errors point at what the admin sees */
  rowNumber: number
  cells: Record<string, unknown>
  /** hidden `_key` column: natural key of the target record, written at download time */
  key: string | null
  /** hidden `_state` column: fingerprint of the record when the sheet was downloaded */
  state: string | null
}

/** A row after type coercion. */
export interface CoercedRow {
  rowNumber: number
  values: Record<string, CellPrimitive>
  key: string | null
  state: string | null
  issues: Issue[]
}

export type RowStatus = "READY" | "WARNING" | "ERROR" | "NO_CHANGE" | "DUPLICATE_REVIEW" | "SKIPPED"

export interface ValidatedRow extends CoercedRow {
  status: RowStatus
  entityKey: string | null
  action: string | null
  normalized: unknown
  snapshot: unknown
}

/** A problem with the file as a whole (nothing is imported). */
export interface FileIssue {
  code: string
  message: string
}

export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const MAX_ROWS = 5000
export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
