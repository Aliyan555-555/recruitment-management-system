"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, Bot, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { ApplicantAiRun } from "@/lib/admin/applicant-serializers"
import type { ShortlistFilters } from "@/lib/ai-shortlist/filters"

/**
 * Compact AI screening strip: run status/progress, start or re-run with the current filters,
 * and score candidates that were excluded when the run started but pass the filters now.
 */
export function AiScreeningPanel({
  jobId,
  aiRun,
  filters,
  unscoredIds,
  pendingCount,
  onChanged,
}: {
  jobId: string
  aiRun: ApplicantAiRun | null
  filters: ShortlistFilters
  unscoredIds: string[]
  pendingCount: number
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [notConfigured, setNotConfigured] = useState<string | null>(null)
  const running = aiRun?.status === "RUNNING" && !aiRun.isStale
  const filtersChanged = !!aiRun && JSON.stringify(aiRun.filters ?? {}) !== JSON.stringify(filters)

  const start = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/ai-shortlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (json.code === "AI_NOT_CONFIGURED") setNotConfigured(json.error)
        throw new Error(json.error || "Failed to start AI screening")
      }
      setNotConfigured(null)
      toast.success("AI screening started. Scores will appear as candidates are evaluated.")
      onChanged()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const scoreUnscored = async () => {
    if (!aiRun) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/ai-shortlist/${aiRun.id}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: unscoredIds }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (json.code === "AI_NOT_CONFIGURED") setNotConfigured(json.error)
        throw new Error(json.error || "Failed to start scoring")
      }
      toast.success(`AI scoring started for ${json.count} candidate(s)`)
      onChanged()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const done = aiRun ? aiRun.completedCount + aiRun.failedCount : 0
  const pct = aiRun ? Math.round((done / Math.max(1, aiRun.totalCandidates)) * 100) : 0

  const problem = notConfigured ?? (aiRun && !running && aiRun.failedCount > 0 ? aiRun.lastError : null)
  const needsSetup = !!notConfigured || /not configured|token/i.test(problem ?? "")

  return (
    <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-purple-500/30 bg-purple-500/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300">
        <Bot className="h-4 w-4" /> AI screening
      </div>

      <div className="min-w-0 flex-1 text-xs text-muted-foreground">
        {!aiRun && `Not run yet. AI scores the ${pendingCount} candidate(s) waiting for review that pass the filters.`}
        {aiRun && running && (
          <div className="flex items-center gap-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
            <span>
              Evaluating… {done}/{aiRun.totalCandidates}
            </span>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-purple-200/60 dark:bg-purple-950">
              <div className="h-full bg-purple-600 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        {aiRun && !running && (
          <span>
            Last run {new Date(Number(aiRun.startedAt) * 1000).toLocaleString()} ·{" "}
            {aiRun.isStale ? "interrupted" : aiRun.status.toLowerCase().replace(/_/g, " ")} · {aiRun.completedCount} scored
            {aiRun.failedCount > 0 ? `, ${aiRun.failedCount} failed` : ""}
            {filtersChanged && <span className="ml-1 font-medium text-amber-700 dark:text-amber-400">· filters changed since this run</span>}
          </span>
        )}
      </div>

      {!running && unscoredIds.length > 0 && (
        <Button size="sm" variant="outline" disabled={busy} onClick={scoreUnscored} className="h-8 text-xs">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Score {unscoredIds.length} unscored
        </Button>
      )}
      {!running && (
        <Button
          size="sm"
          disabled={busy}
          onClick={start}
          className="h-8 bg-purple-600 text-xs text-white hover:bg-purple-700"
        >
          {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : aiRun ? <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
          {!aiRun ? "Run AI screening" : filtersChanged ? "Re-run with current filters" : "Re-run AI screening"}
        </Button>
      )}
    </div>
    {problem && (
      <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          <p className="font-medium">AI screening could not score candidates</p>
          <p className="text-xs">{problem}</p>
        </div>
        {needsSetup && (
          <Link href="/admin/settings" className="shrink-0 rounded-md border border-current px-3 py-1 text-xs font-semibold hover:bg-rose-500/10">
            Open AI settings
          </Link>
        )}
      </div>
    )}
    </div>
  )
}
