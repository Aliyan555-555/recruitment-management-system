"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { isInterviewStepType } from "@/lib/workflow/step-config"

/**
 * Round navigation. Interview rounds: Candidates + Schedule. Offer round: Offers. Other rounds: Candidates.
 * (Needs Review lives on the job's Applicants page; In Round + Results were merged into Candidates.)
 */
export type RoundNavView = "candidates" | "schedule" | "offers"

interface RoundSubNavProps {
  jobId: string
  roundId: string
  stepType?: string | null
  activeView: RoundNavView
  /** optional badge counts */
  counts?: Partial<Record<RoundNavView, number>>
  className?: string
}

export function RoundSubNav({ jobId, roundId, stepType, activeView, counts = {}, className }: RoundSubNavProps) {
  const base = `/admin/jobs/${jobId}/rounds/${roundId}`
  const links: Array<{ view: RoundNavView; label: string; href: string }> =
    stepType === "OFFER"
      ? [{ view: "offers", label: "Offers", href: `${base}/offers` }]
      : isInterviewStepType(stepType)
        ? [
            { view: "candidates", label: "Candidates", href: `${base}/candidates` },
            { view: "schedule", label: "Schedule", href: `${base}/schedule` },
          ]
        : [{ view: "candidates", label: "Candidates", href: `${base}/candidates` }]

  if (links.length < 2) return <div className={cn("mb-2", className)} />

  return (
    <nav className={cn("mb-6 flex flex-wrap gap-2 border-b border-border pb-3", className)}>
      {links.map((link) => (
        <Link
          key={link.view}
          href={link.href}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeView === link.view
              ? "border border-primary/20 bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          {link.label}
          {counts[link.view] !== undefined && (
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", activeView === link.view ? "bg-primary/20" : "bg-muted")}>
              {counts[link.view]}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}
