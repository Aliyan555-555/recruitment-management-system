import type { ExportRow } from "./build-xlsx"
import type { RowHandler } from "./validate"
import type { SheetScope, TemplateDef } from "./types"

/** A column of the review popup, read from a cell of the uploaded sheet. */
export interface ReviewColumn {
  label: string
  cell: string
}

/** Something the admin must explicitly confirm before the rows with this action are applied. */
export interface ConfirmationDef {
  key: string
  action: string
  message: (count: number) => string
}

export interface ApplyContext {
  adminId: bigint
  scope: SheetScope
}

export interface ApplyRow {
  id: bigint
  rowNumber: number
  entityKey: string | null
  action: string | null
  normalized: unknown
  snapshot: unknown
}

export interface ApplyResult {
  id: bigint
  ok: boolean
  message?: string
}

/** Everything one screen needs to take part in spreadsheet import/export. */
export interface SheetModule {
  template: TemplateDef
  /** popup labels for the template's actions, e.g. SHORTLIST -> "Shortlisted" */
  actionLabels: Record<string, string>
  reviewColumns: ReviewColumn[]
  confirmations?: ConfirmationDef[]
  /** null when the scope is valid and usable, otherwise the reason */
  checkScope(scope: SheetScope): Promise<string | null>
  exportRows(scope: SheetScope): Promise<ExportRow[]>
  buildHandler(scope: SheetScope): RowHandler<unknown>
  /**
   * Applies rows through the same services the screens use. Must be idempotent: a row whose change is already
   * in place (e.g. after a crash mid-chunk) is reported ok, never applied twice.
   */
  applyRows(rows: ApplyRow[], ctx: ApplyContext): Promise<ApplyResult[]>
}

const loaders: Record<string, () => Promise<SheetModule>> = {
  SHORTLIST: async () => (await import("./templates/shortlist")).shortlistModule,
}

export const isSheetType = (type: string): boolean => Object.prototype.hasOwnProperty.call(loaders, type)

export async function getSheetModule(type: string): Promise<SheetModule | null> {
  return isSheetType(type) ? loaders[type]() : null
}
