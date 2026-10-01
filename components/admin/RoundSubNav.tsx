"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

export type RoundNavView = "applied" | "shortlisted" | "results" | "offers"

interface RoundSubNavProps {
  jobId: string
  roundId: string
  stepType?: string | null
  activeView: RoundNavView
  counts: {
    pending: number
    shortlisted: number
  }
  className?: string
}

export function RoundSubNav({
  jobId,
  roundId,
  stepType,
  activeView,
  counts,
  className,
}: RoundSubNavProps) {
  const base = `/admin/jobs/${jobId}/rounds/${roundId}`
  const isOffer = stepType === "OFFER"

  const links: Array<{ view: RoundNavView; label: string; href: string; count?: number }> = [
    {
      view: "applied",
      label: "Needs Review",
      href: `${base}/applied`,
      count: counts.pending,
    },
    {
      view: "shortlisted",
      label: isOffer ? "In Round" : "In Round",
      href: `${base}/shortlisted`,
      count: counts.shortlisted,
    },
    {
      view: isOffer ? "offers" : "results",
      label: isOffer ? "Offers" : "Results",
      href: isOffer ? `${base}/offers` : `${base}/results`,
    },
  ]

  return (
    <nav
      className={cn(
        "flex flex-wrap gap-2 border-b border-border pb-3 mb-6",
        className
      )}
    >
      {links.map((link) => (
        <Link
          key={link.view}
          href={link.href}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
            activeView === link.view
              ? "bg-primary/10 text-primary border border-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {link.label}
          {link.count !== undefined && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                activeView === link.view ? "bg-primary/20" : "bg-muted"
              )}
            >
              {link.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}
