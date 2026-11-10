"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, CheckCircle2, Download, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type ReviewView = "changes" | "warnings" | "errors" | "duplicates" | "nochange" | "skipped" | "results"
type Issue = { severity: "error" | "warning" | "info"; code: string; message: string }
type Cell = string | number | boolean | null

interface ReviewRow {
  id: string
  rowNumber: number
  status: string
  action: string | null
  issues: Issue[]
  cells: Record<string, Cell>
  result: string | null
}

interface ImportData {
  batch: { id: string; title: string; fileName: string; status: string; createdBy: string; totalRows: number; errorRows: number }
  counts: { status: Record<string, number>; action: Record<string, number> }
  config: {
    actionLabels: Record<string, string>
    reviewColumns: { label: string; cell: string }[]
    confirmations: { key: string; action: string; count: number; message: string }[]
  }
  filteredTotal: number
  rows: ReviewRow[]
}

type Phase = "review" | "applying" | "done"

const PAGE = 100
const ACTION_TONE: Record<string, string> = {
  SHORTLIST: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  REJECT: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  MAYBE: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
}
const NEUTRAL_TONE = "bg-muted text-muted-foreground"
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function readJson(res: Response) {
  return res.json().catch(() => ({}))
}

/**
 * Full-screen review of an uploaded sheet: what will change, what is wrong, then confirm and apply.
 * Nothing has been written to the system until "Apply changes" is pressed.
 */
