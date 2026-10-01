"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

export type QueueEmptyVariant = "no-applicants" | "queue-complete" | "search-miss" | "round-empty" | "no-ai-run"

interface QueueEmptyStateProps {
  variant: QueueEmptyVariant
  searchTerm?: string
  queueLabel?: string
  counts?: {
    shortlisted?: number
    rejected?: number
    remaining?: number
    inRound?: number
  }
  actions?: Array<{
    label: string
    href?: string
    onClick?: () => void
  }>
  className?: string
}

export function QueueEmptyState({
  variant,
  searchTerm,
  queueLabel = "Needs Review",
  counts,
  actions = [],
  className,
}: QueueEmptyStateProps) {
  if (variant === "search-miss") {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-3 py-12 px-6 text-center bg-card rounded-lg border border-border",
          className
        )}
      >
        <svg
          className="w-16 h-16 text-muted-foreground/30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p className="text-lg font-medium text-foreground">
          No matches for &ldquo;{searchTerm}&rdquo; in {queueLabel}
        </p>
        <p className="text-sm text-muted-foreground">
          Try a different search term or clear the search to see all candidates in this queue.
        </p>
        {actions.map((action) =>
          action.href ? (
            <Link
              key={action.label}
              href={action.href}
              className="mt-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20"
            >
              {action.label}
            </Link>
          ) : (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="mt-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20"
            >
              {action.label}
            </button>
          )
        )}
      </div>
    )
  }

  if (variant === "round-empty") {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-3 py-12 px-6 text-center bg-card rounded-lg border border-border",
          className
        )}
      >
        <p className="text-lg font-medium text-foreground">
          No one shortlisted into this round yet
        </p>
        <p className="text-sm text-muted-foreground">
          Shortlist candidates from Needs Review to begin assessments in this round.
        </p>
        {actions.map((action) =>
          action.href ? (
            <Link
              key={action.label}
              href={action.href}
              className="mt-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20"
            >
              {action.label}
            </Link>
          ) : null
        )}
      </div>
    )
  }

  if (variant === "no-ai-run") {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-4 py-12 px-6 text-center bg-card rounded-xl border border-border max-w-2xl mx-auto shadow-sm",
          className
        )}
      >
        <div className="w-16 h-16 bg-purple-500/10 text-purple-600 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">No AI Shortlisting Evaluations Yet</p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Evaluate all applicant profiles against this job&apos;s required skills, education, experience,
            and custom success criteria using AI. All evaluation runs are saved for auditability and do
            not alter existing candidate pipeline states.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {actions.map((action) =>
            action.href ? (
              <Link
                key={action.label}
                href={action.href}
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                {action.label}
              </button>
            )
          )}
        </div>
      </div>
    )
  }

  if (variant === "no-applicants") {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-3 py-12 px-6 text-center bg-card rounded-lg border border-border",
          className
        )}
      >
        <svg
          className="w-16 h-16 text-muted-foreground/30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <p className="text-lg font-medium text-foreground">No one has applied to this job yet</p>
        <p className="text-sm text-muted-foreground">
          Candidates will appear here once they submit an application.
        </p>
        {actions.map((action) =>
          action.href ? (
            <Link
              key={action.label}
              href={action.href}
              className="mt-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20"
            >
              {action.label}
            </Link>
          ) : null
        )}
      </div>
    )
  }

  const shortlisted = counts?.shortlisted ?? 0
  const rejected = counts?.rejected ?? 0
  const inRound = counts?.inRound ?? shortlisted
  const remaining = counts?.remaining ?? 0

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 py-12 px-6 text-center bg-card rounded-lg border border-emerald-500/20",
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-emerald-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">
          All candidates in this step have been reviewed
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {inRound > 0 && <span className="text-emerald-600 font-medium">{inRound} in round</span>}
          {inRound > 0 && rejected > 0 && <span className="mx-2">·</span>}
          {shortlisted > 0 && inRound === 0 && (
            <span className="text-emerald-600 font-medium">{shortlisted} shortlisted</span>
          )}
          {shortlisted > 0 && rejected > 0 && inRound === 0 && (
            <span className="mx-2">·</span>
          )}
          {rejected > 0 && (
            <span className="text-destructive font-medium">{rejected} rejected</span>
          )}
          {(inRound > 0 || shortlisted > 0 || rejected > 0) && (
            <span className="mx-2">·</span>
          )}
          <span>{remaining} remaining in {queueLabel.toLowerCase()}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        {actions.map((action) =>
          action.href ? (
            <Link
              key={action.label}
              href={action.href}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90"
            >
              {action.label}
            </Link>
          ) : (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90"
            >
              {action.label}
            </button>
          )
        )}
      </div>
    </div>
  )
}
