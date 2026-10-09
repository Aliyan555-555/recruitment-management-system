"use client"

import Link from "next/link"
import { Clock, MapPin, Users, Video } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatInZone, formatTimeInZone, zoneLabel } from "@/lib/timezone"

export interface InterviewRowData {
  bookingId: string
  candidateName: string
  jobTitle: string
  stepName: string
  startsAt: string
  endsAt: string
  mode: "REMOTE" | "ONSITE" | null
  myStatus: "NOT_STARTED" | "DRAFT" | "SUBMITTED"
  panelSubmitted: number
  panelSize: number
}

const STATUS_LABEL: Record<InterviewRowData["myStatus"], { text: string; variant: "outline" | "secondary" | "default" }> = {
  NOT_STARTED: { text: "Scorecard pending", variant: "outline" },
  DRAFT: { text: "Draft saved", variant: "secondary" },
  SUBMITTED: { text: "Submitted", variant: "default" },
}

export function InterviewList({ items, timeZone, emptyText }: { items: InterviewRowData[]; timeZone: string; emptyText: string }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">{emptyText}</CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3">
      {items.map((i) => {
        const start = new Date(i.startsAt)
        const status = STATUS_LABEL[i.myStatus]
        return (
          <Link key={i.bookingId} href={`/interviewer/interviews/${i.bookingId}`} className="block">
            <Card className="transition-colors hover:border-primary">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">{i.candidateName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {i.stepName} · {i.jobTitle}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatInZone(start, timeZone, { weekday: "short", day: "2-digit", month: "short" })},{" "}
                      {formatTimeInZone(start, timeZone)} – {formatTimeInZone(new Date(i.endsAt), timeZone)} {zoneLabel(timeZone, start)}
                    </span>
                    <span className="flex items-center gap-1">
                      {i.mode === "REMOTE" ? <Video className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                      {i.mode === "REMOTE" ? "Online" : i.mode === "ONSITE" ? "Onsite" : "Interview"}
                    </span>
                    {i.panelSize > 1 && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {i.panelSubmitted}/{i.panelSize} scorecards in
                      </span>
                    )}
                  </p>
                </div>
                <Badge variant={status.variant}>{status.text}</Badge>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
