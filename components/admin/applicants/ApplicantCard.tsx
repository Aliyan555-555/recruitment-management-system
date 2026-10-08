"use client"

import { forwardRef } from "react"
import { Briefcase, GraduationCap, StickyNote, BadgeCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ApplicantRow } from "@/lib/admin/applicant-serializers"
import { AiRecBadge, initials, ScorePill } from "./badges"

interface Props {
  applicant: ApplicantRow
  selected: boolean
  checked: boolean
  checkable: boolean
  onSelect: () => void
  onCheck: (checked: boolean) => void
  reasons?: string[]
}

/** Compact list card: enough CV info to triage without opening the profile. */
export const ApplicantCard = forwardRef<HTMLDivElement, Props>(function ApplicantCard(
  { applicant: a, selected, checked, checkable, onSelect, onCheck, reasons },
  ref
) {
  const meta = [a.age != null ? `${a.age} yrs` : null, a.city].filter(Boolean).join(" · ")
  return (
    <div
      ref={ref}
      role="option"
      aria-selected={selected}
      tabIndex={-1}
      onClick={onSelect}
      className={cn(
        "group relative flex gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card hover:bg-muted/40"
      )}
    >
      {checkable && (
        <input
          type="checkbox"
          aria-label={`Select ${a.name}`}
          checked={checked}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onCheck(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300"
        />
      )}
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
        {a.avatar ? <img src={a.avatar} alt="" className="h-full w-full object-cover" /> : initials(a.name)}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-sm text-foreground">{a.name}</p>
            {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {a.hasNote && <StickyNote className="h-3.5 w-3.5 text-amber-500" aria-label="Has note" />}
            <ScorePill score={a.ai?.status === "COMPLETED" ? a.ai.overallScore : null} />
          </div>
        </div>
        {a.latestRole && (
          <p className="flex items-center gap-1.5 truncate text-xs text-foreground/80">
            <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {a.latestRole.title}
              {a.latestRole.company ? ` · ${a.latestRole.company}` : ""}
              {a.experienceYears != null ? ` · ${a.experienceYears} yrs exp` : ""}
            </span>
          </p>
        )}
        <p className="flex items-center gap-1.5 truncate text-xs text-foreground/80">
          <GraduationCap className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {a.highestEducation
              ? `${a.highestEducation.degree}${a.highestEducation.institute ? ` · ${a.highestEducation.institute}` : ""}`
              : "No education listed"}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {a.ai?.status === "COMPLETED" && <AiRecBadge rec={a.ai.recommendation} />}
          {a.quickTestScore != null && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              Quick test {a.quickTestScore}%
            </span>
          )}
          {a.topSkills.slice(0, 3).map((s) => (
            <span key={s.name} className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {s.verified && <BadgeCheck className="h-3 w-3 text-emerald-600" />}
              {s.name}
            </span>
          ))}
        </div>
        {reasons && reasons.length > 0 && <p className="text-xs text-rose-600 dark:text-rose-400">{reasons.join("; ")}</p>}
      </div>
    </div>
  )
})
