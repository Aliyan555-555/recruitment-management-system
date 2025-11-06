"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users, MapPin, Loader2 } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval, addDays, startOfDay, parseISO } from "date-fns"

interface InterviewSlot {
  id: string
  stepName: string
  startsAt: string
  endsAt: string
  interviewer: {
    id: string
    name: string
    email: string
  } | null
  job: {
    id: string
    title: string
    company: string
  } | null
  bookings: Array<{
    id: string
    candidate: {
      id: string
      name: string
      email: string
    }
    status: string
  }>
  meetingLink?: string
  interviewMode?: string
}

type ViewMode = "month" | "week" | "day"

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [slots, setSlots] = useState<InterviewSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === "month") {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
      }
    } else if (viewMode === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
      return {
        start: weekStart,
        end: weekEnd
      }
    } else {
      // day view
      return {
        start: startOfDay(currentDate),
        end: addDays(startOfDay(currentDate), 1)
      }
    }
  }, [currentDate, viewMode])

  useEffect(() => {
    fetchSlots()
  }, [dateRange])

  const fetchSlots = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/admin/calendar?startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || `Failed to fetch calendar data: ${response.statusText}`
        )
      }

      const data = await response.json()
      setSlots(data.slots || [])
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch calendar data"
      console.error("Error fetching calendar:", err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getSlotsForDate = (date: Date) => {
    return slots.filter((slot) => {
      const slotDate = parseISO(slot.startsAt)
      return isSameDay(slotDate, date)
    })
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) =>
      direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1)
    )
  }

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentDate((prev) => addDays(prev, direction === "prev" ? -7 : 7))
  }

  const navigateDay = (direction: "prev" | "next") => {
    setCurrentDate((prev) => addDays(prev, direction === "prev" ? -1 : 1))
  }

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    const weeks = eachWeekOfInterval(
      { start: calendarStart, end: calendarEnd },
      { weekStartsOn: 1 }
    )

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Weekday headers */}
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-semibold text-muted-foreground">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day) => {
          const daySlots = getSlotsForDate(day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isToday = isSameDay(day, new Date())

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[100px] border rounded-lg p-2 ${
                isCurrentMonth ? "bg-card" : "bg-muted/30"
              } ${isToday ? "ring-2 ring-primary" : ""}`}
            >
              <div
                className={`text-sm font-medium mb-1 ${
                  isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                } ${isToday ? "text-primary font-bold" : ""}`}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[80px]">
                {daySlots.slice(0, 3).map((slot) => (
                  <div
                    key={slot.id}
                    className="text-xs p-1 bg-primary/10 rounded text-primary cursor-pointer hover:bg-primary/20 transition-colors"
                    title={`${slot.stepName} - ${slot.interviewer?.name || "No interviewer"} - ${slot.bookings.length} candidates`}
                  >
                    <div className="font-medium truncate">{format(parseISO(slot.startsAt), "HH:mm")}</div>
                    <div className="truncate text-[10px]">{slot.stepName}</div>
                  </div>
                ))}
                {daySlots.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{daySlots.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    const hours = Array.from({ length: 24 }, (_, i) => i)

    return (
      <div className="overflow-x-auto">
        <div className="grid grid-cols-8 gap-1 min-w-[800px]">
          {/* Time column header */}
          <div className="sticky left-0 bg-background z-10 p-2 border-r font-semibold text-sm">
            Time
          </div>

          {/* Day headers */}
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`p-2 text-center border-b ${
                isSameDay(day, new Date()) ? "bg-primary/10" : ""
              }`}
            >
              <div className="text-sm font-semibold">{format(day, "EEE")}</div>
              <div className={`text-lg ${isSameDay(day, new Date()) ? "text-primary font-bold" : ""}`}>
                {format(day, "d")}
              </div>
            </div>
          ))}

          {/* Time slots */}
          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="sticky left-0 bg-background z-10 p-1 text-xs text-muted-foreground border-r text-right pr-2">
                {format(new Date().setHours(hour, 0, 0, 0), "HH:mm")}
              </div>
              {days.map((day) => {
                const daySlots = getSlotsForDate(day).filter((slot) => {
                  const slotHour = parseISO(slot.startsAt).getHours()
                  return slotHour === hour
                })

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="min-h-[60px] border-b border-r p-1"
                  >
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="text-xs p-1 bg-primary/10 rounded mb-1 cursor-pointer hover:bg-primary/20 transition-colors"
                      >
                        <div className="font-medium">{format(parseISO(slot.startsAt), "HH:mm")}</div>
                        <div className="truncate">{slot.stepName}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {slot.interviewer?.name || "No interviewer"}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderDayView = () => {
    const daySlots = getSlotsForDate(currentDate)
    const hours = Array.from({ length: 24 }, (_, i) => i)

    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          {hours.map((hour) => {
            const hourSlots = daySlots.filter((slot) => {
              const slotHour = parseISO(slot.startsAt).getHours()
              return slotHour === hour
            })

            if (hourSlots.length === 0) return null

            return (
              <div key={hour} className="space-y-2">
                <div className="text-sm font-semibold text-muted-foreground">
                  {format(new Date().setHours(hour, 0, 0, 0), "HH:mm")}
                </div>
                {hourSlots.map((slot) => (
                  <Card key={slot.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{slot.stepName}</CardTitle>
                        <Badge variant="secondary">
                          {format(parseISO(slot.startsAt), "HH:mm")} - {format(parseISO(slot.endsAt), "HH:mm")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {slot.job && (
                        <div>
                          <p className="text-sm font-medium">{slot.job.title}</p>
                          <p className="text-xs text-muted-foreground">{slot.job.company}</p>
                        </div>
                      )}
                      {slot.interviewer && (
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{slot.interviewer.name}</span>
                        </div>
                      )}
                      {slot.bookings.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Candidates:</p>
                          {slot.bookings.map((booking) => (
                            <div key={booking.id} className="text-sm">
                              {booking.candidate.name}
                            </div>
                          ))}
                        </div>
                      )}
                      {slot.meetingLink && (
                        <Button variant="outline" size="sm" className="w-full" asChild>
                          <a href={slot.meetingLink} target="_blank" rel="noopener noreferrer">
                            Join Meeting
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Interview Calendar</CardTitle>
            <CardDescription>View all scheduled interviews</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewMode === "month") navigateMonth("prev")
                else if (viewMode === "week") navigateWeek("prev")
                else navigateDay("prev")
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewMode === "month") navigateMonth("next")
                else if (viewMode === "week") navigateWeek("next")
                else navigateDay("next")
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-sm font-medium">
          {viewMode === "month" && format(currentDate, "MMMM yyyy")}
          {viewMode === "week" &&
            `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d")} - ${format(
              endOfWeek(currentDate, { weekStartsOn: 1 }),
              "MMM d, yyyy"
            )}`}
          {viewMode === "day" && format(currentDate, "EEEE, MMMM d, yyyy")}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchSlots} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="overflow-auto">
            {viewMode === "month" && renderMonthView()}
            {viewMode === "week" && renderWeekView()}
            {viewMode === "day" && renderDayView()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

