import type { ImportRowStatus, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { buildWorkbook, type ExportRow } from "./build-xlsx"
import { cellToPrimitive } from "./coerce"
import { importActiveKey, sha256Hex } from "./dedupe"
import { parseWorkbook } from "./parse-xlsx"
import { getSheetModule, type SheetModule } from "./registry"
import type { FileIssue, Issue, SheetScope } from "./types"
import { validateSheet, type ValidationSummary } from "./validate"

/**
 * Orchestrates one import: upload -> validate (nothing written) -> review -> confirm -> apply in chunks.
 * The guards live here: same file never applied twice, one open import per screen, atomic commit start,
 * and a lease so only one chunk of a batch runs at a time.
 */

const nowSeconds = () => BigInt(Math.floor(Date.now() / 1000))
const ONE = BigInt(1)
/** at most this many rows per request, applied in sub-batches, and never longer than the time budget */
const CHUNK_SIZE = 50
const APPLY_BATCH = 10
const CHUNK_BUDGET_MS = 20_000
/** an unconfirmed import of another admin may be replaced after this long */
const OPEN_IMPORT_STALE_SECONDS = 60 * 60

export class ImportError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message)
  }
}

type RawRow = { cells: Record<string, string | number | boolean | null>; key: string | null; state: string | null }

const jsonSafe = (value: unknown): Prisma.InputJsonValue | undefined =>
  value === null || value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue)

function displayCells(cells: Record<string, unknown>): RawRow["cells"] {
  const out: RawRow["cells"] = {}
  for (const [key, raw] of Object.entries(cells)) {
    const { value } = cellToPrimitive(raw)
    out[key] = value instanceof Date ? value.toISOString().slice(0, 10) : value
  }
  return out
}

const toScope = (batch: { jobId: bigint | null; workflowStepId: bigint | null }): SheetScope => ({
  ...(batch.jobId !== null ? { jobId: batch.jobId.toString() } : {}),
  ...(batch.workflowStepId !== null ? { stepId: batch.workflowStepId.toString() } : {}),
})

const parseId = (value: string | undefined): bigint | null => (value && /^\d+$/.test(value) ? BigInt(value) : null)

export type StartResult =
  | { ok: true; batchId: string; summary: ValidationSummary; ignoredColumns: string[] }
  | { ok: false; fatal: FileIssue[] }

