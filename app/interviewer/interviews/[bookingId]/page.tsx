"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, MapPin, Users, Video } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Scorecard } from "@/components/interviewer/Scorecard"
import { formatInZone, formatTimeInZone, zoneLabel } from "@/lib/timezone"

interface Detail {
  timeZone: string
  booking: { id: string; status: string; startsAt: string; endsAt: string; mode: "REMOTE" | "ONSITE" | null; meetingLink: string | null; location: string | null }
  round: { name: string; type: string | null; notesForInterviewers: string | null; formKind: "SKILLS" | "PANEL" }
  job: { title: string; company: string }
  candidate: {
    name: string
    email: string
    phone: string | null
    education: string | null
    institution: string | null
    lastEmployer: string | null
    lastRole: string | null
    expectedSalary: string | null
    noticePeriod: string | null
  }
  panel: Array<{ id: string; name: string; isMe: boolean; submitted: boolean }>
  behaviors: any[] | null
  evaluation: { formData: any; submittedAt: string | null; score: number | null } | null
  canEvaluate: boolean
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

export default function InterviewDetailPage() {
  const { bookingId } = useParams() as { bookingId: string }
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/interviewer/interviews/${bookingId}`)
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to load interview")
      setDetail(await res.json())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load interview")
    }
  }, [bookingId])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/interviewer/interviews" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to interviews
        </Link>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }
  if (!detail) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const tz = detail.timeZone
  const start = new Date(detail.booking.startsAt)
  const submitted = !!detail.evaluation?.submittedAt
  const c = detail.candidate
  const cancelled = detail.booking.status === "CANCELLED" || detail.booking.status === "NO_SHOW"

  return (
    <div className="space-y-6">
      <Link href="/interviewer/interviews" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to interviews
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{c.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {detail.round.name} · {detail.job.title}, {detail.job.company}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">When and where</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              {formatInZone(start, tz, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              <br />
              {formatTimeInZone(start, tz)} – {formatTimeInZone(new Date(detail.booking.endsAt), tz)} ({zoneLabel(tz, start)})
            </p>
            {detail.booking.mode === "REMOTE" && (
              <p className="flex items-center gap-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                {detail.booking.meetingLink ? (
                  <a className="text-primary underline" href={detail.booking.meetingLink} target="_blank" rel="noreferrer">
                    Join meeting <ExternalLink className="inline h-3 w-3" />
                  </a>
                ) : (
                  "Online"
                )}
              </p>
            )}
            {detail.booking.mode === "ONSITE" && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {detail.booking.location ?? "Onsite"}
              </p>
            )}
            {cancelled && <Badge variant="destructive">This interview is {detail.booking.status === "NO_SHOW" ? "marked as a no-show" : "cancelled"}</Badge>}
            {detail.panel.length > 1 && (
              <div className="space-y-1 border-t pt-3">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> Panel
                </p>
                {detail.panel.map((p) => (
                  <p key={p.id} className="flex items-center justify-between">
                    <span>
                      {p.name}
                      {p.isMe && " (you)"}
                    </span>
                    {p.submitted ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Submitted
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidate</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3">
              <Fact label="Email" value={c.email} />
              <Fact label="Phone" value={c.phone} />
              <Fact label="Education" value={c.education} />
              <Fact label="Institution" value={c.institution} />
              <Fact label="Last employer" value={c.lastEmployer} />
              <Fact label="Last role" value={c.lastRole} />
              <Fact label="Expected salary" value={c.expectedSalary} />
              <Fact label="Notice period" value={c.noticePeriod} />
            </dl>
          </CardContent>
        </Card>
      </div>

      {detail.round.notesForInterviewers && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes for interviewers</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">{detail.round.notesForInterviewers}</CardContent>
        </Card>
      )}

      {!cancelled && (
        <Scorecard
          bookingId={detail.booking.id}
          kind={detail.round.formKind}
          behaviors={detail.behaviors}
          initial={detail.evaluation?.formData ?? null}
          submitted={submitted}
          canEvaluate={detail.canEvaluate}
          onSubmitted={load}
        />
      )}
    </div>
  )
}