export function ImportWizard({
  batchId,
  onClose,
  onApplied,
}: {
  batchId: string | null
  onClose: () => void
  onApplied: () => void
}) {
  const [phase, setPhase] = useState<Phase>("review")
  const [data, setData] = useState<ImportData | null>(null)
  const [view, setView] = useState<ReviewView>("changes")
  const [action, setAction] = useState<string | null>(null)
  const [extraRows, setExtraRows] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({})
  const [strict, setStrict] = useState(false)
  const [progress, setProgress] = useState({ applied: 0, failed: 0, remaining: 0, total: 0 })
  const [applyError, setApplyError] = useState<string | null>(null)
  const appliedRef = useRef(false)

  const open = batchId !== null

  const load = useCallback(
    async (nextView: ReviewView, nextAction: string | null, offset = 0) => {
      if (!batchId) return
      setLoading(true)
      try {
        const q = new URLSearchParams({ view: nextView, offset: String(offset), limit: String(PAGE) })
        if (nextAction) q.set("action", nextAction)
        const res = await fetch(`/api/admin/imports/${batchId}?${q}`)
        const json = await readJson(res)
        if (!res.ok) throw new Error(json.error || "Couldn't load the review")
        if (offset === 0) {
          setData(json)
          setExtraRows([])
        } else {
          setExtraRows((prev) => [...prev, ...json.rows])
          setData((prev) => (prev ? { ...prev, counts: json.counts, filteredTotal: json.filteredTotal } : json))
        }
        setLoadError(null)
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Couldn't load the review")
      } finally {
        setLoading(false)
      }
    },
    [batchId]
  )

  // a new batch always starts at the review step
  useEffect(() => {
    if (!batchId) return
    setPhase("review")
    setView("changes")
    setAction(null)
    setConfirmed({})
    setStrict(false)
    setApplyError(null)
    appliedRef.current = false
    setData(null)
    load("changes", null)
  }, [batchId, load])

  const choose = (nextView: ReviewView, nextAction: string | null = null) => {
    setView(nextView)
    setAction(nextAction)
    load(nextView, nextAction)
  }

  const status = data?.counts.status ?? {}
  const pending = (status.READY ?? 0) + (status.WARNING ?? 0)
  const errors = status.ERROR ?? 0
  const needsConfirm = (data?.config.confirmations ?? []).filter((c) => c.count > 0)
  const allConfirmed = needsConfirm.every((c) => confirmed[c.key])
  const rows = useMemo(() => [...(data?.rows ?? []), ...extraRows], [data, extraRows])

  const apply = async () => {
    if (!batchId || !data) return
    setPhase("applying")
    setApplyError(null)
    const total = pending
    setProgress({ applied: 0, failed: 0, remaining: total, total })
    const confirm = needsConfirm.filter((c) => confirmed[c.key]).map((c) => c.key)
    let busyRetries = 0
    try {
      for (;;) {
        const res = await fetch(`/api/admin/imports/${batchId}/commit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm, strict }),
        })
        const json = await readJson(res)
        if (res.status === 409 && json.code === "CHUNK_RUNNING" && busyRetries < 20) {
          busyRetries += 1
          await sleep(1500)
          continue
        }
        if (!res.ok) throw new Error(json.error || "Couldn't apply the changes")
        busyRetries = 0
        setProgress({ applied: json.applied, failed: json.failed, remaining: json.remaining, total })
        if (json.done) break
      }
      appliedRef.current = true
      setView("results")
      setAction(null)
      // show the finished screen only once its numbers are in, otherwise it flashes the pre-apply data
      await load("results", null)
      setPhase("done")
      onApplied()
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "Couldn't apply the changes")
      setPhase("review")
      await load(view, action)
    }
  }

  const discard = async () => {
    if (!batchId) return
    const res = await fetch(`/api/admin/imports/${batchId}/cancel`, { method: "POST" })
    if (!res.ok) {
      toast.error((await readJson(res)).error || "Couldn't discard the import")
      return
    }
    toast("Import discarded. Nothing was changed.")
    onClose()
  }

  const downloadProblems = async () => {
    if (!batchId) return
    try {
      const res = await fetch(`/api/admin/imports/${batchId}/report`)
      if (!res.ok) {
        const json = await readJson(res)
        throw new Error(json.error || "Couldn't download problem rows")
      }
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `problems-${batchId}.xlsx`
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement("a")
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't download problem rows")
    }
  }

  const close = () => {
    if (phase === "applying") return
    if (phase === "done" && appliedRef.current) onApplied()
    onClose()
  }

  const labels = data?.config.actionLabels ?? {}
  const actionCards = Object.entries(data?.counts.action ?? {}).filter(([k]) => labels[k])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 rounded-none p-0 sm:rounded-none"
        onEscapeKeyDown={(e) => phase === "applying" && e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="border-b px-6 py-4">
          <DialogTitle className="text-lg font-semibold">
            {phase === "done" ? "Import finished" : "Review changes before applying"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm">
            {data
              ? `${data.batch.title} · ${data.batch.fileName} · ${
                  phase === "done" ? "Changes have been applied" : "Nothing has changed yet"
                }`
              : "Checking your file…"}
          </DialogDescription>
        </div>

        {loadError && !data && (
          <div className="p-6 text-sm text-red-600" role="alert">
            {loadError}
          </div>
        )}
        {!data && !loadError && (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {data && (
          <>
            {phase === "applying" && (
              <div className="border-b bg-muted/40 px-6 py-4" role="status">
                <p className="mb-2 text-sm font-medium">
                  Applying changes… {progress.applied + progress.failed} of {progress.total}
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress.total ? ((progress.applied + progress.failed) / progress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Keep this window open until it finishes.</p>
              </div>
            )}

            {phase === "done" && (
              <div className="flex flex-wrap gap-3 border-b px-6 py-4">
                <Stat tone="ok" label="Applied" value={status.APPLIED ?? 0} onClick={() => choose("results")} active={view === "results"} />
                <Stat tone={(status.FAILED ?? 0) > 0 ? "bad" : "neutral"} label="Couldn't apply" value={status.FAILED ?? 0} />
                <Stat tone="neutral" label="Unchanged" value={(status.NO_CHANGE ?? 0) + (status.SKIPPED ?? 0)} />
                <Stat tone={errors > 0 ? "bad" : "neutral"} label="Skipped (errors)" value={errors} />
              </div>
            )}

            {phase === "review" && (
              <div className="flex flex-wrap gap-3 border-b px-6 py-4">
                <Stat label="All changes" value={pending} onClick={() => choose("changes")} active={view === "changes" && !action} />
                {actionCards.map(([key, count]) => (
                  <Stat
                    key={key}
                    label={labels[key]}
                    value={count}
                    onClick={() => choose("changes", key)}
                    active={view === "changes" && action === key}
                  />
                ))}
                <Stat tone={(status.WARNING ?? 0) > 0 ? "warn" : "neutral"} label="Warnings" value={status.WARNING ?? 0} onClick={() => choose("warnings")} active={view === "warnings"} />
                <Stat tone={errors > 0 ? "bad" : "neutral"} label="Errors" value={errors} onClick={() => choose("errors")} active={view === "errors"} />
                <Stat tone="neutral" label="Unchanged" value={(status.NO_CHANGE ?? 0) + (status.SKIPPED ?? 0)} onClick={() => choose("nochange")} active={view === "nochange"} />
              </div>
            )}

            <div className={cn("min-h-0 flex-1 overflow-auto transition-opacity", loading && rows.length > 0 && "opacity-50")} aria-busy={loading}>
              {loading && rows.length === 0 ? (
                <div className="flex justify-center p-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : rows.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">
                  {view === "changes" && pending === 0
                    ? "No changes found in this file. Every row already matches the system."
                    : "Nothing to show here."}
                </p>
              ) : (
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="sticky top-0 bg-background text-left text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="px-6 py-2 font-medium">Row</th>
                      {data.config.reviewColumns.map((c) => (
                        <th key={c.cell} className="px-3 py-2 font-medium">
                          {c.label}
                        </th>
                      ))}
                      <th className="px-3 py-2 font-medium">Change</th>
                      <th className="px-3 py-2 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b align-top">
                        <td className="px-6 py-2 text-muted-foreground tabular-nums">{row.rowNumber}</td>
                        {data.config.reviewColumns.map((c) => (
                          <td key={c.cell} className="px-3 py-2">
                            {row.cells[c.cell] ?? "—"}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          {row.action ? (
                            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", ACTION_TONE[row.action] ?? NEUTRAL_TONE)}>
                              {labels[row.action] ?? row.action}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <RowNote row={row} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {data.filteredTotal > rows.length && (
                <div className="p-4 text-center">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => load(view, action, rows.length)}
                    className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
                  >
                    Show more ({data.filteredTotal - rows.length} left)
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3 border-t bg-muted/30 px-6 py-4">
              {applyError && (
                <p className="text-sm text-red-600" role="alert">
                  {applyError}
                </p>
              )}

              {phase === "review" && (
                <>
                  {needsConfirm.map((c) => (
                    <label key={c.key} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={!!confirmed[c.key]}
                        onChange={(e) => setConfirmed((prev) => ({ ...prev, [c.key]: e.target.checked }))}
                      />
                      <span>{c.message} I understand.</span>
                    </label>
                  ))}
                  {errors > 0 && (
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" checked={strict} onChange={(e) => setStrict(e.target.checked)} />
                      <span>Apply nothing if any row has an error</span>
                    </label>
                  )}
                </>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  {(errors > 0 || (status.FAILED ?? 0) > 0 || (status.DUPLICATE_REVIEW ?? 0) > 0) && phase !== "applying" && (
                    <button type="button" onClick={downloadProblems} className="inline-flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm hover:bg-accent">
                      <Download className="h-4 w-4" /> Rows with problems
                    </button>
                  )}
                  {phase === "review" && (
                    <button type="button" onClick={discard} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-accent">
                      Discard import
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {phase === "review" && (
                    <>
                      <span className="text-sm text-muted-foreground">
                        {pending} ready{errors > 0 ? `, ${errors} with errors will be skipped` : ""}
                      </span>
                      <button type="button" onClick={close} className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-accent">
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={apply}
                        disabled={pending === 0 || !allConfirmed || (strict && errors > 0)}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        Apply {pending} change{pending === 1 ? "" : "s"}
                      </button>
                    </>
                  )}
                  {phase === "done" && (
                    <button type="button" onClick={close} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                      Done
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Stat({
  label,
  value,
  tone = "neutral",
  onClick,
  active,
}: {
  label: string
  value: number
  tone?: "neutral" | "ok" | "warn" | "bad"
  onClick?: () => void
  active?: boolean
}) {
  const color =
    tone === "bad" ? "text-red-600" : tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-green-600" : "text-foreground"
  const className = cn(
    "min-w-[110px] rounded-lg border px-4 py-2 text-left",
    active ? "border-primary bg-primary/5" : "border-input",
    onClick && "cursor-pointer hover:bg-accent"
  )
  const body = (
    <>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xl font-semibold tabular-nums", color)}>{value}</span>
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className={className} aria-pressed={active}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  )
}

function RowNote({ row }: { row: ReviewRow }) {
  if (row.status === "APPLIED") {
    return (
      <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" /> {row.result || "Applied"}
      </span>
    )
  }
  if (row.status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 text-red-600">
        <XCircle className="h-4 w-4" /> {row.result || "Couldn't be applied"}
      </span>
    )
  }
  const shown = row.issues.filter((i) => i.severity !== "info")
  if (shown.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <ul className="space-y-1">
      {shown.map((issue, i) => (
        <li key={i} className={cn("flex items-start gap-1", issue.severity === "error" ? "text-red-600" : "text-amber-700 dark:text-amber-400")}>
          {issue.severity === "error" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{issue.message}</span>
        </li>
      ))}
    </ul>
  )
}