export async function startImport(input: {
  type: string
  scope: SheetScope
  fileName: string
  buffer: Buffer
  adminId: bigint
}): Promise<StartResult> {
  const mod = await getSheetModule(input.type)
  if (!mod) return { ok: false, fatal: [{ code: "UNKNOWN_TYPE", message: "This kind of sheet isn't supported." }] }
  const scopeProblem = await mod.checkScope(input.scope)
  if (scopeProblem) return { ok: false, fatal: [{ code: "BAD_SCOPE", message: scopeProblem }] }

  const parsed = await parseWorkbook(input.buffer, { template: mod.template, scope: input.scope })
  if (!parsed.ok) return parsed

  const jobId = parseId(input.scope.jobId)
  const stepId = parseId(input.scope.stepId)
  const fileHash = sha256Hex(input.buffer)

  // guard 1: the exact same file was already applied
  const applied = await prisma.importBatch.findFirst({
    where: { type: input.type, jobId, workflowStepId: stepId, fileHash, status: "COMPLETED" },
    orderBy: { committedAt: "desc" },
    include: { creator: { select: { firstname: true, lastname: true } } },
  })
  if (applied) {
    const when = new Date(Number(applied.committedAt ?? applied.createdAt) * 1000).toISOString().slice(0, 10)
    const who = `${applied.creator.firstname} ${applied.creator.lastname}`.trim()
    return {
      ok: false,
      fatal: [{ code: "ALREADY_APPLIED", message: `This exact file was already applied on ${when} by ${who}. Download a fresh sheet for new changes.` }],
    }
  }

  // guard 2: one open import per screen
  const activeKey = importActiveKey(input.type, input.scope.jobId, input.scope.stepId)
  const open = await prisma.importBatch.findUnique({
    where: { activeKey },
    include: { creator: { select: { firstname: true, lastname: true } } },
  })
  let supersede: bigint | null = null
  if (open) {
    const age = nowSeconds() - open.updatedAt
    if (open.status === "COMMITTING") {
      return { ok: false, fatal: [{ code: "IMPORT_IN_PROGRESS", message: "An import is being applied for this screen right now. Wait for it to finish." }] }
    }
    if (open.createdBy === input.adminId || age > OPEN_IMPORT_STALE_SECONDS) supersede = open.id
    else {
      const who = `${open.creator.firstname} ${open.creator.lastname}`.trim()
      return { ok: false, fatal: [{ code: "OPEN_IMPORT", message: `${who} has an unconfirmed import open for this screen. Ask them to confirm or cancel it first.` }] }
    }
  }

  const { rows, summary } = await validateSheet(mod.template, parsed.rows, mod.buildHandler(input.scope))
  const now = nowSeconds()

  try {
    const batchId = await prisma.$transaction(
      async (tx) => {
        if (supersede !== null) {
          await tx.importBatch.updateMany({
            where: { id: supersede, status: "VALIDATED" },
            data: { status: "CANCELLED", activeKey: null, updatedAt: now },
          })
        }
        const batch = await tx.importBatch.create({
          data: {
            type: input.type,
            jobId,
            workflowStepId: stepId,
            fileName: input.fileName.slice(0, 255),
            fileHash,
            fileSize: input.buffer.length,
            status: "VALIDATED",
            activeKey,
            totalRows: summary.total,
            readyRows: summary.ready,
            warningRows: summary.warning,
            errorRows: summary.error,
            noChangeRows: summary.noChange,
            createdBy: input.adminId,
            createdAt: now,
            updatedAt: now,
          },
          select: { id: true },
        })
        const source = parsed.rows
        const rawByRow = new Map(source.map((r) => [r.rowNumber, r]))
        for (let i = 0; i < rows.length; i += 500) {
          await tx.importRow.createMany({
            data: rows.slice(i, i + 500).map((r) => {
              const original = rawByRow.get(r.rowNumber)!
              const raw: RawRow = { cells: displayCells(original.cells), key: original.key, state: original.state }
              return {
                batchId: batch.id,
                rowNumber: r.rowNumber,
                entityKey: r.entityKey,
                status: r.status as ImportRowStatus,
                action: r.action,
                raw: raw as unknown as Prisma.InputJsonValue,
                normalized: jsonSafe(r.normalized),
                issues: jsonSafe(r.issues.filter((x) => x.severity !== "info")),
                snapshot: jsonSafe(r.snapshot),
              }
            }),
          })
        }
        return batch.id
      },
      { timeout: 60_000 }
    )
    return { ok: true, batchId: batchId.toString(), summary, ignoredColumns: parsed.ignoredColumns }
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { ok: false, fatal: [{ code: "IMPORT_IN_PROGRESS", message: "Another import was started for this screen a moment ago. Try again." }] }
    }
    throw error
  }
}

export type ReviewView = "changes" | "warnings" | "errors" | "duplicates" | "nochange" | "skipped" | "results"

const VIEW_STATUSES: Record<ReviewView, ImportRowStatus[]> = {
  changes: ["READY", "WARNING", "APPLYING", "APPLIED", "FAILED"],
  warnings: ["WARNING"],
  errors: ["ERROR"],
  duplicates: ["DUPLICATE_REVIEW"],
  nochange: ["NO_CHANGE"],
  skipped: ["SKIPPED"],
  results: ["APPLIED", "FAILED"],
}

export const isReviewView = (v: string): v is ReviewView => Object.prototype.hasOwnProperty.call(VIEW_STATUSES, v)

async function loadBatchOrThrow(id: bigint) {
  const batch = await prisma.importBatch.findUnique({
    where: { id },
    include: { creator: { select: { firstname: true, lastname: true } } },
  })
  if (!batch) throw new ImportError("NOT_FOUND", "Import not found.", 404)
  return batch
}

