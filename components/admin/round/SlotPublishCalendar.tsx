"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Info,
  List,
  Loader2,
  Lock,
  Plus,
  Sparkles,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  addDaysToDateKey,
  dateKeyWeekday,
  formatInZone,
  formatTimeInZone,
  parseDateKey,
  zonedDateKey,
  zoneLabel,
} from "@/lib/timezone"
import { cn } from "@/lib/utils"

export interface SlotRow {
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

interface DraftSlot {
  id: string
  startsAt: string
  endsAt: string
  interviewerIds: string[]
  capacity: number
}

interface InterviewerInfo {
  id: string
  name: string
  availability: Array<{
    dayOfWeek: number | null
    date: string | null
    startMinute: number
    endMinute: number
  }>
  timeOff: Array<{ startsAt: string; endsAt: string }>
}

interface PreviewResponse {
  timeZone: string
  total: number
  perDay: Array<{ date: string; count: number }>
  interviewersUsed: number
  candidateCapacity: number
  warnings: string[]
  config: {
    durationMins: number
    bufferMins: number
    panelSize: number
    groupSize: number
    mode: "REMOTE" | "ONSITE" | null
    poolSize: number
    meetingLink?: string | null
    location?: string | null
  }
  drafts?: DraftSlot[]
  interviewers?: InterviewerInfo[]
}

interface Props {
  roundId: string
  jobId: string
  timeZone: string
  existingSlots: SlotRow[]
  onSlotsChanged: () => Promise<void>
  isPoolConfigured: boolean
}

type CalendarView = "grid" | "agenda" | "month" | "day"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const SHORT_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function startOfWeek(key: string): string {
  // ISO week starts on Monday
  const w = (dateKeyWeekday(key) + 6) % 7
  return addDaysToDateKey(key, -w)
}

function startOfMonth(key: string): string {
  return `${key.slice(0, 8)}01`
}

function endOfMonth(key: string): string {
  const { year, month } = parseDateKey(key)
  const d = new Date(Date.UTC(year, month, 0))
  return `${year}-${String(month).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
}

function minuteToTime(m: number): string {
  const h = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, "0")
  const ampm = h >= 12 ? "pm" : "am"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${mm}${ampm}`
}

function summarizeAvailability(rules: InterviewerInfo["availability"]): string {
  if (rules.length === 0) return "No hours configured"
  const weekly = rules.filter((r) => r.dayOfWeek !== null)
  if (weekly.length === 0) return `${rules.length} custom dates`
  if (weekly.length === 5 && weekly.every((r) => r.dayOfWeek !== null && r.dayOfWeek >= 1 && r.dayOfWeek <= 5)) {
    const first = weekly[0]
    if (first) {
      return `Mon–Fri ${minuteToTime(first.startMinute)}–${minuteToTime(first.endMinute)}`
    }
  }
  const days = weekly
    .map((r) => (r.dayOfWeek !== null ? SHORT_DOW[r.dayOfWeek] : ""))
    .filter(Boolean)
    .join(", ")
  const first = weekly[0]
  if (first) {
    return `${days} ${minuteToTime(first.startMinute)}–${minuteToTime(first.endMinute)}`
  }
  return days
}

export function SlotPublishCalendar({
  roundId,
  timeZone,
  existingSlots,
  onSlotsChanged,
  isPoolConfigured,
}: Props) {
  const [view, setView] = useState<CalendarView>("grid")
  const [anchorDate, setAnchorDate] = useState(() => zonedDateKey(new Date(), timeZone))
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set())
  const [filterInterviewerId, setFilterInterviewerId] = useState<string | null>(null)

  // Single / Custom slot dialog
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const [customDate, setCustomDate] = useState("")
  const [customStartTime, setCustomStartTime] = useState("09:00")
  const [customEndTime, setCustomEndTime] = useState("09:45")
  const [customInterviewers, setCustomInterviewers] = useState<string[]>([])
  const [customCapacity, setCustomCapacity] = useState(1)
  const [customMode, setCustomMode] = useState<"REMOTE" | "ONSITE">("REMOTE")
  const [customMeetingLink, setCustomMeetingLink] = useState("")
  const [customLocation, setCustomLocation] = useState("")
  const [creatingSingle, setCreatingSingle] = useState(false)

  // Calculate current visible date bounds
  const { fromDate, toDate } = useMemo(() => {
    if (view === "month") {
      const start = startOfMonth(anchorDate)
      const end = endOfMonth(anchorDate)
      return { fromDate: start, toDate: end }
    }
    if (view === "day") {
      return { fromDate: anchorDate, toDate: anchorDate }
    }
    // Week (Grid or Agenda)
    const start = startOfWeek(anchorDate)
    const end = addDaysToDateKey(start, 6)
    return { fromDate: start, toDate: end }
  }, [view, anchorDate])

  // Fetch slot drafts & availability whenever range changes or round changes
  const loadPreview = useCallback(async () => {
    if (!roundId || !fromDate || !toDate) return
    setLoadingPreview(true)
    try {
      const res = await fetch(`/api/admin/steps/${roundId}/slots/preview?fromDate=${fromDate}&toDate=${toDate}`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || "Failed to load availability preview")
      }
      const data: PreviewResponse = await res.json()
      setPreview(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load preview")
    } finally {
      setLoadingPreview(false)
    }
  }, [roundId, fromDate, toDate])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  // Reset selected drafts when bounds change
  useEffect(() => {
    setSelectedDraftIds(new Set())
  }, [fromDate, toDate])

