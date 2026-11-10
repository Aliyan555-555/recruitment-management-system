import { prisma } from "@/lib/prisma"
import {
  eligibilityFromApplication,
  ShortlistIneligibleError,
  SHORTLIST_PIPELINE_SELECT,
} from "@/lib/admin/shortlist-eligibility"
import { setMaybeFlag } from "@/lib/services/applicant-review-service"
import { shortlistCandidates } from "@/lib/services/bulk-hiring-service"
import type { ExportRow } from "../build-xlsx"
import type { ApplyResult, ApplyRow, SheetModule } from "../registry"
import type { SheetScope } from "../types"
import type { RowHandler } from "../validate"
import {
  ACTION_LABELS,
  alreadyApplied,
  currentFromApplication,
  evaluateShortlistRow,
  SHORTLIST_TEMPLATE,
  type ShortlistCurrent,
  type ShortlistDecision,
} from "./shortlist-rules"

const appInclude = { pipeline: { select: { ...SHORTLIST_PIPELINE_SELECT, id: true } } } as const

async function loadCurrent(jobId: bigint, userIds: bigint[]) {
  const apps = await prisma.jobsApplied.findMany({
    where: { jobId, userId: { in: userIds } },
    include: appInclude,
  })
  return new Map(apps.map((a) => [a.userId.toString(), currentFromApplication(a)]))
}

const digitsOnly = (keys: Array<string | null>) => keys.filter((k): k is string => !!k && /^\d+$/.test(k)).map((k) => BigInt(k))

function buildHandler(scope: SheetScope): RowHandler<Map<string, ShortlistCurrent>> {
  const jobId = BigInt(scope.jobId!)
  return {
    entityKey: (row) => row.key,
    decisionColumns: ["decision"],
    loadContext: (rows) => loadCurrent(jobId, digitsOnly(rows.map((r) => r.key))),
    evaluate: (row, ctx) => evaluateShortlistRow(row, row.key ? ctx.get(row.key) : undefined),
  }
}

async function exportRows(scope: SheetScope): Promise<ExportRow[]> {
  const jobId = BigInt(scope.jobId!)
  const apps = await prisma.jobsApplied.findMany({
    where: { jobId, status: { in: ["APPLIED", "SUBMITTED"] } },
    include: {
      ...appInclude,
      user: { select: { firstname: true, lastname: true, email: true, phone1: true } },
    },
    orderBy: { appliedAt: "desc" },
  })
  const open = apps.filter((a) => eligibilityFromApplication(a).actionable)

  const attempts = open.length
    ? await prisma.quickTestAttempt.findMany({
        where: { jobId, userId: { in: open.map((a) => a.userId) }, status: { in: ["SUBMITTED", "EXPIRED"] } },
        select: { userId: true, scorePercent: true },
      })
    : []
  const quickTest = new Map(attempts.map((a) => [a.userId.toString(), a.scorePercent]))

  return open.map((app) => ({
    key: app.userId.toString(),
    state: currentFromApplication(app).fingerprint,
    values: {
      candidate: `${app.user.firstname} ${app.user.lastname}`.trim(),
      email: app.user.email,
      phone: app.user.phone1,
      applied: new Date(Number(app.appliedAt) * 1000).toISOString().slice(0, 10),
      quickTest: quickTest.get(app.userId.toString()) ?? null,
      current: app.reviewFlag === "MAYBE" ? "Maybe" : "Needs review",
      decision: null,
    },
  }))
}

type Group = { action: ShortlistDecision; rows: ApplyRow[] }

const SERVICE_BATCH = 25

async function applyGroup(jobId: bigint, adminId: bigint, action: ShortlistDecision, ids: bigint[]) {
  if (action === "SHORTLIST") return shortlistCandidates(jobId, ids, "select", adminId)
  if (action === "REJECT") return shortlistCandidates(jobId, ids, "reject", adminId)
  return setMaybeFlag(jobId, ids, action === "MAYBE", adminId)
}

