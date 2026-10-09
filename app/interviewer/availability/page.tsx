"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { validateAvailability } from "@/lib/scheduling/availability-rules"

interface Window {
  startMinute: number
  endMinute: number
}
interface WeeklyWindow extends Window {
  dayOfWeek: number
}
interface OneOffWindow extends Window {
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
  { dow: 1, label: "Monday" },
  { dow: 2, label: "Tuesday" },
  { dow: 3, label: "Wednesday" },
  { dow: 4, label: "Thursday" },
  { dow: 5, label: "Friday" },
  { dow: 6, label: "Saturday" },
  { dow: 0, label: "Sunday" },
]

const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
const fromTime = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}
const todayKey = () => new Date().toLocaleDateString("en-CA")

async function readError(res: Response, fallback: string) {
  const body = await res.json().catch(() => null)
  return body?.error || fallback
}

function TimeRange({ value, onChange, onRemove }: { value: Window; onChange: (w: Window) => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Input type="time" aria-label="From" className="w-32" value={toTime(value.startMinute)} onChange={(e) => onChange({ ...value, startMinute: fromTime(e.target.value) })} />
      <span className="text-muted-foreground">to</span>
      <Input type="time" aria-label="To" className="w-32" value={toTime(value.endMinute)} onChange={(e) => onChange({ ...value, endMinute: fromTime(e.target.value) })} />
      <Button type="button" variant="ghost" size="icon" aria-label="Remove window" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default function AvailabilityPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [timeZone, setTimeZone] = useState("")
  const [weekly, setWeekly] = useState<WeeklyWindow[]>([])
  const [oneOff, setOneOff] = useState<OneOffWindow[]>([])
  const [timeOff, setTimeOff] = useState<TimeOff[]>([])
  const [dirty, setDirty] = useState(false)
  const [off, setOff] = useState({ start: "", end: "", reason: "" })
  const [addingOff, setAddingOff] = useState(false)

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

  const problem = validateAvailability({ weekly, oneOff }, todayKey())

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
          Tell us when you can interview. Admins turn this into bookable slots. Times are in {timeZone}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly hours</CardTitle>
          <CardDescription>Repeats every week. Leave a day empty if you are not available.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {DAYS.map(({ dow, label }) => {
            const rows = weekly.map((w, index) => ({ w, index })).filter(({ w }) => w.dayOfWeek === dow)
            return (
              <div key={dow} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
                <p className="w-28 pt-2 text-sm font-medium">{label}</p>
                <div className="flex-1 space-y-2">
                  {rows.length === 0 && <p className="pt-2 text-sm text-muted-foreground">Unavailable</p>}
                  {rows.map(({ w, index }) => (
                    <TimeRange
                      key={index}
                      value={w}
                      onChange={(next) => mutateWeekly(weekly.map((x, i) => (i === index ? { ...x, ...next } : x)))}
                      onRemove={() => mutateWeekly(weekly.filter((_, i) => i !== index))}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => mutateWeekly([...weekly, { dayOfWeek: dow, startMinute: 9 * 60, endMinute: 17 * 60 }])}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add hours
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extra dates</CardTitle>
          <CardDescription>One-off availability on a specific date, in addition to your weekly hours.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {oneOff.length === 0 && <p className="text-sm text-muted-foreground">No extra dates.</p>}
          {oneOff.map((w, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                aria-label="Date"
                className="w-44"
                min={todayKey()}
                value={w.date}
                onChange={(e) => mutateOneOff(oneOff.map((x, i) => (i === index ? { ...x, date: e.target.value } : x)))}
              />
              <TimeRange
                value={w}
                onChange={(next) => mutateOneOff(oneOff.map((x, i) => (i === index ? { ...x, ...next } : x)))}
                onRemove={() => mutateOneOff(oneOff.filter((_, i) => i !== index))}
              />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => mutateOneOff([...oneOff, { date: todayKey(), startMinute: 9 * 60, endMinute: 12 * 60 }])}>
            <Plus className="mr-1 h-4 w-4" />
            Add a date
          </Button>
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
