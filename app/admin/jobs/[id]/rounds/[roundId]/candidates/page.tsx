"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Bell, CalendarClock, CalendarPlus, CalendarX, Check, Loader2, MoreHorizontal, Search, SkipForward, UserX, X } from "lucide-react"
import { JobPipelineHeaderLoader } from "@/components/admin/useJobPipeline"
import { RoundSubNav } from "@/components/admin/RoundSubNav"
import { CandidateDrawer } from "@/components/admin/round/CandidateDrawer"
import { SlotPickerDialog } from "@/components/admin/round/SlotPickerDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { formatInZone, formatTimeInZone } from "@/lib/timezone"
import { INTERVIEW_STATUS_LABEL, type InterviewStatus } from "@/lib/scheduling/derived-status"
import { STATUS_FILTERS, type RoundCandidateRow, type RowAction } from "@/lib/scheduling/round-candidates"

interface RoundData {
  timeZone: string
  round: { id: string; name: string; stepType: string | null; stepOrder: number; isRequired: boolean; isInterview: boolean }
  pendingApplicants: number
  candidates: RoundCandidateRow[]
}

type Confirm =
  | { kind: "PASS" | "REJECT" | "SKIP"; rows: RoundCandidateRow[]; warning?: string | null }
  | { kind: "CANCEL"; row: RoundCandidateRow }
  | { kind: "BOOK" | "RESCHEDULE"; row: RoundCandidateRow }

const STATUS_TONE: Record<InterviewStatus, string> = {
  NOT_ADMITTED: "bg-muted text-muted-foreground",
  AWAITING_BOOKING: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  SCHEDULED: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  AWAITING_FEEDBACK: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  READY_FOR_DECISION: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  DECIDED: "bg-muted text-muted-foreground",
}

const OUTCOME_LABEL = { PASSED: "Moved on", REJECTED: "Rejected", SKIPPED: "Skipped" } as const

async function readError(res: Response, fallback: string) {
  const body = await res.json().catch(() => null)
  return body?.error || fallback
}

