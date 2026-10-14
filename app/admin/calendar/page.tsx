"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  UserCheck,
  Users,
  Video,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  addDaysToDateKey,
  dateKeyMinuteToUtc,
  dateKeyWeekday,
  formatInZone,
  formatTimeInZone,
  getZonedParts,
  parseDateKey,
  zonedDateKey,
  zoneLabel,
} from "@/lib/timezone"

interface Slot {
  id: string
  stepId: string
  stepName: string
  jobId: string
  jobTitle: string
  startsAt: string
  endsAt: string
  capacity: number
  bookedCount: number
  isBlocked: boolean
  mode: "REMOTE" | "ONSITE" | null
  interviewers: Array<{ id: string; name: string }>
  candidates: Array<{ id: string; name: string; status: string }>
}

interface InterviewerOption {
  id: string
  firstname: string
  lastname: string
}

type View = "month" | "week" | "day"

const HOUR_HEIGHT = 56
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

// Literal class strings so Tailwind keeps them. One colour per job.
const JOB_COLORS = [
  { event: "bg-blue-50 border-blue-500 text-blue-950 dark:bg-blue-950/60 dark:text-blue-100", dot: "bg-blue-500" },
  { event: "bg-emerald-50 border-emerald-500 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-100", dot: "bg-emerald-500" },
  { event: "bg-violet-50 border-violet-500 text-violet-950 dark:bg-violet-950/60 dark:text-violet-100", dot: "bg-violet-500" },
  { event: "bg-amber-50 border-amber-500 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100", dot: "bg-amber-500" },
  { event: "bg-rose-50 border-rose-500 text-rose-950 dark:bg-rose-950/60 dark:text-rose-100", dot: "bg-rose-500" },
  { event: "bg-cyan-50 border-cyan-500 text-cyan-950 dark:bg-cyan-950/60 dark:text-cyan-100", dot: "bg-cyan-500" },
  { event: "bg-fuchsia-50 border-fuchsia-500 text-fuchsia-950 dark:bg-fuchsia-950/60 dark:text-fuchsia-100", dot: "bg-fuchsia-500" },
  { event: "bg-lime-50 border-lime-600 text-lime-950 dark:bg-lime-950/60 dark:text-lime-100", dot: "bg-lime-600" },
]
const BLOCKED_COLOR = {
  event: "bg-muted border-muted-foreground/40 text-muted-foreground line-through decoration-muted-foreground/40",
  dot: "bg-muted-foreground/50",
}

function startOfWeek(key: string): string {
  return addDaysToDateKey(key, -((dateKeyWeekday(key) + 6) % 7))
}

function startOfMonth(key: string): string {
  return `${key.slice(0, 8)}01`
}