  // Available interviewers map
  const interviewerMap = useMemo(() => {
    const map = new Map<string, string>()
    if (preview?.interviewers) {
      for (const i of preview.interviewers) {
        map.set(i.id, i.name)
      }
    }
    return map
  }, [preview?.interviewers])

  // Filter drafts based on interviewer filter
  const filteredDrafts = useMemo(() => {
    if (!preview?.drafts) return []
    if (!filterInterviewerId) return preview.drafts
    return preview.drafts.filter((d) => d.interviewerIds.includes(filterInterviewerId))
  }, [preview?.drafts, filterInterviewerId])

  // Group drafts by date (in org timezone)
  const draftsByDate = useMemo(() => {
    const map = new Map<string, DraftSlot[]>()
    for (const d of filteredDrafts) {
      const key = zonedDateKey(new Date(d.startsAt), timeZone)
      const list = map.get(key) || []
      list.push(d)
      map.set(key, list)
    }
    return map
  }, [filteredDrafts, timeZone])

  // Group existing published slots by date
  const existingByDate = useMemo(() => {
    const map = new Map<string, SlotRow[]>()
    for (const s of existingSlots) {
      const key = zonedDateKey(new Date(s.startsAt), timeZone)
      const list = map.get(key) || []
      list.push(s)
      map.set(key, list)
    }
    return map
  }, [existingSlots, timeZone])

  // Navigation handlers
  const handlePrev = () => {
    if (view === "month") {
      const { year, month } = parseDateKey(anchorDate)
      const prevDate = new Date(Date.UTC(year, month - 2, 1))
      setAnchorDate(`${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}-01`)
    } else if (view === "day") {
      setAnchorDate((d) => addDaysToDateKey(d, -1))
    } else {
      setAnchorDate((d) => addDaysToDateKey(d, -7))
    }
  }

  const handleNext = () => {
    if (view === "month") {
      const { year, month } = parseDateKey(anchorDate)
      const nextDate = new Date(Date.UTC(year, month, 1))
      setAnchorDate(`${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}-01`)
    } else if (view === "day") {
      setAnchorDate((d) => addDaysToDateKey(d, 1))
    } else {
      setAnchorDate((d) => addDaysToDateKey(d, 7))
    }
  }

  const handleToday = () => {
    setAnchorDate(zonedDateKey(new Date(), timeZone))
  }

  // Multi-selection helpers
  const toggleDraftSelection = (draftId: string) => {
    setSelectedDraftIds((prev) => {
      const next = new Set(prev)
      if (next.has(draftId)) next.delete(draftId)
      else next.add(draftId)
      return next
    })
  }

  const selectAllVisible = () => {
    const next = new Set<string>()
    for (const d of filteredDrafts) {
      next.add(d.id)
    }
    setSelectedDraftIds(next)
  }

  const clearSelection = () => {
    setSelectedDraftIds(new Set())
  }

  const selectDayDrafts = (dayKey: string) => {
    const dayDrafts = draftsByDate.get(dayKey) || []
    if (dayDrafts.length === 0) return
    const allSelected = dayDrafts.every((d) => selectedDraftIds.has(d.id))
    setSelectedDraftIds((prev) => {
      const next = new Set(prev)
      for (const d of dayDrafts) {
        if (allSelected) next.delete(d.id)
        else next.add(d.id)
      }
      return next
    })
  }

