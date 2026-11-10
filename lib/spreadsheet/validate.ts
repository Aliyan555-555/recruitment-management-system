import { coerceCell } from "./coerce"
import type { CellPrimitive, CoercedRow, Issue, RowStatus, SheetRow, TemplateDef, ValidatedRow } from "./types"

/** What a template decides about one row once the database facts are known. */
export interface RowDecision {
  action?: string | null
  normalized?: unknown
  issues?: Issue[]
  /** the target already has this value: nothing to apply */
  noChange?: boolean
  /** matches an existing record only loosely (phone/CNIC): the admin decides */
  duplicateReview?: boolean
  /** state of the target now, stored so commit can detect that it changed afterwards */
  snapshot?: unknown
}

export interface RowHandler<Ctx> {
  /** identity of the target record used for duplicate detection inside the file (e.g. candidate id, email) */
  entityKey(row: CoercedRow): string | null
  /**
   * Columns that carry the decision. Two rows for the same entity with equal values are a harmless repeat
   * (the second is ignored); different values are a conflict and both rows fail.
   */
  decisionColumns: string[]
  /** One batched read of everything the rows need (no per-row queries). */
  loadContext(rows: CoercedRow[]): Promise<Ctx>
  evaluate(row: CoercedRow, ctx: Ctx): RowDecision | Promise<RowDecision>
}

export interface ValidationSummary {
  total: number
  ready: number
  warning: number
  error: number
  noChange: number
  duplicateReview: number
  skipped: number
}

const hasError = (issues: Issue[]) => issues.some((i) => i.severity === "error")

export function coerceRows(template: TemplateDef, rows: SheetRow[]): CoercedRow[] {
  return rows.map((row) => {
    const values: Record<string, CellPrimitive> = {}
    const issues: Issue[] = []
    for (const col of template.columns) {
      if (col.readOnly) continue
      const result = coerceCell(col, row.cells[col.key])
      values[col.key] = result.value
      issues.push(...result.issues)
    }
    return { rowNumber: row.rowNumber, values, key: row.key, state: row.state, issues }
  })
}

/** Error issue when the record changed after the sheet was downloaded (someone else acted on it meanwhile). */
export function staleIssue(rowState: string | null, currentState: string | null): Issue | null {
  if (rowState === null || currentState === null || rowState === currentState) return null
  return {
    severity: "error",
    code: "STALE_ROW",
    message: "This record changed after you downloaded the sheet. Download a fresh sheet and redo this row.",
  }
}

const decisionSignature = (row: CoercedRow, columns: string[]) => JSON.stringify(columns.map((c) => row.values[c] ?? null))

function statusOf(issues: Issue[], decision: RowDecision | null): RowStatus {
  if (hasError(issues)) return "ERROR"
  if (decision?.duplicateReview) return "DUPLICATE_REVIEW"
  if (decision?.noChange) return "NO_CHANGE"
  return issues.some((i) => i.severity === "warning") ? "WARNING" : "READY"
}

/**
 * Validation pipeline: type checks -> duplicates inside the file -> database/business rules per row.
 * Rows are only ever classified here; nothing is written.
 */
export async function validateSheet<Ctx>(
  template: TemplateDef,
  sheetRows: SheetRow[],
  handler: RowHandler<Ctx>
): Promise<{ rows: ValidatedRow[]; summary: ValidationSummary }> {
  const rows = coerceRows(template, sheetRows)

  // 1) the same entity twice in one file
  const byEntity = new Map<string, CoercedRow[]>()
  const entityOf = new Map<number, string | null>()
  for (const row of rows) {
    const key = hasError(row.issues) ? null : handler.entityKey(row)
    entityOf.set(row.rowNumber, key)
    if (!key) continue
    byEntity.set(key, [...(byEntity.get(key) ?? []), row])
  }
  const skipped = new Set<number>()
  for (const group of byEntity.values()) {
    if (group.length < 2) continue
    const first = decisionSignature(group[0], handler.decisionColumns)
    const allSame = group.every((r) => decisionSignature(r, handler.decisionColumns) === first)
    const lines = group.map((r) => r.rowNumber).join(", ")
    if (allSame) {
      for (const dup of group.slice(1)) {
        skipped.add(dup.rowNumber)
        dup.issues.push({ severity: "warning", code: "DUPLICATE_ROW", message: `Same record and decision as row ${group[0].rowNumber}. This row is ignored.` })
      }
    } else {
      for (const row of group) {
        row.issues.push({ severity: "error", code: "CONFLICTING_ROWS", message: `The same record appears on rows ${lines} with different decisions. Keep one.` })
      }
    }
  }

  // 2) database + business rules, one batched read
  const live = rows.filter((r) => !hasError(r.issues) && !skipped.has(r.rowNumber))
  const ctx = await handler.loadContext(live)

  const validated: ValidatedRow[] = []
  for (const row of rows) {
    const entityKey = entityOf.get(row.rowNumber) ?? null
    if (skipped.has(row.rowNumber)) {
      validated.push({ ...row, status: "SKIPPED", entityKey, action: null, normalized: null, snapshot: null })
      continue
    }
    if (hasError(row.issues)) {
      validated.push({ ...row, status: "ERROR", entityKey, action: null, normalized: null, snapshot: null })
      continue
    }
    const decision = await handler.evaluate(row, ctx)
    const issues = [...row.issues, ...(decision.issues ?? [])]
    validated.push({
      ...row,
      issues,
      status: statusOf(issues, decision),
      entityKey,
      action: decision.action ?? null,
      normalized: decision.normalized ?? null,
      snapshot: decision.snapshot ?? null,
    })
  }

  return { rows: validated, summary: summarize(validated) }
}

export function summarize(rows: { status: RowStatus }[]): ValidationSummary {
  const count = (s: RowStatus) => rows.filter((r) => r.status === s).length
  return {
    total: rows.length,
    ready: count("READY"),
    warning: count("WARNING"),
    error: count("ERROR"),
    noChange: count("NO_CHANGE"),
    duplicateReview: count("DUPLICATE_REVIEW"),
    skipped: count("SKIPPED"),
  }
}