export async function getImport(
  id: bigint,
  opts: { view?: ReviewView; action?: string; offset?: number; limit?: number } = {}
) {
  const batch = await loadBatchOrThrow(id)
  const mod = await getSheetModule(batch.type)
  if (!mod) throw new ImportError("UNKNOWN_TYPE", "This kind of sheet isn't supported.", 400)

  const view = opts.view ?? "changes"
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500)
  const offset = Math.max(opts.offset ?? 0, 0)
  const where: Prisma.ImportRowWhereInput = {
    batchId: id,
    status: { in: VIEW_STATUSES[view] },
    ...(opts.action ? { action: opts.action } : {}),
  }

  const [rows, filteredTotal, byStatus, byAction] = await Promise.all([
    prisma.importRow.findMany({ where, orderBy: { rowNumber: "asc" }, skip: offset, take: limit }),
    prisma.importRow.count({ where }),
    prisma.importRow.groupBy({ by: ["status"], where: { batchId: id }, _count: { _all: true } }),
    prisma.importRow.groupBy({
      by: ["action"],
      where: { batchId: id, status: { in: ["READY", "WARNING", "APPLYING", "APPLIED", "FAILED", "DUPLICATE_REVIEW"] }, action: { not: null } },
      _count: { _all: true },
    }),
  ])

  const statusCounts = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]))
  const actionCounts = Object.fromEntries(byAction.map((a) => [a.action as string, a._count._all]))
  const pendingByAction = await prisma.importRow.groupBy({
    by: ["action"],
    where: { batchId: id, status: { in: ["READY", "WARNING"] }, action: { not: null } },
    _count: { _all: true },
  })
  const pending = Object.fromEntries(pendingByAction.map((a) => [a.action as string, a._count._all]))

  return {
    batch: {
      id: batch.id.toString(),
      type: batch.type,
      title: mod.template.title,
      fileName: batch.fileName,
      status: batch.status,
      createdBy: `${batch.creator.firstname} ${batch.creator.lastname}`.trim(),
      createdAt: batch.createdAt.toString(),
      committedAt: batch.committedAt?.toString() ?? null,
      totalRows: batch.totalRows,
      errorRows: batch.errorRows,
    },
    counts: { status: statusCounts, action: actionCounts },
    config: {
      actionLabels: mod.actionLabels,
      reviewColumns: mod.reviewColumns,
      confirmations: (mod.confirmations ?? []).map((c) => ({
        key: c.key,
        action: c.action,
        count: pending[c.action] ?? 0,
        message: c.message(pending[c.action] ?? 0),
      })),
    },
    view,
    filteredTotal,
    rows: rows.map((r) => {
      const raw = r.raw as unknown as RawRow
      return {
        id: r.id.toString(),
        rowNumber: r.rowNumber,
        status: r.status,
        action: r.action,
        issues: (r.issues as unknown as Issue[] | null) ?? [],
        cells: raw.cells,
        result: r.result,
      }
    }),
  }
}

/** The unfinished import of this screen (if any), so an interrupted review or commit can be resumed. */
export async function findOpenImport(type: string, scope: SheetScope) {
  const open = await prisma.importBatch.findUnique({
    where: { activeKey: importActiveKey(type, scope.jobId, scope.stepId) },
    include: { creator: { select: { firstname: true, lastname: true } } },
  })
  if (!open) return null
  return {
    id: open.id.toString(),
    status: open.status,
    fileName: open.fileName,
    createdBy: open.creator ? `${open.creator.firstname} ${open.creator.lastname}`.trim() : "",
    createdById: open.createdBy.toString(),
    createdAt: open.createdAt.toString(),
  }
}

