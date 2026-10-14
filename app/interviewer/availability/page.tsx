"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { CalendarOff, ChevronLeft, ChevronRight, Copy, Loader2, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { validateAvailability } from "@/lib/scheduling/availability-rules"
import {
  copyWeekForward,
  effectiveDay,
  mondayOf,
  normalizeWindows,
  resetDate,
  setDateWindows,
  weekDateKeys,
  type DayWindow,
} from "@/lib/scheduling/availability-calendar"
import { addDaysToDateKey, dateKeyMinuteToUtc, dateKeyWeekday, parseDateKey, zonedDateKey } from "@/lib/timezone"
import { WeekCalendar, type CalendarColumn } from "@/components/interviewer/WeekCalendar"
import { cn } from "@/lib/utils"

interface WeeklyWindow extends DayWindow {
  dayOfWeek: number
}
interface OneOffWindow extends DayWindow {
  date: string
}
interface TimeOff {
  id: string
  startsAt: string
  endsAt: string
  reason: string | null
}

// Monday first, stored as 0=Sunday .. 6=Saturday
const DAYS = [
  { dow: 1, label: "Mon" },
  { dow: 2, label: "Tue" },
  { dow: 3, label: "Wed" },
  { dow: 4, label: "Thu" },
  { dow: 5, label: "Fri" },
  { dow: 6, label: "Sat" },
  { dow: 0, label: "Sun" },
]
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const monthDay = (key: string) => {
  const { month, day } = parseDateKey(key)
  return `${MONTHS[month - 1]} ${day}`
}
const hoursLabel = (windows: DayWindow[]) => {
  const h = windows.reduce((sum, w) => sum + (w.endMinute - w.startMinute), 0) / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`
}

async function readError(res: Response, fallback: string) {
  const body = await res.json().catch(() => null)
  return body?.error || fallback
}

export default function AvailabilityPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [timeZone, setTimeZone] = useState("Asia/Karachi")
  const [weekly, setWeekly] = useState<WeeklyWindow[]>([])
  const [oneOff, setOneOff] = useState<OneOffWindow[]>([])
  const [timeOff, setTimeOff] = useState<TimeOff[]>([])
  const [dirty, setDirty] = useState(false)
  const [off, setOff] = useState({ start: "", end: "", reason: "" })
  const [addingOff, setAddingOff] = useState(false)
  const [mode, setMode] = useState<"week" | "template">("week")
  const [weekStart, setWeekStart] = useState<string | null>(null)
  const [manual, setManual] = useState<{ kind: "date" | "weekly"; fromDate: string; toDate: string; start: string; end: string; days: number[] }>({
    kind: "date",
    fromDate: "",
    toDate: "",
    start: "09:00",
    end: "17:00",
    days: [],
  })

  const apply = (data: any) => {
    setTimeZone(data.timeZone)
    setWeekly(data.weekly)
    setOneOff(data.oneOff)
    setTimeOff(data.timeOff)
    setDirty(false)
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/interviewer/availability")
      if (!res.ok) throw new Error(await readError(res, "Failed to load availability"))
      apply(await res.json())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load availability")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const today = zonedDateKey(new Date(), timeZone)
  const monday = weekStart ?? mondayOf(today)
  const problem = validateAvailability({ weekly, oneOff }, today)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/interviewer/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekly, oneOff }),
      })
      if (!res.ok) throw new Error(await readError(res, "Failed to save"))
      apply(await res.json())
      toast.success("Availability saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const addTimeOff = async () => {
    if (!off.start || !off.end) return toast.error("Choose a start and an end")
    setAddingOff(true)
    try {
      const res = await fetch("/api/interviewer/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsAt: new Date(off.start).toISOString(),
          endsAt: new Date(off.end).toISOString(),
          reason: off.reason || null,
        }),
      })
      if (!res.ok) throw new Error(await readError(res, "Failed to add time off"))
      setOff({ start: "", end: "", reason: "" })
      toast.success("Time off added")
      const fresh = await fetch("/api/interviewer/availability")
      if (fresh.ok) setTimeOff((await fresh.json()).timeOff)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add time off")
    } finally {
      setAddingOff(false)
    }
  }

  const removeTimeOff = async (id: string) => {
    const res = await fetch(`/api/interviewer/time-off/${id}`, { method: "DELETE" })
    if (!res.ok) return toast.error(await readError(res, "Failed to remove"))
    setTimeOff((t) => t.filter((x) => x.id !== id))
  }

  const mutateWeekly = (next: WeeklyWindow[]) => {
    setWeekly(next)
    setDirty(true)
  }
  const mutateOneOff = (next: OneOffWindow[]) => {
    setOneOff(next)
    setDirty(true)
  }

  const changeTemplateDay = (dow: number, windows: DayWindow[]) =>
    mutateWeekly([...weekly.filter((w) => w.dayOfWeek !== dow), ...normalizeWindows(windows).map((w) => ({ dayOfWeek: dow, ...w }))])
  const changeDate = (key: string, windows: DayWindow[]) => mutateOneOff(setDateWindows(oneOff, key, windows))
  const copyToNextWeek = () => {
    mutateOneOff(copyWeekForward(weekly, oneOff, monday))
    toast.success("Copied to next week")
    setWeekStart(addDaysToDateKey(monday, 7))
  }
  const resetWeek = () => mutateOneOff(weekDateKeys(monday).reduce((acc, day) => resetDate(acc, day), oneOff))

  const addManual = () => {
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number)
      return (h || 0) * 60 + (m || 0)
    }
    const win = { startMinute: toMin(manual.start), endMinute: toMin(manual.end) }
    if (!manual.start || !manual.end || win.endMinute - win.startMinute < 15) {
      return toast.error("End time must be at least 15 minutes after the start time")
    }

    if (manual.kind === "weekly") {
      if (manual.days.length === 0) return toast.error("Pick at least one day")
      let next = weekly
      for (const dow of manual.days) {
        const existing = next.filter((w) => w.dayOfWeek === dow)
        const rest = next.filter((w) => w.dayOfWeek !== dow)
        next = [...rest, ...normalizeWindows([...existing, win]).map((w) => ({ dayOfWeek: dow, ...w }))]
      }
      mutateWeekly(next)
      toast.success("Added to your weekly default")
      return
    }

    if (!manual.fromDate || !manual.toDate || manual.toDate < manual.fromDate) return toast.error("Choose a valid date range")
    if (manual.fromDate < today) return toast.error("Dates cannot be in the past")
    const keys: string[] = []
    for (let d = manual.fromDate; d <= manual.toDate && keys.length <= 92; d = addDaysToDateKey(d, 1)) {
      if (manual.days.length === 0 || manual.days.includes(dateKeyWeekday(d))) keys.push(d)
    }
    if (keys.length === 0) return toast.error("No matching days in that range")
    if (keys.length > 92) return toast.error("Choose a range of up to 3 months")
    let next = oneOff
    for (const key of keys) {
      next = setDateWindows(next, key, [...effectiveDay(weekly, next, key).windows, win])
    }
    mutateOneOff(next)
    setWeekStart(mondayOf(keys[0]))
    setMode("week")
    toast.success(`Added to ${keys.length} ${keys.length === 1 ? "date" : "dates"}`)
  }

  const blockedFor =(day: string): DayWindow[] => {
    const dayStart = dateKeyMinuteToUtc(day, 0, timeZone).getTime()
    const dayEnd = dateKeyMinuteToUtc(day, 24 * 60, timeZone).getTime()
    return timeOff
      .map((t) => ({ s: Date.parse(t.startsAt), e: Date.parse(t.endsAt) }))
      .filter((t) => t.s < dayEnd && t.e > dayStart)
      .map((t) => ({
        startMinute: Math.max(0, Math.round((t.s - dayStart) / 60000)),
        endMinute: Math.min(24 * 60, Math.round((t.e - dayStart) / 60000)),
      }))
  }

  const weekDays = weekDateKeys(monday).map((key) => ({ key, ...effectiveDay(weekly, oneOff, key) }))
  const weekTotal = hoursLabel(weekDays.flatMap((d) => d.windows))

  const columns: CalendarColumn[] =
    mode === "week"
      ? weekDays.map((d) => ({
          key: d.key,
          title: SHORT_DAYS[dateKeyWeekday(d.key)],
          subtitle: String(parseDateKey(d.key).day),
          windows: d.windows,
          inherited: d.source === "weekly",
          disabled: d.key < today,
          isToday: d.key === today,
          blocked: blockedFor(d.key),
          header:
            d.key < today ? null : (
              <div className="mt-1 flex h-5 items-center justify-center gap-1">
                {d.source === "off" && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Day off</span>
                )}
                {d.source === "custom" && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Custom</span>
                )}
                {d.source !== "weekly" && (
                  <button
                    type="button"
                    title="Back to weekly default"
                    aria-label="Reset day"
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                    onClick={() => mutateOneOff(resetDate(oneOff, d.key))}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
                {d.source !== "off" && (
                  <button
                    type="button"
                    title="Mark day off"
                    aria-label="Mark day off"
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                    onClick={() => changeDate(d.key, [])}
                  >
                    <CalendarOff className="h-3 w-3" />
                  </button>
                )}
              </div>
            ),
        }))
      : DAYS.map(({ dow, label }) => ({
          key: String(dow),
          title: label,
          windows: weekly
            .filter((w) => w.dayOfWeek === dow)
            .map(({ startMinute, endMinute }) => ({ startMinute, endMinute }))
            .sort((a, b) => a.startMinute - b.startMinute),
        }))

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Availability</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us when you can interview. Set a default week, then adjust any specific week. Admins turn this into bookable slots.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Your calendar</CardTitle>
              <CardDescription>
                {mode === "week"
                  ? "Drag on a day to add hours. Drag a block to move it, pull its edges to resize. Changes apply to the dates shown only."
                  : "Your default week. It repeats every week unless you customise a specific week."}
              </CardDescription>
            </div>
            <div className="inline-flex rounded-lg border bg-muted p-1 text-sm">
              {(
                [
                  ["week", "Specific week"],
                  ["template", "Weekly default"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-medium transition-colors",
                    mode === value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {mode === "week" && (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="icon" aria-label="Previous week" onClick={() => setWeekStart(addDaysToDateKey(monday, -7))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" aria-label="Next week" onClick={() => setWeekStart(addDaysToDateKey(monday, 7))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" onClick={() => setWeekStart(mondayOf(today))}>
                Today
              </Button>
              <p className="ml-1 text-sm font-semibold">
                {monthDay(monday)} – {monthDay(addDaysToDateKey(monday, 6))}, {parseDateKey(addDaysToDateKey(monday, 6)).year}
              </p>
              <span className="text-sm text-muted-foreground">· {weekTotal} available</span>
              <div className="ml-auto flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={copyToNextWeek}>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copy to next week
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={resetWeek}>
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  Reset week
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <WeekCalendar
            columns={columns}
            onChange={(key, windows) => (mode === "week" ? changeDate(key, windows) : changeTemplateDay(Number(key), windows))}
          />
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-primary" /> {mode === "week" ? "Set for this week" : "Weekly default"}
            </span>
            {mode === "week" && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border border-primary/30 bg-primary/10" /> From your weekly default
              </span>
            )}
            {mode === "week" && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-muted-foreground/30" /> Time off
              </span>
            )}
            <span>Times in {timeZone}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add manually</CardTitle>
          <CardDescription>Prefer typing? Enter exact times instead of dragging on the calendar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="inline-flex rounded-lg border bg-muted p-1 text-sm">
            {(
              [
                ["date", "On specific dates"],
                ["weekly", "Every week"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setManual({ ...manual, kind: value })}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium transition-colors",
                  manual.kind === value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {manual.kind === "date" && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="m-from-date">From date</Label>
                  <Input id="m-from-date" type="date" min={today} value={manual.fromDate} onChange={(e) => setManual({ ...manual, fromDate: e.target.value, toDate: manual.toDate < e.target.value ? e.target.value : manual.toDate })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="m-to-date">To date</Label>
                  <Input id="m-to-date" type="date" min={manual.fromDate || today} value={manual.toDate} onChange={(e) => setManual({ ...manual, toDate: e.target.value })} />
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label htmlFor="m-start">Start time</Label>
              <Input id="m-start" type="time" value={manual.start} onChange={(e) => setManual({ ...manual, start: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-end">End time</Label>
              <Input id="m-end" type="time" value={manual.end} onChange={(e) => setManual({ ...manual, end: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>{manual.kind === "date" ? "Only on these weekdays (leave empty for every day in range)" : "Days"}</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(({ dow, label }) => {
                const on = manual.days.includes(dow)
                return (
                  <button
                    key={dow}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setManual({ ...manual, days: on ? manual.days.filter((d) => d !== dow) : [...manual.days, dow] })}
                    className={cn(
                      "h-9 min-w-12 rounded-md border px-3 text-sm font-medium transition-colors",
                      on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-accent"
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" onClick={addManual}>
              Add to calendar
            </Button>
            <p className="text-xs text-muted-foreground">Added hours appear on the calendar above. Save to apply.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time off</CardTitle>
          <CardDescription>Leave, travel or anything that blocks you. Saved immediately.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {timeOff.length === 0 && <p className="text-sm text-muted-foreground">No upcoming time off.</p>}
          {timeOff.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">
                  {new Date(t.startsAt).toLocaleString()} – {new Date(t.endsAt).toLocaleString()}
                </p>
                {t.reason && <p className="text-muted-foreground">{t.reason}</p>}
              </div>
              <Button variant="ghost" size="icon" aria-label="Remove time off" onClick={() => removeTimeOff(t.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="off-start">From</Label>
              <Input id="off-start" type="datetime-local" value={off.start} onChange={(e) => setOff({ ...off, start: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="off-end">To</Label>
              <Input id="off-end" type="datetime-local" value={off.end} onChange={(e) => setOff({ ...off, end: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="off-reason">Reason (optional)</Label>
              <Input id="off-reason" value={off.reason} onChange={(e) => setOff({ ...off, reason: e.target.value })} />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" disabled={addingOff} onClick={addTimeOff}>
                {addingOff && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add time off
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Time off uses your device time zone.</p>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p className={problem ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {problem ?? (dirty ? "You have unsaved changes." : "All changes saved.")}
          </p>
          <Button disabled={saving || !dirty || !!problem} onClick={save}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save availability
          </Button>
        </div>
      </div>
    </div>
  )
}