function addMonths(key: string, n: number): string {
  const { year, month } = parseDateKey(key)
  const d = new Date(Date.UTC(year, month - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`
}

/** Format a calendar date key (zone independent). */
function formatKey(key: string, options: Intl.DateTimeFormatOptions): string {
  return formatInZone(new Date(`${key}T12:00:00Z`), "UTC", options)
}

function minuteOfDay(iso: string, timeZone: string): number {
  const p = getZonedParts(new Date(iso), timeZone)
  return p.hour * 60 + p.minute
}

/** Side-by-side columns for overlapping events within one day. */
function layoutDay(slots: Slot[], timeZone: string) {
  const items = slots
    .map((s) => {
      const start = minuteOfDay(s.startsAt, timeZone)
      const end = Math.max(start + 15, Math.min(24 * 60, start + (Date.parse(s.endsAt) - Date.parse(s.startsAt)) / 60000))
      return { slot: s, start, end, col: 0, cols: 1 }
    })
    .sort((a, b) => a.start - b.start || b.end - a.end)

  let cluster: typeof items = []
  let clusterEnd = -1
  const flush = () => {
    const colEnds: number[] = []
    for (const it of cluster) {
      let c = colEnds.findIndex((e) => e <= it.start)
      if (c === -1) c = colEnds.length
      colEnds[c] = it.end
      it.col = c
    }
    for (const it of cluster) it.cols = colEnds.length
    cluster = []
  }
  for (const it of items) {
    if (it.start >= clusterEnd && cluster.length) flush()
    cluster.push(it)
    clusterEnd = Math.max(clusterEnd, it.end)
  }
  if (cluster.length) flush()
  return items
}

export default function AdminCalendarPage() {
  const [timeZone, setTimeZone] = useState("Asia/Karachi")
  const [view, setView] = useState<View>("week")
  const [anchor, setAnchor] = useState("")
  const [interviewerId, setInterviewerId] = useState("")
  const [interviewers, setInterviewers] = useState<InterviewerOption[]>([])
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [onlyBooked, setOnlyBooked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Slot | null>(null)
  const [now, setNow] = useState(() => new Date())

  const today = zonedDateKey(now, timeZone)

  useEffect(() => {
    setAnchor((a) => a || zonedDateKey(new Date(), timeZone))
  }, [timeZone])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetch("/api/admin/interviewers")
      .then((r) => (r.ok ? r.json() : { interviewers: [] }))
      .then((d) => setInterviewers(d.interviewers ?? []))
      .catch(() => undefined)
  }, [])

  // Visible date range (inclusive) for the current view.
  const range = useMemo(() => {
    if (!anchor) return null
    if (view === "day") return { from: anchor, to: anchor }
    if (view === "week") {
      const from = startOfWeek(anchor)
      return { from, to: addDaysToDateKey(from, 6) }
    }
    const from = startOfWeek(startOfMonth(anchor))
    return { from, to: addDaysToDateKey(from, 41) }
  }, [anchor, view])

  const load = useCallback(async () => {
    if (!range) return
    setSlots(null)
    setError(null)
    try {
      const start = dateKeyMinuteToUtc(range.from, 0, timeZone).toISOString()
      const end = dateKeyMinuteToUtc(addDaysToDateKey(range.to, 1), 0, timeZone).toISOString()
      const qs = new URLSearchParams({ startDate: start, endDate: end })
      if (interviewerId) qs.set("interviewerId", interviewerId)
      const res = await fetch(`/api/admin/calendar?${qs}`)
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to load calendar")
      const data = await res.json()
      setTimeZone(data.timeZone)
      setSlots(data.slots)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar")
    }
  }, [range, interviewerId, timeZone])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.from, range?.to, interviewerId])

  const visible = useMemo(
    () => (slots ?? []).filter((s) => !onlyBooked || s.bookedCount > 0),
    [slots, onlyBooked]
  )

  const byDay = useMemo(() => {
    const groups = new Map<string, Slot[]>()
    for (const s of visible) {
      const key = zonedDateKey(new Date(s.startsAt), timeZone)
      groups.set(key, [...(groups.get(key) ?? []), s])
    }
    return groups
  }, [visible, timeZone])

  const jobs = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of slots ?? []) if (!map.has(s.jobId)) map.set(s.jobId, s.jobTitle)
    return [...map.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))
  }, [slots])

  const colorFor = useCallback(
    (s: Slot) => {
      if (s.isBlocked) return BLOCKED_COLOR
      const idx = jobs.findIndex(([id]) => id === s.jobId)
      return JOB_COLORS[Math.max(0, idx) % JOB_COLORS.length]
    },
    [jobs]
  )

  const stats = useMemo(() => {
    const active = visible.filter((s) => !s.isBlocked)
    const booked = active.reduce((n, s) => n + s.bookedCount, 0)
    const capacity = active.reduce((n, s) => n + s.capacity, 0)
    return { slots: active.length, booked, open: Math.max(0, capacity - booked), blocked: visible.length - active.length }
  }, [visible])

  const step = (dir: 1 | -1) => {
    if (!anchor) return
    if (view === "day") setAnchor(addDaysToDateKey(anchor, dir))
    else if (view === "week") setAnchor(addDaysToDateKey(anchor, 7 * dir))
    else setAnchor(addMonths(anchor, dir))
  }

  const title = !range
    ? ""
    : view === "month"
      ? formatKey(anchor, { month: "long", year: "numeric" })
      : view === "day"
        ? formatKey(anchor, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        : range.from.slice(0, 7) === range.to.slice(0, 7)
          ? `${formatKey(range.from, { day: "numeric" })} – ${formatKey(range.to, { day: "numeric", month: "long", year: "numeric" })}`
          : `${formatKey(range.from, { day: "numeric", month: "short" })} – ${formatKey(range.to, { day: "numeric", month: "short", year: "numeric" })}`

  const openDay = (key: string) => {
    setAnchor(key)
    setView("day")
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Interview calendar</h2>
          <p className="mt-1 text-muted-foreground">All interviews across jobs. Times are in {zoneLabel(timeZone)}.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <StatPill icon={CalendarDays} label="Slots" value={stats.slots} />
          <StatPill icon={UserCheck} label="Booked" value={stats.booked} />
          <StatPill icon={Users} label="Open seats" value={stats.open} />
          {stats.blocked > 0 && <StatPill icon={Ban} label="Blocked" value={stats.blocked} />}
        </div>
      </div>

      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setAnchor(today)}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => step(-1)} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => step(1)} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h3 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h3>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={onlyBooked}
              onChange={(e) => setOnlyBooked(e.target.checked)}
            />
            Booked only
          </label>
          <select
            aria-label="Interviewer"
            value={interviewerId}
            onChange={(e) => setInterviewerId(e.target.value)}
            className="h-9 w-48 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">All interviewers</option>
            {interviewers.map((i) => (
              <option key={i.id} value={i.id}>
                {i.firstname} {i.lastname}
              </option>
            ))}
          </select>
          <div className="inline-flex rounded-md border bg-muted p-0.5" role="tablist">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {jobs.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-2 text-xs text-muted-foreground">
            {jobs.map(([id, name], i) => (
              <span key={id} className="flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-full", JOB_COLORS[i % JOB_COLORS.length].dot)} />
                {name}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-dashed border-muted-foreground" />
              No bookings yet
            </span>
          </div>
        )}

        <CardContent className="relative p-0">
          {error ? (
            <p className="p-8 text-center text-sm text-destructive">{error}</p>
          ) : !range ? null : view === "month" ? (
            <MonthView
              from={range.from}
              anchor={anchor}
              today={today}
              byDay={byDay}
              timeZone={timeZone}
              colorFor={colorFor}
              onSelect={setSelected}
              onOpenDay={openDay}
            />
          ) : (
            <TimeGrid
              days={Array.from({ length: view === "week" ? 7 : 1 }, (_, i) => addDaysToDateKey(range.from, i))}
              today={today}
              now={now}
              byDay={byDay}
              timeZone={timeZone}
              colorFor={colorFor}
              onSelect={setSelected}
              onOpenDay={openDay}
            />
          )}
          {slots === null && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      <SlotDialog slot={selected} timeZone={timeZone} onClose={() => setSelected(null)} />
    </div>
  )
}

function StatPill({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}

interface ViewProps {
  today: string
  byDay: Map<string, Slot[]>
  timeZone: string
  colorFor: (s: Slot) => { event: string; dot: string }
  onSelect: (s: Slot) => void
  onOpenDay: (key: string) => void
}

function MonthView({ from, anchor, today, byDay, timeZone, colorFor, onSelect, onOpenDay }: ViewProps & { from: string; anchor: string }) {
  const month = anchor.slice(0, 7)
  const cells = Array.from({ length: 42 }, (_, i) => addDaysToDateKey(from, i))
  const MAX = 3
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((key, i) => {
            const daySlots = byDay.get(key) ?? []
            const inMonth = key.slice(0, 7) === month
            return (
              <div
                key={key}
                className={cn(
                  "min-h-[118px] border-b p-1.5",
                  i % 7 !== 6 && "border-r",
                  !inMonth && "bg-muted/30"
                )}
              >
                <button
                  onClick={() => onOpenDay(key)}
                  className={cn(
                    "mb-1 flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-accent",
                    key === today ? "bg-primary font-semibold text-primary-foreground hover:bg-primary/90" : !inMonth && "text-muted-foreground"
                  )}
                >
                  {Number(key.slice(8))}
                </button>
                <div className="space-y-0.5">
                  {daySlots.slice(0, MAX).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onSelect(s)}
                      className={cn(
                        "flex w-full items-center gap-1.5 truncate rounded border-l-[3px] px-1.5 py-0.5 text-left text-xs",
                        colorFor(s).event,
                        s.bookedCount === 0 && !s.isBlocked && "border-dashed opacity-75"
                      )}
                      title={`${s.stepName} · ${s.jobTitle}`}
                    >
                      <span className="shrink-0 font-medium tabular-nums">{formatTimeInZone(new Date(s.startsAt), timeZone)}</span>
                      <span className="truncate">{s.stepName}</span>
                    </button>
                  ))}
                  {daySlots.length > MAX && (
                    <button onClick={() => onOpenDay(key)} className="px-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                      +{daySlots.length - MAX} more
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TimeGrid({ days, today, now, byDay, timeZone, colorFor, onSelect, onOpenDay }: ViewProps & { days: string[]; now: Date }) {
  // Show working hours, widened to fit any interview outside them.
  const { startHour, endHour } = useMemo(() => {
    let lo = 8
    let hi = 19
    for (const d of days)
      for (const s of byDay.get(d) ?? []) {
        lo = Math.min(lo, Math.floor(minuteOfDay(s.startsAt, timeZone) / 60))
        const endMin = minuteOfDay(s.endsAt, timeZone)
        hi = Math.max(hi, endMin === 0 ? 24 : Math.ceil(endMin / 60))
      }
    return { startHour: lo, endHour: Math.min(24, Math.max(hi, lo + 1)) }
  }, [days, byDay, timeZone])

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const height = hours.length * HOUR_HEIGHT
  const nowMin = minuteOfDay(now.toISOString(), timeZone)
  const nowTop = ((nowMin - startHour * 60) / 60) * HOUR_HEIGHT
  const isWeek = days.length > 1

  return (
    <div className="overflow-x-auto">
      <div className={cn(isWeek && "min-w-[860px]")}>
        {/* Day headers */}
        <div className="sticky top-0 z-20 grid border-b bg-card" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="border-r px-2 py-2 text-right text-[10px] uppercase text-muted-foreground">{zoneLabel(timeZone)}</div>
          {days.map((d, i) => {
            const count = (byDay.get(d) ?? []).length
            return (
              <button
                key={d}
                onClick={() => onOpenDay(d)}
                disabled={!isWeek}
                className={cn("flex items-center justify-center gap-2 py-2 enabled:hover:bg-accent/50", i < days.length - 1 && "border-r")}
              >
                <span className={cn("text-xs font-medium uppercase", d === today ? "text-primary" : "text-muted-foreground")}>
                  {formatKey(d, { weekday: "short" })}
                </span>
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold",
                    d === today && "bg-primary text-primary-foreground"
                  )}
                >
                  {Number(d.slice(8))}
                </span>
                {count > 0 && <span className="text-xs text-muted-foreground">{count}</span>}
              </button>
            )
          })}
        </div>

        {/* Grid body */}
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="relative grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))`, height }}>
            <div className="relative border-r">
              {hours.map((h, i) => (
                <div key={h} className="absolute right-2 -translate-y-1/2 text-xs tabular-nums text-muted-foreground" style={{ top: i * HOUR_HEIGHT }}>
                  {i === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
                </div>
              ))}
            </div>
            {days.map((d, di) => (
              <div key={d} className={cn("relative", di < days.length - 1 && "border-r", d === today && "bg-primary/[0.03]")}>
                {hours.map((h, i) => (
                  <div key={h} className="absolute inset-x-0 border-t border-border/60" style={{ top: i * HOUR_HEIGHT }}>
                    <div className="border-t border-dashed border-border/30" style={{ marginTop: HOUR_HEIGHT / 2 }} />
                  </div>
                ))}

                {layoutDay(byDay.get(d) ?? [], timeZone).map(({ slot: s, start, end, col, cols }) => {
                  const top = ((start - startHour * 60) / 60) * HOUR_HEIGHT
                  const h = Math.max(22, ((end - start) / 60) * HOUR_HEIGHT - 2)
                  const compact = h < 44
                  return (
                    <button
                      key={s.id}
                      onClick={() => onSelect(s)}
                      className={cn(
                        "absolute z-10 overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-xs shadow-sm transition hover:z-20 hover:shadow-md",
                        colorFor(s).event,
                        s.bookedCount === 0 && !s.isBlocked && "border-dashed opacity-80"
                      )}
                      style={{
                        top: top + 1,
                        height: h,
                        left: `calc(${(col / cols) * 100}% + 2px)`,
                        width: `calc(${100 / cols}% - 4px)`,
                      }}
                    >
                      <div className={cn("flex items-center gap-1", compact ? "truncate" : "")}>
                        <span className="truncate font-semibold">{s.stepName}</span>
                        {compact && (
                          <span className="shrink-0 tabular-nums opacity-75">{formatTimeInZone(new Date(s.startsAt), timeZone)}</span>
                        )}
                      </div>
                      {!compact && (
                        <>
                          <div className="truncate tabular-nums opacity-80">
                            {formatTimeInZone(new Date(s.startsAt), timeZone)} – {formatTimeInZone(new Date(s.endsAt), timeZone)}
                          </div>
                          <div className="truncate opacity-80">{s.jobTitle}</div>
                          {h >= 80 && s.candidates.length > 0 && (
                            <div className="mt-0.5 truncate font-medium">{s.candidates.map((c) => c.name).join(", ")}</div>
                          )}
                          <div className="absolute bottom-0.5 right-1 text-[10px] font-medium tabular-nums opacity-70">
                            {s.bookedCount}/{s.capacity}
                          </div>
                        </>
                      )}
                    </button>
                  )
                })}

                {d === today && nowTop >= 0 && nowTop <= height && (
                  <div className="pointer-events-none absolute inset-x-0 z-30" style={{ top: nowTop }}>
                    <div className="relative h-0.5 bg-red-500">
                      <div className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-red-500" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SlotDialog({ slot, timeZone, onClose }: { slot: Slot | null; timeZone: string; onClose: () => void }) {
  return (
    <Dialog open={!!slot} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {slot && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {slot.stepName}
                {slot.isBlocked && <Badge variant="destructive">Blocked</Badge>}
              </DialogTitle>
              <DialogDescription>{slot.jobTitle}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {formatInZone(new Date(slot.startsAt), timeZone, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <p className="text-muted-foreground">
                    {formatTimeInZone(new Date(slot.startsAt), timeZone)} – {formatTimeInZone(new Date(slot.endsAt), timeZone)} ({zoneLabel(timeZone)})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {slot.mode === "REMOTE" ? (
                  <Video className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                )}
                <span>{slot.mode === "REMOTE" ? "Online" : slot.mode === "ONSITE" ? "Onsite" : "Interview"}</span>
                <Badge variant={slot.bookedCount >= slot.capacity ? "default" : "secondary"} className="ml-auto">
                  {slot.bookedCount}/{slot.capacity} booked
                </Badge>
              </div>
              <div className="flex items-start gap-3">
                <UserCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Interviewers</p>
                  <p>{slot.interviewers.length ? slot.interviewers.map((i) => i.name).join(", ") : "None assigned"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Candidates</p>
                  {slot.candidates.length ? (
                    <ul className="mt-1 space-y-1">
                      {slot.candidates.map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-2">
                          <span>{c.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {c.status.replace("_", " ").toLowerCase()}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">No bookings yet</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button asChild size="sm">
                <Link href={`/admin/jobs/${slot.jobId}/rounds/${slot.stepId}/schedule`}>
                  Manage round <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