export async function cancelImport(id: bigint) {
  const batch = await loadBatchOrThrow(id)
  if (batch.status === "CANCELLED") return
  if (batch.status !== "VALIDATED") throw new ImportError("NOT_CANCELLABLE", "This import has already started and can't be cancelled.", 409)
  const result = await prisma.importBatch.updateMany({
    where: { id, status: "VALIDATED" },
    data: { status: "CANCELLED", activeKey: null, updatedAt: nowSeconds() },
  })
  if (result.count === 0) throw new ImportError("NOT_CANCELLABLE", "This import has already started and can't be cancelled.", 409)
}

export interface CommitProgress {
  status: string
  applied: number
  failed: number
  remaining: number
  done: boolean
}

async function refreshCounts(id: bigint) {
  const groups = await prisma.importRow.groupBy({ by: ["status"], where: { batchId: id }, _count: { _all: true } })
  const c = (s: ImportRowStatus) => groups.find((g) => g.status === s)?._count._all ?? 0
  return {
    applied: c("APPLIED"),
    failed: c("FAILED"),
    remaining: c("READY") + c("WARNING") + c("APPLYING"),
    ready: c("READY"),
    warning: c("WARNING"),
    error: c("ERROR"),
    noChange: c("NO_CHANGE"),
  }
}

/**
 * Applies the next chunk of a confirmed import. Safe to call repeatedly (the browser loops until `done`) and
 * safe to call twice at once: the first call atomically moves VALIDATED -> COMMITTING, and a compare-and-swap
 * lease on `updatedAt` lets only one chunk of the batch run at a time.
 */
export async function commitImportChunk(input: {
  id: bigint
  adminId: bigint
  confirm: string[]
  strict?: boolean
}): Promise<CommitProgress> {
  const batch = await loadBatchOrThrow(input.id)
  const mod = await getSheetModule(batch.type)
  if (!mod) throw new ImportError("UNKNOWN_TYPE", "This kind of sheet isn't supported.", 400)

  if (batch.status === "COMPLETED") {
    const c = await refreshCounts(input.id)
    return { status: "COMPLETED", applied: c.applied, failed: c.failed, remaining: 0, done: true }
  }
  if (batch.status === "CANCELLED" || batch.status === "FAILED") {
    throw new ImportError("NOT_COMMITTABLE", "This import was cancelled and can't be applied.", 409)
  }

  if (batch.status === "VALIDATED") {
    if (input.strict && batch.errorRows > 0) {
      throw new ImportError("STRICT_ERRORS", `${batch.errorRows} row${batch.errorRows === 1 ? " has" : "s have"} errors. Fix them or apply the valid rows only.`)
    }
    for (const confirmation of mod.confirmations ?? []) {
      const count = await prisma.importRow.count({
        where: { batchId: input.id, action: confirmation.action, status: { in: ["READY", "WARNING"] } },
      })
      if (count > 0 && !input.confirm.includes(confirmation.key)) {
        throw new ImportError("CONFIRM_REQUIRED", confirmation.message(count), 400)
      }
    }
    // guard 3: exactly one request wins the start
    await prisma.importBatch.updateMany({
      where: { id: input.id, status: "VALIDATED" },
      data: { status: "COMMITTING", options: { confirm: input.confirm, strict: !!input.strict }, updatedAt: nowSeconds() },
    })
  }

  const fresh = await loadBatchOrThrow(input.id)
  if (fresh.status !== "COMMITTING") throw new ImportError("NOT_COMMITTABLE", "This import can't be applied right now.", 409)
  if (fresh.createdBy !== input.adminId) {
    throw new ImportError("OWNED_BY_OTHER", "This import is being applied by another admin.", 409)
  }

  // lease: only one chunk of this batch runs at a time
  const clock = nowSeconds()
  const lease = fresh.updatedAt + ONE > clock ? fresh.updatedAt + ONE : clock
  const leased = await prisma.importBatch.updateMany({
    where: { id: input.id, status: "COMMITTING", updatedAt: fresh.updatedAt },
    data: { updatedAt: lease },
  })
  if (leased.count === 0) throw new ImportError("CHUNK_RUNNING", "The previous step is still running. Try again in a moment.", 409)

  // rows left APPLYING by a crashed chunk are re-checked (idempotently) instead of being skipped or blindly redone
  await prisma.importRow.updateMany({ where: { batchId: input.id, status: "APPLYING" }, data: { status: "READY" } })

  // small sub-batches, stopped by a time budget: a request stays short even when the services are slow
  const started = Date.now()
  let processed = 0
  while (processed < CHUNK_SIZE && Date.now() - started < CHUNK_BUDGET_MS) {
    const batch = await prisma.importRow.findMany({
      where: { batchId: input.id, status: { in: ["READY", "WARNING"] } },
      orderBy: { rowNumber: "asc" },
      take: Math.min(APPLY_BATCH, CHUNK_SIZE - processed),
    })
    if (batch.length === 0) break

    await prisma.importRow.updateMany({ where: { id: { in: batch.map((r) => r.id) } }, data: { status: "APPLYING" } })
    let results
    try {
      results = await mod.applyRows(
        batch.map((r) => ({
          id: r.id,
          rowNumber: r.rowNumber,
          entityKey: r.entityKey,
          action: r.action,
          normalized: r.normalized,
          snapshot: r.snapshot,
        })),
        { adminId: input.adminId, scope: toScope(fresh) }
      )
    } catch (error) {
      console.error("Import chunk failed:", error)
      await prisma.importRow.updateMany({ where: { id: { in: batch.map((r) => r.id) } }, data: { status: "READY" } })
      throw new ImportError("APPLY_FAILED", "Something went wrong while applying. Nothing was lost; try again.", 500)
    }

    const stamp = nowSeconds()
    await prisma.$transaction(
      results.map((res) =>
        prisma.importRow.update({
          where: { id: res.id },
          data: { status: res.ok ? "APPLIED" : "FAILED", result: res.message?.slice(0, 500) ?? null, appliedAt: res.ok ? stamp : null },
        })
      )
    )
    processed += batch.length
  }

  const counts = await refreshCounts(input.id)
  const done = counts.remaining === 0
  const now = nowSeconds()
  await prisma.importBatch.update({
    where: { id: input.id },
    data: {
      readyRows: counts.ready,
      warningRows: counts.warning,
      errorRows: counts.error,
      noChangeRows: counts.noChange,
      appliedRows: counts.applied,
      failedRows: counts.failed,
      updatedAt: (lease > now ? lease : now) + ONE,
      ...(done ? { status: "COMPLETED", activeKey: null, committedAt: now } : {}),
    },
  })
  return { status: done ? "COMPLETED" : "COMMITTING", applied: counts.applied, failed: counts.failed, remaining: counts.remaining, done }
}

