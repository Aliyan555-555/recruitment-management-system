"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Search, Settings2, XCircle } from "lucide-react"
import { JobPipelineHeaderLoader } from "@/components/admin/useJobPipeline"
import {
  DEFAULT_QUICK_TEST_FORM,
  QuickTestConfigCard,
  toQuickTestPayload,
  validateQuickTestForm,
  type QuickTestFormValue,
} from "@/components/admin/QuickTestConfigCard"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface AttemptRow {
  id: string
  candidateId: string
  candidateName: string
  candidateEmail: string
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED"
  scorePercent: number | null
  correctCount: number | null
  questionCount: number
  timeLimitMinutes: number
  durationSeconds: number | null
  startedAt: string
  submittedAt: string | null
  applied: boolean
}

interface QuickTestData {
  job: { id: string; title: string }
  config: { enabled: boolean; questionCount: number; timeLimitMinutes: number }
  stats: {
    started: number
    completed: number
    inProgress: number
    applied: number
    averageScore: number | null
    highestScore: number | null
    lowestScore: number | null
  }
  attempts: AttemptRow[]
}

interface AttemptDetail {
  candidate: { name: string; email: string }
  attempt: {
    id: string
    status: string
    aiModel?: string | null
    scorePercent: number | null
    scoredPoints: number | null
    maxPoints: number
    questions: Array<{
      id: string
      order: number
      question: string
      options: string[]
      correctOption: string
      points: number
      selectedOption: string | null
      isCorrect: boolean
      pointsAwarded: number
    }>
  }
}

type StatusFilter = "ALL" | "COMPLETED" | "IN_PROGRESS" | "NOT_APPLIED"
type SortKey = "score" | "recent"