async function applyRows(rows: ApplyRow[], ctx: { adminId: bigint; scope: SheetScope }): Promise<ApplyResult[]> {
  const jobId = BigInt(ctx.scope.jobId!)
  const results = new Map<string, ApplyResult>()
  const ok = (row: ApplyRow, message?: string) => results.set(row.id.toString(), { id: row.id, ok: true, message })
  const fail = (row: ApplyRow, message: string) => results.set(row.id.toString(), { id: row.id, ok: false, message })

  // re-check against the database right now: the sheet was validated minutes (or hours) ago
  const current = await loadCurrent(jobId, digitsOnly(rows.map((r) => r.entityKey)))
  const groups = new Map<ShortlistDecision, Group>()
  for (const row of rows) {
    const cur = row.entityKey ? current.get(row.entityKey) : undefined
    const action = row.action as ShortlistDecision | null
    if (!cur || !action) {
      fail(row, "The applicant could not be found.")
      continue
    }
    if (alreadyApplied(action, cur)) {
      ok(row, "Already applied")
      continue
    }
    const expected = (row.snapshot as { fingerprint?: string } | null)?.fingerprint
    if (!cur.actionable || (expected && expected !== cur.fingerprint)) {
      fail(row, "Changed since the sheet was checked. Download a fresh sheet.")
      continue
    }
    const g = groups.get(action) ?? { action, rows: [] }
    g.rows.push(row)
    groups.set(action, g)
  }

  // the services run one transaction per call: keep each call small so it stays well inside its timeout
  const calls = [...groups.values()].flatMap(({ action, rows: all }) =>
    Array.from({ length: Math.ceil(all.length / SERVICE_BATCH) }, (_, i) => ({ action, rows: all.slice(i * SERVICE_BATCH, (i + 1) * SERVICE_BATCH) }))
  )

  for (const { action, rows: groupRows } of calls) {
    try {
      await applyGroup(jobId, ctx.adminId, action, digitsOnly(groupRows.map((r) => r.entityKey)))
      groupRows.forEach((r) => ok(r))
    } catch (error) {
      if (!(error instanceof ShortlistIneligibleError)) {
        console.error("Spreadsheet apply failed:", error)
        groupRows.forEach((r) => fail(r, "Couldn't be applied. Try again."))
        continue
      }
      // someone acted on one of them in between: isolate it instead of failing the whole group
      for (const r of groupRows) {
        try {
          await applyGroup(jobId, ctx.adminId, action, digitsOnly([r.entityKey]))
          ok(r)
        } catch (inner) {
          fail(r, inner instanceof ShortlistIneligibleError ? "Changed while applying. Download a fresh sheet." : "Couldn't be applied. Try again.")
        }
      }
    }
  }

  return rows.map((r) => results.get(r.id.toString()) ?? { id: r.id, ok: false, message: "Not processed." })
}

export const shortlistModule: SheetModule = {
  template: SHORTLIST_TEMPLATE,
  actionLabels: ACTION_LABELS,
  reviewColumns: [
    { label: "Candidate", cell: "candidate" },
    { label: "Quick test %", cell: "quickTest" },
    { label: "Current", cell: "current" },
  ],
  confirmations: [
    {
      key: "rejects",
      action: "REJECT",
      message: (n) => `${n} applicant${n === 1 ? "" : "s"} will be rejected. Rejection locks their pipeline.`,
    },
  ],
  async checkScope(scope) {
    if (!scope.jobId || !/^\d+$/.test(scope.jobId)) return "Choose a job."
    const job = await prisma.job.findFirst({ where: { id: BigInt(scope.jobId), deletedAt: null }, select: { id: true } })
    return job ? null : "Job not found."
  },
  exportRows,
  buildHandler: (scope) => buildHandler(scope) as RowHandler<unknown>,
  applyRows,
}