export default function RoundCandidatesPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const roundId = params.roundId as string

  const [data, setData] = useState<RoundData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<InterviewStatus | "ALL">("ALL")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/steps/${roundId}/candidates`)
      if (res.status === 404 || res.status === 400) return router.replace(`/admin/jobs/${jobId}`)
      if (!res.ok) throw new Error(await readError(res, "Failed to load candidates"))
      const d: RoundData = await res.json()
      if (d.round.stepType === "OFFER") return router.replace(`/admin/jobs/${jobId}/rounds/${roundId}/offers`)
      setData(d)
      setError(null)
      setSelected((s) => s.filter((id) => d.candidates.some((c) => c.candidateId === id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load candidates")
    }
  }, [jobId, roundId, router])

  useEffect(() => {
    load()
  }, [load])

  // Interview rounds need interviewers before anything can be scheduled.
  const [needsInterviewers, setNeedsInterviewers] = useState(false)
  const isInterviewRound = data?.round.isInterview
  useEffect(() => {
    if (!isInterviewRound) return
    let alive = true
    fetch(`/api/admin/steps/${roundId}/readiness`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setNeedsInterviewers(!!d?.items?.some((i: { id: string; status: string }) => i.id === "pool" && i.status === "todo")))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [roundId, isInterviewRound])

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: data?.candidates.length ?? 0 }
    for (const row of data?.candidates ?? []) c[row.status] = (c[row.status] ?? 0) + 1
    return c
  }, [data])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.candidates ?? []).filter(
      (r) => (filter === "ALL" || r.status === filter) && (!q || `${r.name} ${r.email}`.toLowerCase().includes(q))
    )
  }, [data, filter, query])

  const selectedRows = useMemo(() => visible.filter((r) => selected.includes(r.candidateId)), [visible, selected])
  const bulk = (action: RowAction) => selectedRows.filter((r) => r.actions.includes(action))

  // ------------------------------------------------------------------ actions
  const roundAction = async (action: "move_next" | "reject" | "skip_round", rows: RoundCandidateRow[]) => {
    const res = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}/candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, candidateIds: rows.map((r) => r.candidateId) }),
    })
    if (!res.ok) throw new Error(await readError(res, "Action failed"))
  }

  const remind = async (rows: RoundCandidateRow[]) => {
    try {
      const res = await fetch(`/api/admin/steps/${roundId}/remind-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: rows.map((r) => r.candidateId) }),
      })
      if (!res.ok) throw new Error(await readError(res, "Could not send reminders"))
      const d = await res.json()
      d.sent > 0 ? toast.success(`Reminder sent to ${d.sent} candidate${d.sent === 1 ? "" : "s"}`) : toast.info("Already reminded in the last 24 hours")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reminders")
    }
  }

  const noShow = async (row: RoundCandidateRow) => {
    if (!row.booking) return
    try {
      const res = await fetch(`/api/admin/bookings/${row.booking.id}/no-show`, { method: "POST" })
      if (!res.ok) throw new Error(await readError(res, "Action failed"))
      toast.success(`${row.name} marked as no-show. They can book again.`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed")
    }
  }

  const runConfirm = async (slotId?: string) => {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.kind === "PASS") {
        await roundAction("move_next", confirm.rows)
        toast.success(`${confirm.rows.length} moved to the next round`)
      } else if (confirm.kind === "REJECT") {
        await roundAction("reject", confirm.rows)
        toast.success(`${confirm.rows.length} rejected`)
      } else if (confirm.kind === "SKIP") {
        await roundAction("skip_round", confirm.rows)
        toast.success("Round skipped")
      } else if (confirm.kind === "CANCEL") {
        const res = await fetch(`/api/admin/bookings/${confirm.row.booking!.id}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason || null }),
        })
        if (!res.ok) throw new Error(await readError(res, "Could not cancel"))
        toast.success("Booking cancelled. The candidate can book again.")
      } else if (confirm.kind === "BOOK") {
        const res = await fetch(`/api/admin/steps/${roundId}/book`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: confirm.row.candidateId, slotId }),
        })
        if (!res.ok) throw new Error(await readError(res, "Could not book"))
        toast.success(`Booked for ${confirm.row.name}. They were emailed.`)
      } else if (confirm.kind === "RESCHEDULE") {
        const res = await fetch(`/api/admin/bookings/${confirm.row.booking!.id}/reschedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slotId }),
        })
        if (!res.ok) throw new Error(await readError(res, "Could not reschedule"))
        toast.success("Interview moved. Everyone was notified.")
      }
      setConfirm(null)
      setReason("")
      setSelected([])
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed")
    } finally {
      setBusy(false)
    }
  }

  // ------------------------------------------------------------------ render helpers
  const info = (r: RoundCandidateRow, tz: string) => {
    if (r.outcome) return <span className="text-muted-foreground">{OUTCOME_LABEL[r.outcome]}</span>
    if (r.status === "SCHEDULED" && r.booking) {
      const d = new Date(r.booking.startsAt)
      return (
        <span>
          {formatInZone(d, tz, { weekday: "short", day: "2-digit", month: "short" })}, {formatTimeInZone(d, tz)}
          <span className="block text-xs text-muted-foreground">{r.booking.interviewers.join(", ")}</span>
        </span>
      )
    }
    if (r.status === "AWAITING_FEEDBACK" || r.status === "READY_FOR_DECISION") {
      const s = r.scorecards
      return (
        <span>
          {s.submitted}/{Math.max(s.expected, s.submitted)} scorecards
          {s.scorePercentage !== null && ` · ${s.scorePercentage}%`}
          <span className="block text-xs">
            {s.isSplit ? (
              <span className="text-amber-600">Split decision ({s.hireVotes}-{s.noHireVotes})</span>
            ) : s.recommendation === "HIRE" ? (
              <span className="text-emerald-600">Recommended</span>
            ) : s.recommendation === "NO_HIRE" ? (
              <span className="text-rose-600">Not recommended</span>
            ) : null}
          </span>
        </span>
      )
    }
    if (r.status === "AWAITING_BOOKING") {
      return <span className="text-muted-foreground">{r.noShowCount > 0 ? `${r.noShowCount} no-show${r.noShowCount === 1 ? "" : "s"}` : "Not booked yet"}</span>
    }
    return null
  }

  const rowButtons = (r: RoundCandidateRow) => {
    const a = r.actions
    const primary: Array<{ key: string; label: string; icon: typeof Check; onClick: () => void; variant?: "default" | "outline" | "destructive" }> = []
    const more: typeof primary = []

    if (a.includes("PASS")) primary.push({ key: "pass", label: "Pass", icon: Check, onClick: () => setConfirm({ kind: "PASS", rows: [r], warning: r.passWarning }) })
    if (a.includes("BOOK_FOR_CANDIDATE")) primary.push({ key: "book", label: "Book", icon: CalendarPlus, variant: "outline", onClick: () => setConfirm({ kind: "BOOK", row: r }) })
    if (a.includes("RESCHEDULE")) primary.push({ key: "resched", label: "Reschedule", icon: CalendarClock, variant: "outline", onClick: () => setConfirm({ kind: "RESCHEDULE", row: r }) })
    if (a.includes("REJECT")) (a.includes("PASS") ? primary : more).push({ key: "reject", label: "Reject", icon: X, variant: "outline", onClick: () => setConfirm({ kind: "REJECT", rows: [r] }) })
    if (a.includes("REMIND")) more.push({ key: "remind", label: "Send booking reminder", icon: Bell, onClick: () => remind([r]) })
    if (a.includes("CANCEL_BOOKING")) more.push({ key: "cancel", label: "Cancel booking", icon: CalendarX, onClick: () => setConfirm({ kind: "CANCEL", row: r }) })
    if (a.includes("NO_SHOW")) more.push({ key: "noshow", label: "Mark no-show", icon: UserX, onClick: () => noShow(r) })
    if (a.includes("SKIP")) more.push({ key: "skip", label: "Skip this round", icon: SkipForward, onClick: () => setConfirm({ kind: "SKIP", rows: [r] }) })

    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {primary.map((b) => (
          <Button key={b.key} size="sm" variant={b.variant ?? "default"} onClick={b.onClick}>
            <b.icon className="mr-1 h-3.5 w-3.5" />
            {b.label}
          </Button>
        ))}
        {more.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {more.map((b) => (
                <DropdownMenuItem key={b.key} onSelect={b.onClick} className="cursor-pointer">
                  <b.icon className="mr-2 h-4 w-4" />
                  {b.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    )
  }

  // ------------------------------------------------------------------ page
  if (error) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={load}>
          Try again
        </Button>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const tz = data.timeZone
  const allVisibleSelectable = visible.filter((r) => r.actions.length > 0)

  return (
    <div className="space-y-6 p-6">
      <JobPipelineHeaderLoader jobId={jobId} currentStageId={roundId} />
      <RoundSubNav jobId={jobId} roundId={roundId} stepType={data.round.stepType} activeView="candidates" />

      {needsInterviewers && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>Select the interviewers for this round before candidates can book an interview.</span>
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/jobs/${jobId}/rounds/${roundId}/schedule#round-interviewers`}>Select interviewers</Link>
          </Button>
        </div>
      )}

      {data.round.stepOrder === 1 && data.pendingApplicants > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            {data.pendingApplicants} new applicant{data.pendingApplicants === 1 ? " is" : "s are"} waiting to be reviewed. Shortlisted applicants appear here.
          </span>
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/jobs/${jobId}/applicants`}>Review applicants</Link>
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
          {STATUS_FILTERS.filter((f) => data.round.isInterview || ["ALL", "AWAITING_BOOKING", "READY_FOR_DECISION", "DECIDED"].includes(f.key)).map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                filter === f.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
              )}
            >
              {data.round.isInterview || f.key !== "AWAITING_BOOKING" ? f.label : "In this round"}
              <span className="ml-1.5 opacity-80">{counts[f.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      {selectedRows.length > 0 && (
        <div className="sticky top-20 z-20 flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur">
          <span className="mr-2 text-sm font-medium">{selectedRows.length} selected</span>
          {bulk("PASS").length > 0 && (
            <Button size="sm" onClick={() => setConfirm({ kind: "PASS", rows: bulk("PASS"), warning: bulk("PASS").some((r) => r.passWarning) ? "Some selected candidates do not have all scorecards yet." : null })}>
              <Check className="mr-1 h-3.5 w-3.5" /> Pass {bulk("PASS").length}
            </Button>
          )}
          {bulk("REJECT").length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setConfirm({ kind: "REJECT", rows: bulk("REJECT") })}>
              <X className="mr-1 h-3.5 w-3.5" /> Reject {bulk("REJECT").length}
            </Button>
          )}
          {bulk("REMIND").length > 0 && (
            <Button size="sm" variant="outline" onClick={() => remind(bulk("REMIND"))}>
              <Bell className="mr-1 h-3.5 w-3.5" /> Remind {bulk("REMIND").length}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear
          </Button>
        </div>
      )}

      {visible.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {data.candidates.length === 0
              ? data.round.stepOrder === 1
                ? "No one is in this round yet. Shortlist applicants on the Applicants page."
                : "No one is in this round yet. Candidates appear here when they pass the previous round."
              : "No candidates match this filter."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            <div className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                aria-label="Select all"
                checked={allVisibleSelectable.length > 0 && allVisibleSelectable.every((r) => selected.includes(r.candidateId))}
                onChange={(e) => setSelected(e.target.checked ? allVisibleSelectable.map((r) => r.candidateId) : [])}
              />
              <span>Candidate</span>
            </div>
            {visible.map((r) => (
              <div key={r.candidateId} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-primary disabled:opacity-30"
                    aria-label={`Select ${r.name}`}
                    disabled={r.actions.length === 0}
                    checked={selected.includes(r.candidateId)}
                    onChange={(e) => setSelected((s) => (e.target.checked ? [...s, r.candidateId] : s.filter((x) => x !== r.candidateId)))}
                  />
                  <button className="min-w-0 text-left" onClick={() => setDrawerId(r.candidateId)}>
                    <p className="truncate font-medium hover:underline">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                  </button>
                </div>
                <div className="flex items-center gap-3 md:w-56">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_TONE[r.status])}>
                    {r.status === "AWAITING_BOOKING" && !data.round.isInterview ? "In this round" : INTERVIEW_STATUS_LABEL[r.status]}
                  </span>
                </div>
                <div className="text-sm md:w-56">{info(r, tz)}</div>
                <div className="md:w-80">{rowButtons(r)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <CandidateDrawer
        jobId={jobId}
        roundId={roundId}
        stepType={data.round.stepType}
        candidateId={drawerId}
        timeZone={tz}
        onClose={() => setDrawerId(null)}
      />

      {/* pass / reject / skip / cancel confirmations */}
      <Dialog
        open={!!confirm && (confirm.kind === "PASS" || confirm.kind === "REJECT" || confirm.kind === "SKIP" || confirm.kind === "CANCEL")}
        onOpenChange={(o) => !busy && !o && setConfirm(null)}
      >
        <DialogContent>
          {confirm && (confirm.kind === "PASS" || confirm.kind === "REJECT" || confirm.kind === "SKIP") && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {confirm.kind === "PASS" ? "Move to the next round?" : confirm.kind === "REJECT" ? "Reject?" : "Skip this round?"}
                </DialogTitle>
                <DialogDescription>
                  {confirm.rows.length === 1 ? confirm.rows[0].name : `${confirm.rows.length} candidates`}
                  {confirm.kind === "PASS" && " will be admitted to the next round and emailed."}
                  {confirm.kind === "REJECT" && " will be rejected and their application closed. Any upcoming interview is cancelled."}
                  {confirm.kind === "SKIP" && " will move straight to the next round."}
                </DialogDescription>
              </DialogHeader>
              {confirm.warning && <p className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">{confirm.warning}</p>}
              <DialogFooter>
                <Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>
                  Back
                </Button>
                <Button variant={confirm.kind === "REJECT" ? "destructive" : "default"} disabled={busy} onClick={() => runConfirm()}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {confirm.kind === "PASS" ? "Move on" : confirm.kind === "REJECT" ? "Reject" : "Skip round"}
                </Button>
              </DialogFooter>
            </>
          )}
          {confirm?.kind === "CANCEL" && (
            <>
              <DialogHeader>
                <DialogTitle>Cancel booking</DialogTitle>
                <DialogDescription>{confirm.row.name} will be notified and can book another slot.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="cancel-reason">Reason (shown to the candidate, optional)</Label>
                <Textarea id="cancel-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <DialogFooter>
                <Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>
                  Back
                </Button>
                <Button variant="destructive" disabled={busy} onClick={() => runConfirm()}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cancel booking
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <SlotPickerDialog
        open={confirm?.kind === "BOOK" || confirm?.kind === "RESCHEDULE"}
        roundId={roundId}
        title={confirm?.kind === "BOOK" ? "Book an interview" : "Reschedule interview"}
        description={
          confirm && (confirm.kind === "BOOK" || confirm.kind === "RESCHEDULE")
            ? `${confirm.row.name} and the interviewers will be emailed with a calendar invite.`
            : ""
        }
        confirmLabel={confirm?.kind === "BOOK" ? "Book" : "Move booking"}
        excludeSlotId={confirm?.kind === "RESCHEDULE" ? confirm.row.booking?.slotId : null}
        busy={busy}
        onClose={() => setConfirm(null)}
        onConfirm={(slotId) => runConfirm(slotId)}
      />
    </div>
  )
}
