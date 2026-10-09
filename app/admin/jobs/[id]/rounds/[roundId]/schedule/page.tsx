"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, CalendarClock, CalendarPlus, CalendarX, Loader2, Lock, Trash2, Unlock, UserX } from "lucide-react"
import { JobPipelineHeaderLoader } from "@/components/admin/useJobPipeline"
import { RoundSubNav } from "@/components/admin/RoundSubNav"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { addDaysToDateKey, formatInZone, formatTimeInZone, zonedDateKey, zoneLabel } from "@/lib/timezone"

interface SlotRow {
  id: string
  startsAt: string
  endsAt: string
  capacity: number
  bookedCount: number
  isBlocked: boolean
  mode: "REMOTE" | "ONSITE" | null
  interviewers: Array<{ id: string; name: string }>
  bookings: Array<{ id: string; status: string; candidateName: string; candidateEmail: string }>
}

interface Overview {
  counts: { awaitingBooking: number; scheduled: number; awaitingFeedback: number; readyForDecision: number }
  awaiting: Array<{ id: string; name: string; email: string }>
  freeSeats: number
  isRequired: boolean
}

type BookingAction = { kind: "cancel" | "reschedule"; bookingId: string; slotId: string; candidateName: string }

interface Preview {
  timeZone: string
  total: number
  perDay: Array<{ date: string; count: number }>
  interviewersUsed: number
  candidateCapacity: number
  warnings: string[]
  config: { durationMins: number; bufferMins: number; panelSize: number; groupSize: number; mode: string | null; poolSize: number }
}

async function readError(res: Response, fallback: string) {
  const body = await res.json().catch(() => null)
  return body?.error || fallback
}

