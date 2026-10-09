"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { CalendarCheck, CalendarDays, Clock, Download, ExternalLink, Loader2, MapPin, Users, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { formatInZone, formatTimeInZone, zoneLabel } from "@/lib/timezone"

interface SlotsView {
  state: "NOT_APPLICABLE" | "NOT_ADMITTED" | "AWAITING_BOOKING" | "NO_SLOTS" | "CONTACT_HR" | "BOOKED"
  timeZone: string
  step: {
    name: string
    durationMins: number
    mode: "REMOTE" | "ONSITE" | null
    groupSize: number
    panelSize: number
    instructions: string | null
  } | null
  booking: {
    id: string
    startsAt: string
    endsAt: string
    mode: "REMOTE" | "ONSITE" | null
    meetingLink: string | null
    location: string | null
    interviewers: string[]
    isPast: boolean
  } | null
  days: Array<{ date: string; slots: Array<{ id: string; startsAt: string; endsAt: string; spotsLeft: number }> }>
}

function countdown(ms: number): string {
  if (ms <= 0) return "now"
  const mins = Math.floor(ms / 60000)
  const days = Math.floor(mins / 1440)
  const hours = Math.floor((mins % 1440) / 60)
  if (days > 0) return `in ${days}d ${hours}h`
  if (hours > 0) return `in ${hours}h ${mins % 60}m`
  return `in ${mins}m`
}

export function BookInterviewCard({ pipelineId, onChanged }: { pipelineId: string; onChanged?: () => void }) {
  const [view, setView] = useState<SlotsView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [booking, setBooking] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/candidate/pipelines/${pipelineId}/slots`)
      if (!res.ok) throw new Error("Could not load interview times")
      const data: SlotsView = await res.json()
      setView(data)
      setError(null)
      setSelectedDay((day) => (day && data.days.some((d) => d.date === day) ? day : data.days[0]?.date ?? null))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load interview times")
    }
  }, [pipelineId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const day = useMemo(() => view?.days.find((d) => d.date === selectedDay) ?? null, [view, selectedDay])
  const slot = useMemo(() => view?.days.flatMap((d) => d.slots).find((s) => s.id === selectedSlot) ?? null, [view, selectedSlot])

  const confirm = async () => {
    if (!selectedSlot) return
    setBooking(true)
    try {
      const res = await fetch("/api/candidate/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineId, slotId: selectedSlot }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error || "Could not book this slot")
        setConfirmOpen(false)
        setSelectedSlot(null)
        await load() // the slot may have been taken; show fresh availability
        return
      }
      toast.success("Interview booked. A confirmation email is on its way.")
      setConfirmOpen(false)
      setSelectedSlot(null)
      await load()
      onChanged?.()
    } catch {
      toast.error("Could not book this slot. Please try again.")
    } finally {
      setBooking(false)
    }
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4 text-sm">
          <span className="text-destructive">{error}</span>
          <Button variant="outline" size="sm" onClick={load}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }
  if (!view) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking your interview…
        </CardContent>
      </Card>
    )
  }
  if (view.state === "NOT_APPLICABLE" || view.state === "NOT_ADMITTED") return null

  const tz = view.timeZone
  const stepName = view.step?.name ?? "interview"

  if (view.state === "CONTACT_HR") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interview scheduling</CardTitle>
          <CardDescription>Please contact the recruitment team to arrange a new interview time for {stepName}.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (view.state === "NO_SLOTS") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {stepName}
          </CardTitle>
          <CardDescription>
            Interview times are not open yet. We will email you as soon as you can book.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (view.state === "BOOKED" && view.booking) {
    const b = view.booking
    const start = new Date(b.startsAt)
    return (
      <Card className="border-emerald-500/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <CalendarCheck className="h-5 w-5" />
            Your {stepName} is booked
          </CardTitle>
          <CardDescription>
            {b.isPast ? "This interview has taken place. We will update you soon." : `Starts ${countdown(start.getTime() - now)}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <p className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                {formatInZone(start, tz, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                <br />
                {formatTimeInZone(start, tz)} – {formatTimeInZone(new Date(b.endsAt), tz)} ({zoneLabel(tz, start)})
              </span>
            </p>
            {b.mode === "REMOTE" && (
              <p className="flex items-start gap-2">
                <Video className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                {b.meetingLink ? (
                  <a href={b.meetingLink} target="_blank" rel="noreferrer" className="break-all text-primary underline">
                    Join online <ExternalLink className="inline h-3 w-3" />
                  </a>
                ) : (
                  <span>Online. The link will be shared by email.</span>
                )}
              </p>
            )}
            {b.mode === "ONSITE" && (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{b.location ?? "Onsite. Details will be shared by email."}</span>
              </p>
            )}
            {b.interviewers.length > 0 && (
              <p className="flex items-start gap-2">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{b.interviewers.join(", ")}</span>
              </p>
            )}
          </div>
          {!b.isPast && (
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="outline" size="sm">
                <a href={`/api/candidate/bookings/${b.id}/calendar`}>
                  <Download className="mr-2 h-4 w-4" />
                  Add to calendar
                </a>
              </Button>
              <p className="text-xs text-muted-foreground">Need a different time? Please contact the recruitment team.</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // AWAITING_BOOKING
  const step = view.step!
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Book your {stepName}
        </CardTitle>
        <CardDescription>
          {step.durationMins} minutes · {step.mode === "REMOTE" ? "Online" : step.mode === "ONSITE" ? "Onsite" : "Interview"}
          {step.groupSize > 1 ? ` · group session of up to ${step.groupSize} candidates` : ""} · times in {zoneLabel(tz)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step.instructions && <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">{step.instructions}</p>}

        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Choose a day">
          {view.days.map((d) => {
            const date = new Date(`${d.date}T12:00:00Z`)
            const active = d.date === selectedDay
            return (
              <button
                key={d.date}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSelectedDay(d.date)
                  setSelectedSlot(null)
                }}
                className={cn(
                  "shrink-0 rounded-lg border px-4 py-2 text-center text-sm transition-colors",
                  active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
              >
                <span className="block text-xs opacity-80">{formatInZone(date, "UTC", { weekday: "short" })}</span>
                <span className="block font-semibold">{formatInZone(date, "UTC", { day: "2-digit", month: "short" })}</span>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {day?.slots.map((s) => {
            const active = s.id === selectedSlot
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSlot(s.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-md border px-2 py-2 text-sm font-medium transition-colors",
                  active ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary hover:bg-accent"
                )}
              >
                {formatTimeInZone(new Date(s.startsAt), tz)}
                {step.groupSize > 1 && <span className="block text-[10px] font-normal opacity-80">{s.spotsLeft} left</span>}
              </button>
            )
          })}
        </div>

        <Button disabled={!slot} onClick={() => setConfirmOpen(true)}>
          Continue
        </Button>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={(o) => !booking && setConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm your interview</DialogTitle>
            <DialogDescription>
              {slot &&
                `${formatInZone(new Date(slot.startsAt), tz, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}, ${formatTimeInZone(
                  new Date(slot.startsAt),
                  tz
                )} – ${formatTimeInZone(new Date(slot.endsAt), tz)} (${zoneLabel(tz)})`}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Once booked, only the recruitment team can change this time, so please be sure you can attend.
          </p>
          <DialogFooter>
            <Button variant="outline" disabled={booking} onClick={() => setConfirmOpen(false)}>
              Back
            </Button>
            <Button disabled={booking} onClick={confirm}>
              {booking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