function formatDuration(seconds: number | null) {
  if (seconds == null) return "-"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s.toString().padStart(2, "0")}s`
}

function scoreTone(score: number) {
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 40) return "text-amber-600 dark:text-amber-400"
  return "text-red-600 dark:text-red-400"
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export default function AdminQuickTestPage() {
  const params = useParams()
  const jobId = params.id as string

  const [data, setData] = useState<QuickTestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [sortKey, setSortKey] = useState<SortKey>("score")
  const [sortDesc, setSortDesc] = useState(true)

  const [detail, setDetail] = useState<AttemptDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsForm, setSettingsForm] = useState<QuickTestFormValue>(DEFAULT_QUICK_TEST_FORM)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [headerRefresh, setHeaderRefresh] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/quick-test`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load quick test results")
      setData(json)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load quick test results")
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    load()
  }, [load])

  const openDetail = async (attemptId: string) => {
    setDetailOpen(true)
    setDetail(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/quick-test/attempts/${attemptId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load attempt")
      setDetail(json)
    } catch (err: any) {
      toast.error(err.message || "Failed to load attempt")
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const openSettings = () => {
    if (!data) return
    setSettingsForm({
      enabled: data.config.enabled,
      questionCount: data.config.questionCount,
      timeLimitMinutes: data.config.timeLimitMinutes,
    })
    setSettingsError(null)
    setSettingsOpen(true)
  }

  const saveSettings = async () => {
    const validation = validateQuickTestForm(settingsForm)
    setSettingsError(validation)
    if (validation) return

    setSavingSettings(true)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/quick-test`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toQuickTestPayload(settingsForm)),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save settings")
      toast.success("Quick test settings saved. Candidates who already started keep their original questions and time.")
      setSettingsOpen(false)
      setHeaderRefresh((n) => n + 1)
      await load()
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings")
    } finally {
      setSavingSettings(false)
    }
  }

  const rows = useMemo(() => {
    if (!data) return []
    const term = search.trim().toLowerCase()
    const filtered = data.attempts.filter((row) => {
      if (term && !`${row.candidateName} ${row.candidateEmail}`.toLowerCase().includes(term)) return false
      if (statusFilter === "COMPLETED") return row.status !== "IN_PROGRESS"
      if (statusFilter === "IN_PROGRESS") return row.status === "IN_PROGRESS"
      if (statusFilter === "NOT_APPLIED") return row.status !== "IN_PROGRESS" && !row.applied
      return true
    })
    return filtered.sort((a, b) => {
      const dir = sortDesc ? -1 : 1
      if (sortKey === "score") {
        return ((a.scorePercent ?? -1) - (b.scorePercent ?? -1)) * dir
      }
      return (Number(a.startedAt) - Number(b.startedAt)) * dir
    })
  }, [data, search, statusFilter, sortKey, sortDesc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc((prev) => !prev)
    else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) =>
    sortKey === column ? (
      sortDesc ? <ChevronDown className="inline h-3.5 w-3.5" /> : <ChevronUp className="inline h-3.5 w-3.5" />
    ) : null

  return (
    <div className="space-y-6">
      <JobPipelineHeaderLoader jobId={jobId} currentStageId="quick-test" refreshKey={headerRefresh} />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error || !data ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{error || "Something went wrong"}</p>
          <button
            onClick={() => {
              setLoading(true)
              load()
            }}
            className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground">Quick Test</h1>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    data.config.enabled
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {data.config.enabled ? "Required before applying" : "Off"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.config.questionCount} AI-generated questions · {data.config.timeLimitMinutes} min · one attempt per
                candidate · feeds AI shortlisting (15%)
              </p>
            </div>
            <button
              onClick={openSettings}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <Settings2 className="h-4 w-4" />
              Settings
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Started" value={data.stats.started} hint={`${data.stats.inProgress} in progress`} />
            <StatCard label="Completed" value={data.stats.completed} />
            <StatCard
              label="Average score"
              value={data.stats.averageScore != null ? `${data.stats.averageScore}%` : "-"}
              hint={
                data.stats.highestScore != null
                  ? `High ${data.stats.highestScore}% · Low ${data.stats.lowestScore}%`
                  : undefined
              }
            />
            <StatCard
              label="Applied"
              value={data.stats.applied}
              hint={data.stats.completed ? `${data.stats.completed - data.stats.applied} finished without applying` : undefined}
            />
          </div>

          {data.attempts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <p className="font-medium text-foreground">No one has taken the quick test yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Candidates who click Apply on this job are taken to the test first. Results will appear here as soon as
                they start.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search candidate name or email"
                    className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ALL">All attempts</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="NOT_APPLIED">Completed, not applied</option>
                </select>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full min-w-[640px]">
                  <thead className="border-b border-border bg-muted/50">
                    <tr className="text-left text-sm font-semibold text-muted-foreground">
                      <th className="px-4 py-3">Candidate</th>
                      <th className="px-4 py-3">
                        <button onClick={() => toggleSort("score")} className="font-semibold hover:text-foreground">
                          Score <SortIcon column="score" />
                        </button>
                      </th>
                      <th className="px-4 py-3">Correct</th>
                      <th className="px-4 py-3">Time taken</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">
                        <button onClick={() => toggleSort("recent")} className="font-semibold hover:text-foreground">
                          Started <SortIcon column="recent" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No attempts match your filters.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => row.status !== "IN_PROGRESS" && openDetail(row.id)}
                          className={`${row.status !== "IN_PROGRESS" ? "cursor-pointer hover:bg-muted/50" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{row.candidateName}</div>
                            <div className="text-xs text-muted-foreground">{row.candidateEmail}</div>
                          </td>
                          <td className="px-4 py-3">
                            {row.scorePercent != null ? (
                              <span className={`text-sm font-bold ${scoreTone(row.scorePercent)}`}>
                                {row.scorePercent}%
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {row.correctCount != null ? `${row.correctCount}/${row.questionCount}` : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatDuration(row.durationSeconds)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  row.status === "IN_PROGRESS"
                                    ? "bg-blue-500/10 text-blue-600"
                                    : row.status === "EXPIRED"
                                      ? "bg-amber-500/10 text-amber-600"
                                      : "bg-emerald-500/10 text-emerald-600"
                                }`}
                              >
                                {row.status === "IN_PROGRESS"
                                  ? "In progress"
                                  : row.status === "EXPIRED"
                                    ? "Timed out"
                                    : "Submitted"}
                              </span>
                              {row.status !== "IN_PROGRESS" && (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    row.applied ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {row.applied ? "Applied" : "Not applied"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {new Date(Number(row.startedAt) * 1000).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">Click a completed row to review each question and answer.</p>
            </div>
          )}
        </>
      )}

      {/* Attempt detail */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail ? detail.candidate.name : "Quick test attempt"}</DialogTitle>
            <DialogDescription>
              {detail
                ? `${detail.candidate.email} · ${detail.attempt.scorePercent ?? 0}% (${detail.attempt.scoredPoints ?? 0}/${detail.attempt.maxPoints} points)${detail.attempt.aiModel === "curated" ? " · generic fallback questions (AI was unavailable)" : ""}`
                : "Loading attempt..."}
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !detail ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {detail.attempt.questions.map((question) => (
                <div key={question.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start gap-2">
                    {question.selectedOption == null ? (
                      <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-dashed border-muted-foreground" />
                    ) : question.isCorrect ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {question.order}. {question.question}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {question.options.map((option) => {
                          const isCorrect = option === question.correctOption
                          const isSelected = option === question.selectedOption
                          return (
                            <li
                              key={option}
                              className={`rounded-md px-3 py-1.5 text-sm ${
                                isCorrect
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : isSelected
                                    ? "bg-red-500/10 text-red-700 dark:text-red-300"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {option}
                              {isCorrect && <span className="ml-2 text-xs font-semibold">Correct</span>}
                              {isSelected && !isCorrect && (
                                <span className="ml-2 text-xs font-semibold">Candidate&apos;s answer</span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                      {question.selectedOption == null && (
                        <p className="mt-2 text-xs text-muted-foreground">Not answered</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                      {question.pointsAwarded}/{question.points}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Quick test settings</DialogTitle>
            <DialogDescription>
              Changes apply to candidates who haven&apos;t started yet. In-progress and finished attempts are unaffected.
            </DialogDescription>
          </DialogHeader>
          <QuickTestConfigCard value={settingsForm} onChange={setSettingsForm} error={settingsError} />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setSettingsOpen(false)}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
              Save settings
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
