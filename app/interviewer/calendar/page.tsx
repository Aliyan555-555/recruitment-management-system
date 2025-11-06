"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users, Loader2 } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval, addDays, startOfDay, parseISO } from "date-fns"

interface InterviewSlot {
  id: string
  startsAt: string
  endsAt: string
  stepName: string
  bookings: Array<{
    id: string
    candidateName: string
    candidateEmail: string
  }>
}

type ViewMode = "month" | "week" | "day"

export default function InterviewerCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [slots, setSlots] = useState<InterviewSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === "month") {
      return {
        start: startOfWeek(startOfMonth(currentDate)),
        end: endOfWeek(endOfMonth(currentDate))
      }
    } else if (viewMode === "week") {
      return {
        start: startOfWeek(currentDate),
        end: endOfWeek(currentDate)
      }
    } else {
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
      
      const startDate = format(dateRange.start, "yyyy-MM-dd")
      const endDate = format(dateRange.end, "yyyy-MM-dd")
      
      const response = await fetch(`/api/interviewer/calendar?start=${startDate}&end=${endDate}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch calendar data")
      }
      
      const data = await response.json()
      setSlots(data.slots || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar")
      console.error("Error fetching slots:", err)
    } finally {
      setLoading(false)
    }
  }

  const getSlotsForDay = (date: Date) => {
    return slots.filter(slot => {
      const slotDate = parseISO(slot.startsAt)
      return isSameDay(slotDate, date)
    })
  }

  const monthDays = useMemo(() => {
    const weeks = eachWeekOfInterval(
      { start: dateRange.start, end: dateRange.end },
      { weekStartsOn: 1 }
    )
    
    return weeks.map(weekStart => {
      return eachDayOfInterval({
        start: weekStart,
        end: addDays(weekStart, 6)
      })
    })
  }, [dateRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Calendar</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchSlots} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
        <p className="text-muted-foreground mt-2">
          View and manage your interview schedule
        </p>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Interview Schedule</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
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
                size="icon"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            {format(currentDate, "MMMM yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {viewMode === "month" && (
            <div className="space-y-2">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="space-y-1">
                {monthDays.map((week, weekIdx) => (
                  <div key={weekIdx} className="grid grid-cols-7 gap-1">
                    {week.map(day => {
                      const daySlots = getSlotsForDay(day)
                      const isCurrentMonth = isSameMonth(day, currentDate)
                      const isToday = isSameDay(day, new Date())
                      
                      return (
                        <div
                          key={day.toISOString()}
                          className={`min-h-[100px] p-2 border rounded-lg ${
                            isCurrentMonth ? "bg-white" : "bg-gray-50"
                          } ${isToday ? "ring-2 ring-purple-500" : ""}`}
                        >
                          <div className={`text-sm font-medium mb-1 ${
                            isToday ? "text-purple-700" : isCurrentMonth ? "text-gray-900" : "text-gray-400"
                          }`}>
                            {format(day, "d")}
                          </div>
                          <div className="space-y-1">
                            {daySlots.slice(0, 3).map(slot => (
                              <div
                                key={slot.id}
                                className="text-xs p-1 bg-purple-100 text-purple-800 rounded truncate"
                                title={`${format(parseISO(slot.startsAt), "HH:mm")} - ${slot.stepName}`}
                              >
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(parseISO(slot.startsAt), "HH:mm")}
                                </div>
                                <div className="truncate">{slot.stepName}</div>
                                {slot.bookings.length > 0 && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Users className="h-3 w-3" />
                                    <span>{slot.bookings.length} booking{slot.bookings.length > 1 ? 's' : ''}</span>
                                  </div>
                                )}
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
                ))}
              </div>
            </div>
          )}

          {viewMode === "week" && (
            <div className="space-y-4">
              {eachDayOfInterval({ start: dateRange.start, end: dateRange.end }).map(day => {
                const daySlots = getSlotsForDay(day)
                const isToday = isSameDay(day, new Date())
                
                return (
                  <div key={day.toISOString()} className="space-y-2">
                    <div className={`flex items-center gap-2 ${isToday ? "font-bold" : ""}`}>
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{format(day, "EEEE, MMMM d")}</span>
                      {isToday && <Badge variant="secondary">Today</Badge>}
                    </div>
                    <div className="space-y-2 pl-6">
                      {daySlots.length > 0 ? (
                        daySlots.map(slot => (
                          <Card key={slot.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {format(parseISO(slot.startsAt), "HH:mm")} - {format(parseISO(slot.endsAt), "HH:mm")}
                                  </span>
                                </div>
                                <p className="text-sm font-medium mb-1">{slot.stepName}</p>
                                {slot.bookings.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Candidates:</p>
                                    {slot.bookings.map(booking => (
                                      <div key={booking.id} className="flex items-center gap-2">
                                        <Users className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-sm">{booking.candidateName}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No interviews scheduled</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {viewMode === "day" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-lg font-semibold">{format(currentDate, "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="space-y-3">
                {getSlotsForDay(currentDate).length > 0 ? (
                  getSlotsForDay(currentDate).map(slot => (
                    <Card key={slot.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(parseISO(slot.startsAt), "HH:mm")} - {format(parseISO(slot.endsAt), "HH:mm")}
                            </span>
                          </div>
                          <p className="text-sm font-medium mb-2">{slot.stepName}</p>
                          {slot.bookings.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Candidates:</p>
                              {slot.bookings.map(booking => (
                                <div key={booking.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm font-medium">{booking.candidateName}</p>
                                    <p className="text-xs text-muted-foreground">{booking.candidateEmail}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No interviews scheduled for this day</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

