"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addDaysToDateKey, dateKeyMinuteToUtc, formatInZone, formatTimeInZone, zonedDateKey, zoneLabel } from "@/lib/timezone"

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

export default function AdminCalendarPage() {
  const [timeZone, setTimeZone] = useState("Asia/Karachi")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [interviewerId, setInterviewerId] = useState("")
  const [interviewers, setInterviewers] = useState<InterviewerOption[]>([])
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [onlyBooked, setOnlyBooked] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const today = zonedDateKey(new Date(), timeZone)
    setFromDate((d) => d || today)
    setToDate((d) => d || addDaysToDateKey(today, 6))
  }, [timeZone])

  useEffect(() => {
    fetch("/api/admin/interviewers")
      .then((r) => (r.ok ? r.json() : { interviewers: [] }))
      .then((d) => setInterviewers(d.interviewers ?? []))
      .catch(() => undefined)
  }, [])

  const load = useCallback(async () => {
    if (!fromDate || !toDate || toDate < fromDate) return
    setSlots(null)
    setError(null)
    try {
      const start = dateKeyMinuteToUtc(fromDate, 0, timeZone).toISOString()
      const end = dateKeyMinuteToUtc(addDaysToDateKey(toDate, 1), 0, timeZone).toISOString()
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
  }, [fromDate, toDate, interviewerId, timeZone])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, interviewerId])

  const days = useMemo(() => {
    const groups = new Map<string, Slot[]>()
    for (const s of slots ?? []) {
      if (onlyBooked && s.bookedCount === 0) continue
      const key = zonedDateKey(new Date(s.startsAt), timeZone)
      groups.set(key, [...(groups.get(key) ?? []), s])
    }
    return [...groups.entries()]
  }, [slots, onlyBooked, timeZone])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Interview calendar</h2>
        <p className="mt-1 text-muted-foreground">All interviews across jobs. Times are in {zoneLabel(timeZone)}.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="cal-from">From</Label>
          <Input id="cal-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cal-to">To</Label>
          <Input id="cal-to" type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cal-interviewer">Interviewer</Label>
          <select
            id="cal-interviewer"
            value={interviewerId}
            onChange={(e) => setInterviewerId(e.target.value)}
            className="flex h-10 w-56 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All interviewers</option>
            {interviewers.map((i) => (
              <option key={i.id} value={i.id}>
                {i.firstname} {i.lastname}
              </option>
            ))}
          </select>
        </div>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={onlyBooked} onChange={(e) => setOnlyBooked(e.target.checked)} />
          Only booked slots
        </label>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : slots === null ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : days.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {onlyBooked ? "No booked interviews in this period." : "No slots in this period."}
          </CardContent>
        </Card>
      ) : (
        days.map(([day, daySlots]) => (
          <Card key={day}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {formatInZone(new Date(`${day}T12:00:00Z`), "UTC", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {daySlots.map((s) => (
                <div key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {formatTimeInZone(new Date(s.startsAt), timeZone)} – {formatTimeInZone(new Date(s.endsAt), timeZone)}
                      <span className="ml-2 font-normal text-muted-foreground">
                        {s.stepName} · {s.jobTitle}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{s.interviewers.map((i) => i.name).join(", ")}</p>
                    {s.candidates.length > 0 && (
                      <p className="flex items-start gap-1 text-xs">
                        <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {s.candidates.map((c) => c.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {s.isBlocked && <Badge variant="destructive">Blocked</Badge>}
                    <Badge variant="outline">{s.mode === "REMOTE" ? "Online" : s.mode === "ONSITE" ? "Onsite" : "Interview"}</Badge>
                    <Badge variant={s.bookedCount >= s.capacity ? "default" : "secondary"}>
                      {s.bookedCount}/{s.capacity}
                    </Badge>
                    <Link href={`/admin/jobs/${s.jobId}/rounds/${s.stepId}/schedule`} className="text-xs text-primary underline">
                      Manage
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