  // Publish selected slots
  const publishSelected = async () => {
    if (selectedDraftIds.size === 0 || !preview?.drafts) return
    const draftsToPublish = preview.drafts.filter((d) => selectedDraftIds.has(d.id))
    if (draftsToPublish.length === 0) return

    setPublishing(true)
    try {
      const payload = {
        slots: draftsToPublish.map((d) => ({
          startsAt: d.startsAt,
          endsAt: d.endsAt,
          interviewerIds: d.interviewerIds,
          capacity: d.capacity,
          mode: preview.config.mode,
          meetingLink: preview.config.meetingLink ?? null,
          location: preview.config.location ?? null,
        })),
      }
      const res = await fetch(`/api/admin/steps/${roundId}/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || "Failed to publish slots")
      }
      const data = await res.json()
      toast.success(`${data.created} slot${data.created === 1 ? "" : "s"} published successfully!`)
      setSelectedDraftIds(new Set())
      await onSlotsChanged()
      await loadPreview()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed")
    } finally {
      setPublishing(false)
    }
  }

  // Publish a single draft slot directly
  const publishSingleDraft = async (draft: DraftSlot) => {
    setPublishing(true)
    try {
      const payload = {
        slots: [
          {
            startsAt: draft.startsAt,
            endsAt: draft.endsAt,
            interviewerIds: draft.interviewerIds,
            capacity: draft.capacity,
            mode: preview?.config.mode ?? null,
            meetingLink: preview?.config.meetingLink ?? null,
            location: preview?.config.location ?? null,
          },
        ],
      }
      const res = await fetch(`/api/admin/steps/${roundId}/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || "Failed to publish slot")
      }
      toast.success("Interview slot published!")
      await onSlotsChanged()
      await loadPreview()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish slot")
    } finally {
      setPublishing(false)
    }
  }

  // Publish all slots for the current visible range
  const publishAllRange = async () => {
    if (!preview || preview.total === 0) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/admin/steps/${roundId}/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDate, toDate }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || "Failed to publish slots")
      }
      const data = await res.json()
      toast.success(`${data.created} slots published!`)
      setSelectedDraftIds(new Set())
      await onSlotsChanged()
      await loadPreview()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish range")
    } finally {
      setPublishing(false)
    }
  }

  // Open custom slot modal for a specific day
  const openCustomSlotForDay = (dayKey: string) => {
    setCustomDate(dayKey)
    const duration = preview?.config.durationMins || 45
    setCustomStartTime("09:00")
    const endM = 9 * 60 + duration
    const endH = String(Math.floor(endM / 60)).padStart(2, "0")
    const endMin = String(endM % 60).padStart(2, "0")
    setCustomEndTime(`${endH}:${endMin}`)
    setCustomCapacity(preview?.config.groupSize || 1)
    setCustomMode(preview?.config.mode === "ONSITE" ? "ONSITE" : "REMOTE")
    setCustomMeetingLink(preview?.config.meetingLink || "")
    setCustomLocation(preview?.config.location || "")

    if (preview?.interviewers && preview.interviewers.length > 0) {
      const dow = (dateKeyWeekday(dayKey) + 7) % 7
      const avail = preview.interviewers.filter((i) =>
        i.availability.some((a) => a.dayOfWeek === dow || a.date === dayKey)
      )
      if (avail.length > 0 && avail[0]) {
        setCustomInterviewers([avail[0].id])
      } else if (preview.interviewers[0]) {
        setCustomInterviewers([preview.interviewers[0].id])
      }
    }
    setCustomDialogOpen(true)
  }

  // Create single custom slot
  const handleCreateCustomSlot = async () => {
    if (!customDate || !customStartTime || !customEndTime) {
      toast.error("Please enter date and valid start and end times")
      return
    }
    if (customInterviewers.length === 0) {
      toast.error("Please select at least one interviewer")
      return
    }

    setCreatingSingle(true)
    try {
      const startsAt = new Date(`${customDate}T${customStartTime}:00`)
      const endsAt = new Date(`${customDate}T${customEndTime}:00`)
      if (endsAt <= startsAt) {
        toast.error("End time must be after start time")
        setCreatingSingle(false)
        return
      }

      const payload = {
        slots: [
          {
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            interviewerIds: customInterviewers,
            capacity: customCapacity,
            mode: customMode,
            meetingLink: customMode === "REMOTE" ? customMeetingLink || null : null,
            location: customMode === "ONSITE" ? customLocation || null : null,
          },
        ],
      }
      const res = await fetch(`/api/admin/steps/${roundId}/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || "Failed to create slot")
      }
      toast.success("Single interview slot created!")
      setCustomDialogOpen(false)
      await onSlotsChanged()
      await loadPreview()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create slot")
    } finally {
      setCreatingSingle(false)
    }
  }

  // Format header title
  const headerTitle = useMemo(() => {
    if (view === "month") {
      return formatInZone(new Date(`${anchorDate}T12:00:00Z`), "UTC", { month: "long", year: "numeric" })
    }
    if (view === "day") {
      return formatInZone(new Date(`${anchorDate}T12:00:00Z`), "UTC", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    }
    // Week
    const start = startOfWeek(anchorDate)
    const end = addDaysToDateKey(start, 6)
    const startStr = formatInZone(new Date(`${start}T12:00:00Z`), "UTC", { month: "short", day: "numeric" })
    const endStr = formatInZone(new Date(`${end}T12:00:00Z`), "UTC", { month: "short", day: "numeric", year: "numeric" })
    return `${startStr} – ${endStr}`
  }, [view, anchorDate])

  const totalVisibleDrafts = filteredDrafts.length
  const selectedCount = selectedDraftIds.size

  return (
    <Card className="border-border/80 shadow-xs overflow-hidden">
      {/* Top Header Card */}
      <CardHeader className="bg-muted/30 border-b p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold tracking-tight">
              <CalendarPlus className="h-5 w-5 text-primary shrink-0" />
              <span>Publish Interview Slots</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground">
              Times shown in <span className="font-semibold text-foreground">{zoneLabel(timeZone)}</span>. Create slots individually or select multiple at once.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openCustomSlotForDay(anchorDate)}
              className="h-8 gap-1.5 text-xs font-medium whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              Custom Slot
            </Button>

            {totalVisibleDrafts > 0 && (
              <Button
                variant="default"
                size="sm"
                disabled={publishing || loadingPreview}
                onClick={publishAllRange}
                className="h-8 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
              >
                {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Publish All ({totalVisibleDrafts})
              </Button>
            )}
          </div>
        </div>

        {/* Warnings / Pool alert */}
        {preview?.warnings && preview.warnings.length > 0 && (
          <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300">
            {preview.warnings.map((w, idx) => (
              <p key={idx} className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{w}</span>
              </p>
            ))}
          </div>
        )}

        {/* Interviewer Availability Filter & Hours Strip */}
        {preview?.interviewers && preview.interviewers.length > 0 && (
          <div className="rounded-lg border bg-background p-3 text-xs shadow-2xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span>Interviewer Pool Availability:</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Filter className="h-3 w-3 shrink-0" />
                <span>Filter:</span>
                <Button
                  variant={filterInterviewerId === null ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-[11px] whitespace-nowrap font-medium"
                  onClick={() => setFilterInterviewerId(null)}
                >
                  All ({preview.interviewers.length})
                </Button>
              </div>
            </div>

            {/* Clean non-overlapping chips */}
            <div className="flex flex-wrap gap-2">
              {preview.interviewers.map((inv) => {
                const isSelected = filterInterviewerId === inv.id
                const hasHours = inv.availability.length > 0
                const hasTimeOff = inv.timeOff.length > 0
                const summary = summarizeAvailability(inv.availability)

                return (
                  <button
                    type="button"
                    key={inv.id}
                    onClick={() => setFilterInterviewerId(isSelected ? null : inv.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-xs transition-all max-w-[280px] shrink-0",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                        : "hover:bg-muted/60 border-border bg-card"
                    )}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-[11px] text-primary uppercase">
                      {inv.name.slice(0, 1)}
                    </span>
                    <div className="flex flex-col min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground truncate text-xs">{inv.name}</span>
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", hasHours ? "bg-emerald-500" : "bg-amber-500")} />
                      </div>
                      <span className="text-[11px] text-muted-foreground truncate" title={summary}>
                        {summary}
                      </span>
                      {hasTimeOff && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate">
                          🏖️ Time off in range
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Navigation & Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          {/* Date Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handlePrev} title="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs font-medium shrink-0" onClick={handleToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleNext} title="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm sm:text-base font-semibold text-foreground ml-1 whitespace-nowrap">
              {headerTitle}
            </span>
          </div>

          {/* Right Controls: View Switcher & Selection */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex rounded-md border p-0.5 bg-muted/40 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={cn(
                  "px-2.5 py-1 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1",
                  view === "grid" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setView("agenda")}
                className={cn(
                  "px-2.5 py-1 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1",
                  view === "agenda" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-3.5 w-3.5" />
                <span>Agenda</span>
              </button>
              <button
                type="button"
                onClick={() => setView("month")}
                className={cn(
                  "px-2.5 py-1 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1",
                  view === "month" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Month</span>
              </button>
              <button
                type="button"
                onClick={() => setView("day")}
                className={cn(
                  "px-2.5 py-1 rounded-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1",
                  view === "day" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Day</span>
              </button>
            </div>

            {totalVisibleDrafts > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium whitespace-nowrap shrink-0"
                onClick={selectedCount === totalVisibleDrafts ? clearSelection : selectAllVisible}
              >
                {selectedCount === totalVisibleDrafts ? "Clear Selection" : `Select All (${totalVisibleDrafts})`}
              </Button>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground px-2.5 py-1.5 rounded-md border border-dashed bg-muted/15">
          <span className="font-semibold text-foreground flex items-center gap-1 shrink-0">
            <Info className="h-3 w-3 shrink-0" /> Legend:
          </span>
          <span className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500/20 border border-emerald-500 inline-block" />
            <strong className="text-emerald-700 dark:text-emerald-300">Available to Publish</strong>
          </span>
          <span className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <span className="h-2.5 w-2.5 rounded-xs bg-blue-500/20 border border-blue-500 inline-block" />
            <strong className="text-blue-700 dark:text-blue-300">Published (Open)</strong>
          </span>
          <span className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <span className="h-2.5 w-2.5 rounded-xs bg-purple-500/20 border border-purple-500 inline-block" />
            <strong className="text-purple-700 dark:text-purple-300">Booked (Candidate)</strong>
          </span>
          <span className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
            <span className="h-2.5 w-2.5 rounded-xs bg-muted border border-muted-foreground/40 inline-block" />
            <strong className="text-muted-foreground">Blocked</strong>
          </span>
        </div>

        {/* Loading overlay indicator */}
        {loadingPreview && (
          <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Calculating interviewer availability slots…</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: WEEK GRID (Spacious 180px+ columns with horizontal scrolling)     */}
        {/* ========================================================================= */}
        {view === "grid" && (
          <div className="overflow-x-auto pb-4 -mx-2 px-2 scrollbar-thin">
            <div className="grid grid-cols-7 gap-3 min-w-[1260px]">
              {Array.from({ length: 7 }, (_, i) => {
                const start = startOfWeek(anchorDate)
                const dayKey = addDaysToDateKey(start, i)
                const isToday = dayKey === zonedDateKey(new Date(), timeZone)
                const dayDrafts = draftsByDate.get(dayKey) || []
                const dayExisting = existingByDate.get(dayKey) || []
                const allDaySelected = dayDrafts.length > 0 && dayDrafts.every((d) => selectedDraftIds.has(d.id))

                const dow = (dateKeyWeekday(dayKey) + 7) % 7
                const availableInterviewersOnDay = preview?.interviewers?.filter((inv) =>
                  inv.availability.some((a) => a.dayOfWeek === dow || a.date === dayKey)
                ) || []

                return (
                  <div
                    key={dayKey}
                    className={cn(
                      "flex flex-col rounded-lg border bg-card transition-all overflow-hidden min-h-[440px] w-[175px]",
                      isToday ? "border-primary/60 shadow-xs ring-1 ring-primary/30" : "border-border/80"
                    )}
                  >
                    {/* Day Column Header */}
                    <div
                      className={cn(
                        "p-3 border-b flex flex-col gap-1.5",
                        isToday ? "bg-primary/10" : "bg-muted/40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {WEEKDAYS[i]}
                          </span>
                          <span className="text-sm font-bold text-foreground whitespace-nowrap">
                            {formatInZone(new Date(`${dayKey}T12:00:00Z`), "UTC", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        {isToday && (
                          <Badge variant="default" className="text-[10px] h-4 px-1.5 py-0 font-medium whitespace-nowrap">
                            Today
                          </Badge>
                        )}
                      </div>

                      {/* Day actions: Select all + Add slot */}
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        {dayDrafts.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => selectDayDrafts(dayKey)}
                            className="font-medium text-primary hover:underline flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <span
                              className={cn(
                                "h-3.5 w-3.5 rounded-xs border flex items-center justify-center text-[10px]",
                                allDaySelected ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/60 bg-background"
                              )}
                            >
                              {allDaySelected && <Check className="h-2.5 w-2.5" />}
                            </span>
                            <span>{allDaySelected ? "Deselect" : "Select all"} ({dayDrafts.length})</span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px] whitespace-nowrap">No free time</span>
                        )}

                        <button
                          type="button"
                          onClick={() => openCustomSlotForDay(dayKey)}
                          className="text-muted-foreground hover:text-foreground text-[11px] flex items-center gap-0.5 font-medium whitespace-nowrap bg-background/80 hover:bg-background border rounded px-1.5 py-0.5"
                          title="Add custom slot on this day"
                        >
                          <Plus className="h-3 w-3" /> Slot
                        </button>
                      </div>

                      {/* Free interviewers summary */}
                      {availableInterviewersOnDay.length > 0 && (
                        <div
                          className="pt-1 border-t border-border/50 text-[10px] text-muted-foreground truncate"
                          title={availableInterviewersOnDay.map((inv) => inv.name).join(", ")}
                        >
                          <span className="font-semibold text-foreground">Free: </span>
                          {availableInterviewersOnDay.map((inv) => inv.name.split(" ")[0]).join(", ")}
                        </div>
                      )}
                    </div>

                    {/* Day Slots List */}
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[540px]">
                      {/* 1. Existing Published Slots on this day */}
                      {dayExisting.map((slot) => {
                        const isBooked = slot.bookedCount > 0
                        return (
                          <div
                            key={slot.id}
                            className={cn(
                              "rounded-lg border p-2.5 text-xs flex flex-col gap-1.5 transition-all shadow-2xs",
                              slot.isBlocked
                                ? "bg-muted/60 border-muted-foreground/30 text-muted-foreground line-through"
                                : isBooked
                                ? "bg-purple-500/10 border-purple-500/40 text-purple-950 dark:text-purple-200"
                                : "bg-blue-500/10 border-blue-500/40 text-blue-950 dark:text-blue-200"
                            )}
                          >
                            <div className="flex items-center justify-between gap-1 font-bold text-xs">
                              <span className="whitespace-nowrap">
                                {formatTimeInZone(new Date(slot.startsAt), timeZone)}–{formatTimeInZone(new Date(slot.endsAt), timeZone)}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] py-0 h-4 border whitespace-nowrap shrink-0",
                                  isBooked
                                    ? "border-purple-500/40 bg-purple-500/20 text-purple-800 dark:text-purple-300"
                                    : "border-blue-500/40 bg-blue-500/20 text-blue-800 dark:text-blue-300"
                                )}
                              >
                                {isBooked ? "Booked" : "Published"}
                              </Badge>
                            </div>

                            <div className="text-[11px] opacity-85 truncate" title={slot.interviewers.map((i) => i.name).join(", ")}>
                              👤 {slot.interviewers.map((i) => i.name).join(", ") || "No interviewer"}
                            </div>

                            {isBooked && slot.bookings[0] && (
                              <div className="text-[11px] font-medium text-purple-700 dark:text-purple-300 truncate" title={slot.bookings[0].candidateName}>
                                🎓 {slot.bookings[0].candidateName}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* 2. Draft / Available Slots on this day */}
                      {dayDrafts.map((draft) => {
                        const isSelected = selectedDraftIds.has(draft.id)
                        const interviewerNames = draft.interviewerIds
                          .map((id) => interviewerMap.get(id) || "Interviewer")
                          .join(", ")

                        return (
                          <div
                            key={draft.id}
                            onClick={() => toggleDraftSelection(draft.id)}
                            className={cn(
                              "group rounded-lg border border-dashed p-2.5 text-xs cursor-pointer transition-all flex flex-col gap-1.5 shadow-2xs",
                              isSelected
                                ? "bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500 shadow-xs"
                                : "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/50 hover:border-emerald-600"
                            )}
                          >
                            {/* Line 1: Checkbox + Time (Clean full width) */}
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "h-4 w-4 rounded-xs border flex items-center justify-center text-[11px] shrink-0 transition-colors",
                                  isSelected
                                    ? "bg-emerald-600 text-white border-emerald-600"
                                    : "border-muted-foreground/60 group-hover:border-emerald-600 bg-background"
                                )}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                              </span>
                              <span className="font-bold text-foreground text-xs whitespace-nowrap tracking-tight">
                                {formatTimeInZone(new Date(draft.startsAt), timeZone)} – {formatTimeInZone(new Date(draft.endsAt), timeZone)}
                              </span>
                            </div>

                            {/* Line 2: Interviewers */}
                            <div className="text-[11px] text-muted-foreground truncate" title={interviewerNames}>
                              👤 {interviewerNames}
                            </div>

                            {/* Line 3: Seats + Publish Button */}
                            <div className="flex items-center justify-between gap-1 pt-1 border-t border-emerald-500/20">
                              <span className="text-[10px] font-medium bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                                {draft.capacity} seat{draft.capacity > 1 ? "s" : ""}
                              </span>

                              <Button
                                variant="outline"
                                size="sm"
                                disabled={publishing}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  publishSingleDraft(draft)
                                }}
                                className="h-6 px-2 text-[10px] shrink-0 font-semibold bg-background hover:bg-emerald-600 hover:text-white border-emerald-500/40 whitespace-nowrap"
                                title="Publish this single slot"
                              >
                                Publish
                              </Button>
                            </div>
                          </div>
                        )
                      })}

                      {dayExisting.length === 0 && dayDrafts.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground text-xs gap-1.5">
                          <Clock className="h-5 w-5 opacity-40" />
                          <span>No slots</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] text-primary"
                            onClick={() => openCustomSlotForDay(dayKey)}
                          >
                            + Add custom
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: AGENDA / LIST VIEW (Full-width responsive cards - Zero horizontal scroll) */}
        {/* ========================================================================= */}
        {view === "agenda" && (
          <div className="space-y-3">
            {Array.from({ length: 7 }, (_, i) => {
              const start = startOfWeek(anchorDate)
              const dayKey = addDaysToDateKey(start, i)
              const isToday = dayKey === zonedDateKey(new Date(), timeZone)
              const dayDrafts = draftsByDate.get(dayKey) || []
              const dayExisting = existingByDate.get(dayKey) || []
              const allDaySelected = dayDrafts.length > 0 && dayDrafts.every((d) => selectedDraftIds.has(d.id))

              const dow = (dateKeyWeekday(dayKey) + 7) % 7
              const availableInterviewersOnDay = preview?.interviewers?.filter((inv) =>
                inv.availability.some((a) => a.dayOfWeek === dow || a.date === dayKey)
              ) || []

              return (
                <div
                  key={dayKey}
                  className={cn(
                    "rounded-xl border bg-card p-3 sm:p-4 space-y-3 transition-all",
                    isToday ? "border-primary/60 shadow-xs ring-1 ring-primary/30" : "border-border/80"
                  )}
                >
                  {/* Agenda Day Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {formatInZone(new Date(`${dayKey}T12:00:00Z`), "UTC", { weekday: "long", month: "short", day: "numeric" })}
                      </span>
                      {isToday && (
                        <Badge variant="default" className="text-[10px] h-4 px-1.5 py-0 font-medium whitespace-nowrap">
                          Today
                        </Badge>
                      )}
                      {availableInterviewersOnDay.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                          (Free: {availableInterviewersOnDay.map((inv) => inv.name).join(", ")})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {dayDrafts.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => selectDayDrafts(dayKey)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {allDaySelected ? "Deselect Day" : `Select All (${dayDrafts.length})`}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => openCustomSlotForDay(dayKey)}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Slot
                      </Button>
                    </div>
                  </div>

                  {/* Agenda Slots Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                    {/* Published Slots */}
                    {dayExisting.map((slot) => {
                      const isBooked = slot.bookedCount > 0
                      return (
                        <div
                          key={slot.id}
                          className={cn(
                            "rounded-lg border p-3 text-xs flex flex-col gap-1.5 shadow-2xs",
                            slot.isBlocked
                              ? "bg-muted/60 border-muted-foreground/30 text-muted-foreground line-through"
                              : isBooked
                              ? "bg-purple-500/10 border-purple-500/40 text-purple-950 dark:text-purple-200"
                              : "bg-blue-500/10 border-blue-500/40 text-blue-950 dark:text-blue-200"
                          )}
                        >
                          <div className="flex items-center justify-between font-bold text-xs">
                            <span className="whitespace-nowrap">
                              {formatTimeInZone(new Date(slot.startsAt), timeZone)} – {formatTimeInZone(new Date(slot.endsAt), timeZone)}
                            </span>
                            <Badge variant="outline" className="text-[10px]">{isBooked ? "Booked" : "Published"}</Badge>
                          </div>
                          <div className="text-[11px] opacity-85 truncate">
                            👤 {slot.interviewers.map((i) => i.name).join(", ") || "No interviewer"}
                          </div>
                          {isBooked && slot.bookings[0] && (
                            <div className="text-[11px] font-medium text-purple-700 dark:text-purple-300 truncate">
                              🎓 {slot.bookings[0].candidateName}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Draft Slots */}
                    {dayDrafts.map((draft) => {
                      const isSelected = selectedDraftIds.has(draft.id)
                      const interviewerNames = draft.interviewerIds
                        .map((id) => interviewerMap.get(id) || "Interviewer")
                        .join(", ")

                      return (
                        <div
                          key={draft.id}
                          onClick={() => toggleDraftSelection(draft.id)}
                          className={cn(
                            "rounded-lg border border-dashed p-3 text-xs cursor-pointer transition-all flex flex-col gap-2 shadow-2xs",
                            isSelected
                              ? "bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500"
                              : "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/50 hover:border-emerald-600"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "h-4 w-4 rounded-xs border flex items-center justify-center text-xs shrink-0",
                                  isSelected ? "bg-emerald-600 text-white border-emerald-600" : "border-muted-foreground/60 bg-background"
                                )}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                              </span>
                              <span className="font-bold text-xs text-foreground whitespace-nowrap">
                                {formatTimeInZone(new Date(draft.startsAt), timeZone)} – {formatTimeInZone(new Date(draft.endsAt), timeZone)}
                              </span>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              disabled={publishing}
                              onClick={(e) => {
                                e.stopPropagation()
                                publishSingleDraft(draft)
                              }}
                              className="h-6 px-2 text-[10px] font-semibold bg-background hover:bg-emerald-600 hover:text-white border-emerald-500/40 whitespace-nowrap"
                            >
                              Publish
                            </Button>
                          </div>

                          <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                            <span className="truncate max-w-[150px]">👤 {interviewerNames}</span>
                            <span className="font-medium bg-muted px-1.5 py-0.5 rounded text-[10px]">
                              {draft.capacity} seat{draft.capacity > 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      )
                    })}

                    {dayExisting.length === 0 && dayDrafts.length === 0 && (
                      <div className="col-span-full py-3 text-center text-xs text-muted-foreground">
                        No free interviewer slots on this day.
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: MONTH VIEW                                                        */}
        {/* ========================================================================= */}
        {view === "month" && (
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-muted-foreground pb-1">
              {WEEKDAYS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {(() => {
                const startM = startOfMonth(anchorDate)
                const endM = endOfMonth(anchorDate)
                const startWeekday = (dateKeyWeekday(startM) + 6) % 7
                const days: Array<{ dayKey: string; isCurrentMonth: boolean }> = []

                // Padding from previous month
                for (let i = startWeekday - 1; i >= 0; i--) {
                  days.push({ dayKey: addDaysToDateKey(startM, -i - 1), isCurrentMonth: false })
                }
                // Days of current month
                let cur = startM
                while (cur <= endM) {
                  days.push({ dayKey: cur, isCurrentMonth: true })
                  cur = addDaysToDateKey(cur, 1)
                }
                // Padding for next month
                while (days.length % 7 !== 0) {
                  days.push({ dayKey: cur, isCurrentMonth: false })
                  cur = addDaysToDateKey(cur, 1)
                }

                return days.map(({ dayKey, isCurrentMonth }) => {
                  const isToday = dayKey === zonedDateKey(new Date(), timeZone)
                  const dayDrafts = draftsByDate.get(dayKey) || []
                  const dayExisting = existingByDate.get(dayKey) || []

                  return (
                    <div
                      key={dayKey}
                      onClick={() => {
                        setAnchorDate(dayKey)
                        setView("day")
                      }}
                      className={cn(
                        "flex flex-col min-h-[90px] sm:min-h-[110px] p-2 rounded-lg border transition-all cursor-pointer text-left",
                        !isCurrentMonth && "opacity-40 bg-muted/20 border-transparent",
                        isCurrentMonth && "bg-card hover:border-primary/50 border-border/80",
                        isToday && "ring-2 ring-primary border-primary bg-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            "text-xs font-bold h-5 w-5 flex items-center justify-center rounded-full",
                            isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                          )}
                        >
                          {parseDateKey(dayKey).day}
                        </span>

                        {isCurrentMonth && dayDrafts.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              selectDayDrafts(dayKey)
                            }}
                            className="text-[10px] text-primary hover:underline font-medium whitespace-nowrap"
                          >
                            +Select ({dayDrafts.length})
                          </button>
                        )}
                      </div>

                      <div className="flex-1 flex flex-col gap-1 justify-center text-[10px]">
                        {dayDrafts.length > 0 && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium py-0 h-4 justify-center whitespace-nowrap"
                          >
                            {dayDrafts.length} Available
                          </Badge>
                        )}
                        {dayExisting.length > 0 && (
                          <Badge
                            variant="outline"
                            className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-medium py-0 h-4 justify-center whitespace-nowrap"
                          >
                            {dayExisting.length} Published
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: DAY VIEW                                                          */}
        {/* ========================================================================= */}
        {view === "day" && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-muted/40 border">
              <div>
                <h4 className="font-bold text-base text-foreground">
                  {formatInZone(new Date(`${anchorDate}T12:00:00Z`), "UTC", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {(draftsByDate.get(anchorDate) || []).length} draft slots available · {(existingByDate.get(anchorDate) || []).length} published slots
                </p>
              </div>

              <div className="flex items-center gap-2">
                {(draftsByDate.get(anchorDate) || []).length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs whitespace-nowrap"
                    onClick={() => selectDayDrafts(anchorDate)}
                  >
                    Select All Drafts
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs whitespace-nowrap"
                  onClick={() => openCustomSlotForDay(anchorDate)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Custom Slot
                </Button>
              </div>
            </div>

            {/* Existing published slots on this day */}
            {(existingByDate.get(anchorDate) || []).length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Published Slots</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(existingByDate.get(anchorDate) || []).map((slot) => {
                    const isBooked = slot.bookedCount > 0
                    return (
                      <div
                        key={slot.id}
                        className={cn(
                          "rounded-lg border p-3 text-xs flex flex-col gap-1.5 shadow-2xs",
                          slot.isBlocked
                            ? "bg-muted/60 border-muted-foreground/30 text-muted-foreground line-through"
                            : isBooked
                            ? "bg-purple-500/10 border-purple-500/40 text-purple-950 dark:text-purple-200"
                            : "bg-blue-500/10 border-blue-500/40 text-blue-950 dark:text-blue-200"
                        )}
                      >
                        <div className="flex items-center justify-between font-bold text-sm">
                          <span className="whitespace-nowrap">
                            {formatTimeInZone(new Date(slot.startsAt), timeZone)} – {formatTimeInZone(new Date(slot.endsAt), timeZone)}
                          </span>
                          <Badge variant="outline" className="whitespace-nowrap">{isBooked ? "Booked" : "Published"}</Badge>
                        </div>
                        <div className="text-xs opacity-90 truncate">
                          Interviewers: {slot.interviewers.map((i) => i.name).join(", ") || "None"}
                        </div>
                        {isBooked && slot.bookings[0] && (
                          <div className="text-xs font-medium text-purple-700 dark:text-purple-300 truncate">
                            Candidate: {slot.bookings[0].candidateName} ({slot.bookings[0].candidateEmail})
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Available draft slots on this day */}
            <div className="space-y-2">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available Slots to Publish</h5>
              {(draftsByDate.get(anchorDate) || []).length === 0 ? (
                <div className="text-center py-8 rounded-lg border border-dashed text-xs text-muted-foreground">
                  No interviewers available on this day based on their schedule. Click "Add Custom Slot" to create one manually.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(draftsByDate.get(anchorDate) || []).map((draft) => {
                    const isSelected = selectedDraftIds.has(draft.id)
                    const interviewerNames = draft.interviewerIds
                      .map((id) => interviewerMap.get(id) || "Interviewer")
                      .join(", ")

                    return (
                      <div
                        key={draft.id}
                        onClick={() => toggleDraftSelection(draft.id)}
                        className={cn(
                          "rounded-lg border border-dashed p-3 text-xs cursor-pointer transition-all flex flex-col gap-2 shadow-2xs",
                          isSelected
                            ? "bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500"
                            : "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-4 w-4 rounded-xs border flex items-center justify-center text-xs shrink-0",
                                isSelected
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "border-muted-foreground/60 bg-background"
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </span>
                            <span className="font-bold text-sm text-foreground whitespace-nowrap">
                              {formatTimeInZone(new Date(draft.startsAt), timeZone)} – {formatTimeInZone(new Date(draft.endsAt), timeZone)}
                            </span>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={publishing}
                            onClick={(e) => {
                              e.stopPropagation()
                              publishSingleDraft(draft)
                            }}
                            className="h-7 px-2.5 text-xs bg-background hover:bg-emerald-600 hover:text-white border-emerald-500/40 whitespace-nowrap"
                          >
                            Publish
                          </Button>
                        </div>

                        <div className="flex items-center justify-between text-muted-foreground text-xs gap-2">
                          <span className="truncate">👤 {interviewerNames}</span>
                          <span className="font-medium bg-muted px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                            {draft.capacity} candidate{draft.capacity === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Multi-Select Action Bar */}
        {selectedCount > 0 && (
          <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-background/95 backdrop-blur-md p-3 sm:p-4 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold shrink-0">
                {selectedCount}
              </span>
              <div>
                <p className="text-sm font-bold text-foreground whitespace-nowrap">
                  {selectedCount} slot{selectedCount === 1 ? "" : "s"} selected
                </p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  Room for {selectedCount * (preview?.config.groupSize || 1)} candidate
                  {selectedCount * (preview?.config.groupSize || 1) === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 text-xs whitespace-nowrap">
                Clear
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={publishing}
                onClick={publishSelected}
                className="h-8 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 whitespace-nowrap"
              >
                {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />}
                Publish {selectedCount} Selected Slot{selectedCount === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* ========================================================================= */}
      {/* DIALOG: CREATE SINGLE / CUSTOM SLOT                                       */}
      {/* ========================================================================= */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Create Single Interview Slot
            </DialogTitle>
            <DialogDescription>
              Add an individual slot for candidates to book. Interviewers will be assigned and notified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="slot-date">Date</Label>
              <Input
                id="slot-date"
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="slot-start">Start Time</Label>
                <Input
                  id="slot-start"
                  type="time"
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slot-end">End Time</Label>
                <Input
                  id="slot-end"
                  type="time"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Interviewer selection from pool */}
            <div className="space-y-1.5">
              <Label>Assigned Interviewers</Label>
              {preview?.interviewers && preview.interviewers.length > 0 ? (
                <div className="max-h-36 overflow-y-auto space-y-1 rounded-md border p-2">
                  {preview.interviewers.map((inv) => {
                    const checked = customInterviewers.includes(inv.id)
                    return (
                      <label
                        key={inv.id}
                        className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setCustomInterviewers((prev) => [...prev, inv.id])
                            else setCustomInterviewers((prev) => prev.filter((id) => id !== inv.id))
                          }}
                          className="rounded border-input text-primary focus:ring-primary"
                        />
                        <span className="font-medium text-foreground">{inv.name}</span>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No interviewers in round pool.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="slot-cap">Candidate Capacity</Label>
                <Input
                  id="slot-cap"
                  type="number"
                  min={1}
                  max={20}
                  value={customCapacity}
                  onChange={(e) => setCustomCapacity(Number(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slot-mode">Interview Mode</Label>
                <select
                  id="slot-mode"
                  value={customMode}
                  onChange={(e) => setCustomMode(e.target.value as "REMOTE" | "ONSITE")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="REMOTE">Remote</option>
                  <option value="ONSITE">Onsite</option>
                </select>
              </div>
            </div>

            {customMode === "REMOTE" ? (
              <div className="space-y-1.5">
                <Label htmlFor="slot-link">Meeting Link (optional)</Label>
                <Input
                  id="slot-link"
                  placeholder="https://meet.google.com/..."
                  value={customMeetingLink}
                  onChange={(e) => setCustomMeetingLink(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="slot-loc">Location (optional)</Label>
                <Input
                  id="slot-loc"
                  placeholder="Meeting Room 3B"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomDialogOpen(false)} disabled={creatingSingle}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomSlot} disabled={creatingSingle}>
              {creatingSingle && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
