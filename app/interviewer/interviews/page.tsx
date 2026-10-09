"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { InterviewList, type InterviewRowData } from "@/components/interviewer/InterviewList"
import { cn } from "@/lib/utils"

type Tab = "upcoming" | "needs-feedback" | "completed"

const TABS: Array<{ id: Tab; label: string; empty: string }> = [
  { id: "upcoming", label: "Upcoming", empty: "No upcoming interviews. Make sure your availability is up to date." },
  { id: "needs-feedback", label: "Needs feedback", empty: "You are all caught up. No scorecards are waiting." },
  { id: "completed", label: "Completed", empty: "Submitted scorecards will appear here." },
]

export default function InterviewsPage() {
  const [tab, setTab] = useState<Tab>("upcoming")
  const [data, setData] = useState<{ timeZone: string; interviews: InterviewRowData[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (which: Tab) => {
    setData(null)
    setError(null)
    try {
      const res = await fetch(`/api/interviewer/interviews?tab=${which}`)
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to load interviews")
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load interviews")
    }
  }, [])

  useEffect(() => {
    load(tab)
  }, [tab, load])

  const current = TABS.find((t) => t.id === tab)!

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My interviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">Interviews candidates have booked with you.</p>
      </div>

      <div className="flex gap-1 rounded-lg border p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !data ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <InterviewList items={data.interviews} timeZone={data.timeZone} emptyText={current.empty} />
      )}
    </div>
  )
}
