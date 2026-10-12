"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarCheck, CalendarClock, Clock, Gift, Hourglass, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatInZone, formatTimeInZone, zoneLabel } from "@/lib/timezone"
import type { NextStep, NextStepKind } from "@/lib/scheduling/candidate-next-step"

export interface NextStepsData {
  timeZone: string
  steps: NextStep[]
  primary: NextStep | null
}

const STYLE: Partial<Record<NextStepKind, { icon: typeof Clock; tone: string }>> = {
  RESPOND_TO_OFFER: { icon: Gift, tone: "border-emerald-500/50 bg-emerald-500/10" },
  BOOK_INTERVIEW: { icon: CalendarClock, tone: "border-primary/40 bg-primary/5" },
  INTERVIEW_SOON: { icon: CalendarCheck, tone: "border-emerald-500/50 bg-emerald-500/10" },
  INTERVIEW_BOOKED: { icon: CalendarCheck, tone: "border-border bg-card" },
  SLOTS_OPENING_SOON: { icon: Clock, tone: "border-border bg-card" },
  AWAITING_RESULT: { icon: Hourglass, tone: "border-border bg-card" },
  IN_REVIEW: { icon: Search, tone: "border-border bg-card" },
}

/** Formats a booked interview time like "Tue 13 Oct, 10:00 PKT". */
export function formatStepTime(step: NextStep, timeZone: string): string | null {
  if (!step.startsAt) return null
  const d = new Date(step.startsAt)
  return `${formatInZone(d, timeZone, { weekday: "short", day: "2-digit", month: "short" })}, ${formatTimeInZone(d, timeZone)} ${zoneLabel(timeZone, d)}`
}

/** Fetches the candidate's next steps once; returns null while loading or on error. */
export function useNextSteps(enabled = true): NextStepsData | null {
  const [data, setData] = useState<NextStepsData | null>(null)
  useEffect(() => {
    if (!enabled) return
    fetch("/api/candidate/next-steps")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
  }, [enabled])
  return data
}

/** One line + one button: the most urgent thing the candidate should do. */
export function NextStepBanner({ data, className }: { data: NextStepsData | null; className?: string }) {
  const step = data?.primary
  if (!data || !step) return null
  const style = STYLE[step.kind] ?? { icon: Clock, tone: "border-border bg-card" }
  const Icon = style.icon
  const when = formatStepTime(step, data.timeZone)

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between", style.tone, className)}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="font-semibold text-foreground">{step.title}</p>
          {(when || step.detail) && <p className="text-sm text-muted-foreground">{when ?? step.detail}</p>}
        </div>
      </div>
      {step.cta &&
        (step.cta.href.startsWith("http") ? (
          <Button asChild>
            <a href={step.cta.href} target="_blank" rel="noreferrer">
              {step.cta.label}
            </a>
          </Button>
        ) : (
          <Button asChild>
            <Link href={step.cta.href}>{step.cta.label}</Link>
          </Button>
        ))}
    </div>
  )
}

const CHIP: Record<NextStepKind, { text: string; tone: string }> = {
  RESPOND_TO_OFFER: { text: "Offer received", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  BOOK_INTERVIEW: { text: "Book your interview", tone: "bg-primary/15 text-primary" },
  INTERVIEW_SOON: { text: "Interview soon", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  INTERVIEW_BOOKED: { text: "Interview booked", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  SLOTS_OPENING_SOON: { text: "Interview times open soon", tone: "bg-muted text-muted-foreground" },
  AWAITING_RESULT: { text: "Waiting for result", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  IN_REVIEW: { text: "In review", tone: "bg-muted text-muted-foreground" },
  OFFER_ACCEPTED: { text: "Offer accepted", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  CLOSED: { text: "Closed", tone: "bg-muted text-muted-foreground" },
}

/** Small status chip for one application in a list. */
export function NextStepChip({ step }: { step: NextStep | undefined }) {
  if (!step) return null
  const chip = CHIP[step.kind]
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", chip.tone)}>{chip.text}</span>
}
