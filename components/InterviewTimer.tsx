"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { formatPKTDateTime, formatPKTTime, nowPKT, formatTimeRemaining } from "@/lib/timezone"

interface InterviewTimerProps {
  slotStartTime: Date | string // ISO string or Date object
  slotEndTime?: Date | string
  stepName?: string
  candidateName?: string // For interviewer view
  meetingLink?: string
  className?: string
}

export function InterviewTimer({
  slotStartTime,
  slotEndTime,
  stepName,
  candidateName,
  meetingLink,
  className = ""
}: InterviewTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number
    minutes: number
    seconds: number
    total: number // Total milliseconds
  } | null>(null)

  useEffect(() => {
    const startTime = typeof slotStartTime === 'string' ? new Date(slotStartTime) : slotStartTime
    
    const calculateTimeRemaining = () => {
      const now = nowPKT()
      const diff = startTime.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, total: 0 })
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeRemaining({ hours, minutes, seconds, total: diff })
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [slotStartTime])

  if (!timeRemaining) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center text-gray-500">Calculating time...</div>
      </Card>
    )
  }

  const startTime = typeof slotStartTime === 'string' ? new Date(slotStartTime) : slotStartTime
  const endTime = slotEndTime ? (typeof slotEndTime === 'string' ? new Date(slotEndTime) : slotEndTime) : null

  // Determine color state
  const totalMinutes = Math.floor(timeRemaining.total / (1000 * 60))
  let colorClass = "bg-green-50 border-green-200 text-green-900"
  let urgencyLevel = "normal"

  if (totalMinutes <= 30 && totalMinutes > 15) {
    colorClass = "bg-yellow-50 border-yellow-200 text-yellow-900"
    urgencyLevel = "warning"
  } else if (totalMinutes <= 15 && totalMinutes > 0) {
    colorClass = "bg-red-50 border-red-200 text-red-900"
    urgencyLevel = "urgent"
  } else if (totalMinutes <= 0) {
    colorClass = "bg-gray-50 border-gray-200 text-gray-900"
    urgencyLevel = "started"
  }


  return (
    <Card className={`p-6 ${colorClass} ${className}`}>
      <div className="text-center">
        {urgencyLevel === "started" ? (
          <div>
            <div className="text-2xl font-bold mb-2">Interview Time Started</div>
            <div className="text-lg">
              {formatPKTDateTime(startTime)}
            </div>
          </div>
        ) : (
          <div>
            <div className="text-sm font-medium mb-2 opacity-75">Time Until Interview</div>
            <div className={`text-4xl font-bold mb-2 ${urgencyLevel === "urgent" ? "animate-pulse" : ""}`}>
              {formatTimeRemaining(timeRemaining.total)}
            </div>
            <div className="text-sm opacity-75">
              Interview on {formatPKTDateTime(startTime)}
              {endTime && ` - ${formatPKTTime(endTime)}`}
            </div>
          </div>
        )}

        {stepName && (
          <div className="mt-3 text-sm font-medium">
            Step: {stepName}
          </div>
        )}

        {candidateName && (
          <div className="mt-2 text-sm">
            Candidate: {candidateName}
          </div>
        )}

        {meetingLink && urgencyLevel === "started" && (
          <div className="mt-4">
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Join Meeting
            </a>
          </div>
        )}

        {meetingLink && urgencyLevel !== "started" && (
          <div className="mt-3">
            <a
              href={meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              View Meeting Link
            </a>
          </div>
        )}
      </div>
    </Card>
  )
}

