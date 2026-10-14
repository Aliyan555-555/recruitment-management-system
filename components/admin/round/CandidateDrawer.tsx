"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ExternalLink, Loader2, ThumbsDown, ThumbsUp, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatInZone, formatTimeInZone } from "@/lib/timezone"

interface Detail {
  candidate: { id: string; name: string; email: string; phone: string | null; education: string | null; lastRole: string | null }
  pipelineId: string
  scorecards: Array<{
    id: string
    by: string
    byAdmin: boolean
    submitted: boolean
    recommendation: string | null
    scorePercentage: number | null
    comments: string | null
  }>
  bookings: Array<{ id: string; status: string; startsAt: string; endsAt: string; cancelReason: string | null }>
}

const BOOKING_LABEL: Record<string, string> = {
  RESERVED: "Booked",
  COMPLETED: "Interview done",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
}

interface Props {
  jobId: string
  roundId: string
  stepType: string | null
  candidateId: string | null
  timeZone: string
  onClose: () => void
}

/** Side panel with everything about one candidate in this round: profile basics, bookings and every scorecard. */
export function CandidateDrawer({ jobId, roundId, stepType, candidateId, timeZone, onClose }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!candidateId) return
    setDetail(null)
    setError(null)
    fetch(`/api/admin/steps/${roundId}/candidates/${candidateId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || "Failed to load candidate")
        setDetail(await r.json())
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load candidate"))
  }, [candidateId, roundId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  if (!candidateId) return null
  const scoreHref =
    stepType === "FOCUS_GROUP"
      ? `/admin/jobs/${jobId}/rounds/${roundId}/candidates/${candidateId}/assessment/internal`
      : `/admin/jobs/${jobId}/rounds/${roundId}/candidates/${candidateId}/assessment`

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Candidate details">
      <button className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-background shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-background px-5 py-4">
          <h2 className="truncate text-lg font-semibold">{detail?.candidate.name ?? "Candidate"}</h2>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error ? (
          <p className="p-5 text-sm text-destructive">{error}</p>
        ) : !detail ? (
          <p className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : (
          <div className="space-y-6 p-5">
            <section className="space-y-1 text-sm">
              <p>{detail.candidate.email}</p>
              {detail.candidate.phone && <p className="text-muted-foreground">{detail.candidate.phone}</p>}
              {detail.candidate.education && <p className="text-muted-foreground">{detail.candidate.education}</p>}
              {detail.candidate.lastRole && <p className="text-muted-foreground">{detail.candidate.lastRole}</p>}
              <Link href={`/admin/candidates/${detail.candidate.id}`} className="inline-flex items-center gap-1 pt-1 text-primary underline">
                Full profile <ExternalLink className="h-3 w-3" />
              </Link>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Scorecards</h3>
              {detail.scorecards.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scorecards yet.</p>
              ) : (
                detail.scorecards.map((s) => (
                  <div key={s.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {s.by}
                        {s.byAdmin && <span className="ml-1 text-xs text-muted-foreground">(admin)</span>}
                      </span>
                      {!s.submitted ? (
                        <Badge variant="outline">Pending</Badge>
                      ) : s.recommendation === "HIRE" || s.recommendation === "STRONG_HIRE" ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <ThumbsUp className="h-3.5 w-3.5" /> Recommend
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-600">
                          <ThumbsDown className="h-3.5 w-3.5" /> Do not recommend
                        </span>
                      )}
                    </div>
                    {s.submitted && s.scorePercentage !== null && <p className="mt-1 text-muted-foreground">Score {s.scorePercentage}%</p>}
                    {s.comments && <p className="mt-2 whitespace-pre-wrap">{s.comments}</p>}
                  </div>
                ))
              )}
              {(stepType === "SCREENING_INTERVIEW" || stepType === "FOCUS_GROUP" || stepType === "FINAL_INTERVIEW") && (
                <Link href={scoreHref} className="inline-block text-xs text-muted-foreground underline">
                  Add a scorecard as admin
                </Link>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Interview history</h3>
              {detail.bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookings in this round.</p>
              ) : (
                detail.bookings.map((b) => (
                  <div key={b.id} className="flex items-start justify-between gap-2 text-sm">
                    <span>
                      {formatInZone(new Date(b.startsAt), timeZone, { weekday: "short", day: "2-digit", month: "short" })},{" "}
                      {formatTimeInZone(new Date(b.startsAt), timeZone)}
                      {b.cancelReason && <span className="block text-xs text-muted-foreground">{b.cancelReason}</span>}
                    </span>
                    <Badge variant={b.status === "RESERVED" ? "default" : "outline"}>{BOOKING_LABEL[b.status] ?? b.status}</Badge>
                  </div>
                ))
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  )
}