/** The same sheet, limited to the rows that need attention, with a Problems column; it can be fixed and re-uploaded. */
export async function buildProblemReport(id: bigint): Promise<{ buffer: Buffer; fileName: string } | null> {
  const batch = await loadBatchOrThrow(id)
  const mod: SheetModule | null = await getSheetModule(batch.type)
  if (!mod) return null

  const rows = await prisma.importRow.findMany({
    where: { batchId: id, status: { in: ["ERROR", "DUPLICATE_REVIEW", "FAILED"] } },
    orderBy: { rowNumber: "asc" },
  })
  if (rows.length === 0) return null

  const template = {
    ...mod.template,
    columns: [...mod.template.columns, { key: "_problems", header: "Problems", type: "text" as const, readOnly: true, width: 60 }],
  }
  const exportRows: ExportRow[] = rows.map((r) => {
    const raw = r.raw as unknown as RawRow
    const issues = (r.issues as unknown as Issue[] | null) ?? []
    const messages = [...issues.filter((i) => i.severity !== "info").map((i) => i.message), ...(r.result ? [r.result] : [])]
    return {
      key: raw.key ?? undefined,
      state: raw.state ?? undefined,
      values: { ...raw.cells, _problems: `Row ${r.rowNumber}: ${messages.join(" ")}` },
    }
  })
  const buffer = await buildWorkbook(template, exportRows, toScope(batch))
  return { buffer, fileName: `${batch.type.toLowerCase()}-problems-${batch.id}.xlsx` }
}

