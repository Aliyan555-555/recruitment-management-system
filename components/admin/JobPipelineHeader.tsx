"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

export interface PipelineStage {
  id: string
  label: string
  count: number
  href: string
  kind: "applications" | "round"
}

interface JobPipelineHeaderProps {
  jobTitle: string
  jobId: string
  stages: PipelineStage[]
  currentStageId?: string
  className?: string
}

export function JobPipelineHeader({
  jobTitle,
  jobId,
  stages,
  currentStageId,
  className,
}: JobPipelineHeaderProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 mb-6 shadow-sm",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/admin/jobs/${jobId}`}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to job
          </Link>
          <h2 className="text-lg font-semibold text-foreground mt-1">{jobTitle}</h2>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {stages.map((stage, index) => {
          const isActive = stage.id === currentStageId
          return (
            <div key={stage.id} className="flex items-center gap-2">
              {index > 0 && (
                <span className="text-muted-foreground/50 hidden sm:inline">→</span>
              )}
              <Link
                href={stage.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                <span>{stage.label}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    isActive ? "bg-primary/20" : "bg-muted"
                  )}
                >
                  {stage.count}
                </span>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
