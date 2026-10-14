"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, CircleDashed, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReadinessItem } from "@/lib/scheduling/round-readiness"

interface Props {
  jobId: string
  roundId: string
  /** change this value to re-check (e.g. after publishing slots) */
  refreshKey?: number
  onOpenSlots: () => void
  onAssignInterviewers?: () => void
}

const ICONS = {
  ok: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />,
  warn: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />,
  todo: <CircleDashed className="h-4 w-4 shrink-0 text-destructive" />,
}

export function RoundReadiness({ jobId, roundId, refreshKey, onOpenSlots, onAssignInterviewers }: Props) {
  const [data, setData] = useState<{ ready: boolean; items: ReadinessItem[] } | null>(null)
  const [reminding, setReminding] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/steps/${roundId}/readiness`)
      if (res.ok) setData(await res.json())
    } catch {
      // the checklist is a helper; the rest of the page still works without it
    }
  }, [roundId])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const remind = async (interviewerIds: string[]) => {
    setReminding(true)
    try {
      const res = await fetch(`/api/admin/steps/${roundId}/remind-availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewerIds }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || "Could not send reminders")
      if (body.sent > 0) toast.success(`Reminder sent to ${body.sent} interviewer${body.sent === 1 ? "" : "s"}`)
      else toast.info("Already reminded in the last 24 hours")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reminders")
    } finally {
      setReminding(false)
    }
  }

  if (!data) return null

  return (
    <Card className={cn(data.ready ? "border-emerald-500/40" : "border-amber-500/50")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {data.ready ? ICONS.ok : ICONS.warn}
          {data.ready ? "This round is ready. Candidates can book." : "Finish setting up this round"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.items.map((item) => (
          <div key={item.id} className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-start gap-2">
              {ICONS[item.status]}
              <span className={cn(item.status === "ok" && "text-muted-foreground")}>{item.title}</span>
            </span>
            {item.action && item.status !== "ok" && (
              <>
                {item.action.kind === "EDIT_JOB" && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/jobs/${jobId}/edit`}>{item.action.label}</Link>
                  </Button>
                )}
                {item.action.kind === "ASSIGN_INTERVIEWERS" && (
                  <Button size="sm" variant="outline" onClick={onAssignInterviewers}>
                    {item.action.label}
                  </Button>
                )}
                {item.action.kind === "PUBLISH" && (
                  <Button size="sm" variant="outline" onClick={onOpenSlots}>
                    {item.action.label}
                  </Button>
                )}
                {item.action.kind === "REMIND_AVAILABILITY" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reminding}
                    onClick={() => item.action?.kind === "REMIND_AVAILABILITY" && remind(item.action.interviewerIds)}
                  >
                    {reminding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {item.action.label}
                  </Button>
                )}
              </>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