export default function RoundSchedulePage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const roundId = params.roundId as string

  const [stepType, setStepType] = useState<string | null>(null)
  const [counts, setCounts] = useState({ pending: 0, shortlisted: 0 })
  const [timeZone, setTimeZone] = useState<string>("Asia/Karachi")
  const [slots, setSlots] = useState<SlotRow[]>([])
  const [loading, setLoading] = useState(true)

  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [busySlot, setBusySlot] = useState<string | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [action, setAction] = useState<BookingAction | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [targetSlot, setTargetSlot] = useState("")
  const [acting, setActing] = useState(false)

  useEffect(() => {
    const today = zonedDateKey(new Date(), timeZone)
    setFromDate((d) => d || addDaysToDateKey(today, 1))
    setToDate((d) => d || addDaysToDateKey(today, 14))
  }, [timeZone])

  const loadSlots = useCallback(async () => {
    const res = await fetch(`/api/admin/steps/${roundId}/slots`)
    if (!res.ok) throw new Error(await readError(res, "Failed to load slots"))
    const data = await res.json()
    setSlots(data.slots)
    setTimeZone(data.timeZone)
    const ov = await fetch(`/api/admin/steps/${roundId}/overview`)
    if (ov.ok) setOverview(await ov.json())
  }, [roundId])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const stepRes = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}`)
        if (stepRes.status === 404 || stepRes.status === 400) return router.replace("/admin/jobs")
        if (stepRes.ok) {
          const d = await stepRes.json()
          if (alive) setStepType(d.workflowStep?.stepType ?? null)
        }
        const cRes = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}/candidates?status=shortlisted`)
        if (cRes.ok) {
          const c = await cRes.json()
          if (alive && c.counts) setCounts({ pending: c.counts.pending, shortlisted: c.counts.shortlisted })
        }
        await loadSlots()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load schedule")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [jobId, roundId, router, loadSlots])

  const runPreview = async () => {
    setPreviewing(true)
    setPreview(null)
    try {
      const res = await fetch(`/api/admin/steps/${roundId}/slots/preview?fromDate=${fromDate}&toDate=${toDate}`)
      if (!res.ok) throw new Error(await readError(res, "Preview failed"))
      setPreview(await res.json())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed")
    } finally {
      setPreviewing(false)
    }
  }

  const publish = async () => {
    setPublishing(true)
    try {
      const res = await fetch(`/api/admin/steps/${roundId}/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDate, toDate }),
      })
      if (!res.ok) throw new Error(await readError(res, "Publish failed"))
      const data = await res.json()
      toast.success(`${data.created} slots published`)
      setPreview(null)
      await loadSlots()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed")
    } finally {
      setPublishing(false)
    }
  }

  const toggleBlock = async (slot: SlotRow) => {
    setBusySlot(slot.id)
    try {
      const res = await fetch(`/api/admin/slots/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: !slot.isBlocked }),
      })
      if (!res.ok) throw new Error(await readError(res, "Update failed"))
      await loadSlots()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed")
    } finally {
      setBusySlot(null)
    }
  }

  const removeSlot = async (slot: SlotRow) => {
    setBusySlot(slot.id)
    try {
      const res = await fetch(`/api/admin/slots/${slot.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await readError(res, "Delete failed"))
      await loadSlots()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setBusySlot(null)
    }
  }

  const closeAction = () => {
    setAction(null)
    setCancelReason("")
    setTargetSlot("")
  }

  const runAction = async () => {
    if (!action) return
    setActing(true)
    try {
      const body = action.kind === "cancel" ? { reason: cancelReason || null } : { slotId: targetSlot }
      const res = await fetch(`/api/admin/bookings/${action.bookingId}/${action.kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await readError(res, "Action failed"))
      toast.success(action.kind === "cancel" ? "Booking cancelled. The candidate can book again." : "Booking moved. Everyone was notified.")
      closeAction()
      await loadSlots()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed")
    } finally {
      setActing(false)
    }
  }

  const skipCandidate = async (candidateId: string, name: string) => {
    if (!window.confirm(`Skip this round for ${name}? They move straight to the next round.`)) return
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip_round", candidateIds: [candidateId] }),
      })
      if (!res.ok) throw new Error(await readError(res, "Could not skip this round"))
      toast.success(`${name} skipped this round`)
      await loadSlots()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not skip this round")
    }
  }

  const markNoShow = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/no-show`, { method: "POST" })
      if (!res.ok) throw new Error(await readError(res, "Action failed"))
      toast.success("Marked as no-show")
      await loadSlots()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed")
    }
  }

  const rescheduleOptions = useMemo(
    () =>
      slots.filter(
        (s) => action?.kind === "reschedule" && s.id !== action.slotId && !s.isBlocked && s.bookedCount < s.capacity && new Date(s.startsAt) > new Date()
      ),
    [slots, action]
  )

  const byDay = useMemo(() => {
    const groups = new Map<string, SlotRow[]>()
    for (const s of slots) {
      const key = zonedDateKey(new Date(s.startsAt), timeZone)
      groups.set(key, [...(groups.get(key) ?? []), s])
    }
    return [...groups.entries()]
  }, [slots, timeZone])

  const rangeInvalid = !fromDate || !toDate || toDate < fromDate

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <JobPipelineHeaderLoader jobId={jobId} currentStageId={roundId} />
      <RoundSubNav jobId={jobId} roundId={roundId} stepType={stepType} activeView="schedule" counts={counts} />

      {overview && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Awaiting booking", value: overview.counts.awaitingBooking, note: `${overview.freeSeats} free seats`, href: undefined as string | undefined },
            { label: "Scheduled", value: overview.counts.scheduled, note: undefined, href: undefined },
            { label: "Awaiting feedback", value: overview.counts.awaitingFeedback, note: undefined, href: undefined },
            { label: "Ready for decision", value: overview.counts.readyForDecision, note: undefined, href: `/admin/jobs/${jobId}/rounds/${roundId}/results` },
          ].map((c) => (
            <Card key={c.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold">{c.value}</p>
                {c.note && <p className="text-xs text-muted-foreground">{c.note}</p>}
                {c.href && c.value > 0 && (
                  <a href={c.href} className="text-xs text-primary underline">
                    Open results
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {overview && overview.counts.awaitingBooking > 0 && overview.freeSeats < overview.counts.awaitingBooking && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {overview.counts.awaitingBooking} candidate{overview.counts.awaitingBooking === 1 ? " is" : "s are"} waiting to book but only {overview.freeSeats} seat
          {overview.freeSeats === 1 ? " is" : "s are"} free. Publish more slots below.
        </p>
      )}

      {overview && overview.awaiting.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Waiting to book ({overview.counts.awaitingBooking})</CardTitle>
            <CardDescription>
              {overview.isRequired ? "These candidates have been shortlisted and can book once slots are open." : "This round is optional, so you can skip it for a candidate."}
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {overview.awaiting.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{c.email}</span>
                </span>
                {!overview.isRequired && (
                  <Button variant="outline" size="sm" onClick={() => skipCandidate(c.id, c.name)}>
                    Skip round
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Publish interview slots
          </CardTitle>
          <CardDescription>
            Slots are created automatically from the assigned interviewers' availability. Times are shown in {zoneLabel(timeZone)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPreview(null) }} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={toDate} min={fromDate} onChange={(e) => { setToDate(e.target.value); setPreview(null) }} />
            </div>
            <Button variant="outline" disabled={rangeInvalid || previewing} onClick={runPreview}>
              {previewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Preview
            </Button>
          </div>

          {preview && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              {preview.warnings.map((w) => (
                <p key={w} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {w}
                </p>
              ))}
              {preview.total === 0 ? (
                <p className="text-sm text-muted-foreground">No free time found in this range, so nothing would be created.</p>
              ) : (
                <>
                  <p className="text-sm">
                    <span className="text-2xl font-bold">{preview.total}</span> slots of {preview.config.durationMins} min
                    {preview.config.panelSize > 1 ? ` with ${preview.config.panelSize} interviewers each` : ""} using{" "}
                    {preview.interviewersUsed} interviewer{preview.interviewersUsed === 1 ? "" : "s"}. Room for{" "}
                    <strong>{preview.candidateCapacity}</strong> candidate{preview.candidateCapacity === 1 ? "" : "s"}
                    {counts.shortlisted > 0 ? ` (${counts.shortlisted} in this round now)` : ""}.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {preview.perDay.map((d) => (
                      <Badge key={d.date} variant="secondary">
                        {formatInZone(new Date(`${d.date}T12:00:00Z`), "UTC", { weekday: "short", day: "2-digit", month: "short" })}: {d.count}
                      </Badge>
                    ))}
                  </div>
                  <Button disabled={publishing} onClick={publish}>
                    {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Publish {preview.total} slots
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upcoming slots</h3>
        {byDay.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No slots yet. Publish slots above so candidates can book.
            </CardContent>
          </Card>
        ) : (
          byDay.map(([day, daySlots]) => (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {formatInZone(new Date(`${day}T12:00:00Z`), "UTC", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {daySlots.map((slot) => (
                  <div key={slot.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {formatTimeInZone(new Date(slot.startsAt), timeZone)} – {formatTimeInZone(new Date(slot.endsAt), timeZone)}
                        {slot.isBlocked && <Badge variant="destructive" className="ml-2">Blocked</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {slot.interviewers.map((i) => i.name).join(", ") || "No interviewer"}
                      </p>
                      {slot.bookings.map((b) => (
                        <div key={b.id} className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          <span className="font-medium">{b.candidateName}</span>
                          <span className="text-muted-foreground">{b.candidateEmail}</span>
                          {b.status === "RESERVED" && (
                            <>
                              <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setAction({ kind: "reschedule", bookingId: b.id, slotId: slot.id, candidateName: b.candidateName })}>
                                <CalendarClock className="mr-1 h-3.5 w-3.5" />
                                Reschedule
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setAction({ kind: "cancel", bookingId: b.id, slotId: slot.id, candidateName: b.candidateName })}>
                                <CalendarX className="mr-1 h-3.5 w-3.5" />
                                Cancel
                              </Button>
                              {new Date(slot.endsAt) < new Date() && (
                                <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => markNoShow(b.id)}>
                                  <UserX className="mr-1 h-3.5 w-3.5" />
                                  No-show
                                </Button>
                              )}
                            </>
                          )}
                          {b.status !== "RESERVED" && <Badge variant="outline">{b.status === "NO_SHOW" ? "No-show" : "Completed"}</Badge>}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={slot.bookedCount >= slot.capacity ? "default" : "outline"}>
                        {slot.bookedCount}/{slot.capacity} booked
                      </Badge>
                      <Button variant="ghost" size="icon" aria-label={slot.isBlocked ? "Unblock slot" : "Block slot"} disabled={busySlot === slot.id} onClick={() => toggleBlock(slot)}>
                        {slot.isBlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      </Button>
                      {slot.bookedCount === 0 && (
                        <Button variant="ghost" size="icon" aria-label="Delete slot" disabled={busySlot === slot.id} onClick={() => removeSlot(slot)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <Dialog open={!!action} onOpenChange={(o) => !acting && !o && closeAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action?.kind === "cancel" ? "Cancel booking" : "Reschedule interview"}</DialogTitle>
            <DialogDescription>
              {action?.kind === "cancel"
                ? `${action.candidateName} will be notified and can book another slot.`
                : `Choose a new time for ${action?.candidateName}. They and the interviewers are notified.`}
            </DialogDescription>
          </DialogHeader>
          {action?.kind === "cancel" ? (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (shown to the candidate, optional)</Label>
              <Textarea id="reason" rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="target">New slot</Label>
              <select
                id="target"
                value={targetSlot}
                onChange={(e) => setTargetSlot(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select a free slot…</option>
                {rescheduleOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {formatInZone(new Date(o.startsAt), timeZone, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })} ·{" "}
                    {o.interviewers.map((i) => i.name).join(", ")}
                  </option>
                ))}
              </select>
              {rescheduleOptions.length === 0 && <p className="text-xs text-muted-foreground">No free slots. Publish more slots first.</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={acting} onClick={closeAction}>
              Back
            </Button>
            <Button
              variant={action?.kind === "cancel" ? "destructive" : "default"}
              disabled={acting || (action?.kind === "reschedule" && !targetSlot)}
              onClick={runAction}
            >
              {acting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {action?.kind === "cancel" ? "Cancel booking" : "Move booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
