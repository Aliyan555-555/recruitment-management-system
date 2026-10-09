"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarClock, ClipboardCheck, Loader2, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { InterviewList, type InterviewRowData } from "@/components/interviewer/InterviewList"

interface Dashboard {
  timeZone: string
  counts: { today: number; upcoming: number; needsFeedback: number }
  next: InterviewRowData[]
  needsFeedback: InterviewRowData[]
}

export default function InterviewerDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/interviewer/dashboard")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to load dashboard")
        setData(await res.json())
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
  }, [])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!data) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const stats = [
    { label: "Today", value: data.counts.today, icon: Sun },
    { label: "Upcoming", value: data.counts.upcoming, icon: CalendarClock },
    { label: "Scorecards pending", value: data.counts.needsFeedback, icon: ClipboardCheck, highlight: data.counts.needsFeedback > 0 },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your interviews at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className={s.highlight ? "border-amber-500/60" : undefined}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-bold">{s.value}</p>
              </div>
              <s.icon className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {data.needsFeedback.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Scorecards waiting for you</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/interviewer/interviews">View all</Link>
            </Button>
          </div>
          <InterviewList items={data.needsFeedback} timeZone={data.timeZone} emptyText="" />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Next interviews</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/interviewer/availability">Update availability</Link>
          </Button>
        </div>
        <InterviewList items={data.next} timeZone={data.timeZone} emptyText="No interviews booked yet. Set your availability so admins can open slots." />
      </section>
    </div>
  )
}
