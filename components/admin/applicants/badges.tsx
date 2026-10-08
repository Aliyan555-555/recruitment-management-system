import { cn } from "@/lib/utils"

export const REC_LABEL: Record<string, string> = {
  SHORTLIST: "Recommended",
  MAYBE: "Consider",
  REJECT: "Not recommended",
}

const REC_CLASS: Record<string, string> = {
  SHORTLIST: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  MAYBE: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  REJECT: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
}

export function AiRecBadge({ rec, className }: { rec: string | null | undefined; className?: string }) {
  if (!rec) return null
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", REC_CLASS[rec], className)}>
      {REC_LABEL[rec] ?? rec}
    </span>
  )
}

export function scoreTone(score: number) {
  if (score >= 70) return "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
  if (score >= 50) return "text-sky-700 dark:text-sky-400 bg-sky-500/10 border-sky-500/30"
  if (score >= 35) return "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30"
  return "text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30"
}

export function ScorePill({ score, className }: { score: number | null | undefined; className?: string }) {
  if (score == null) return null
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-xs font-bold tabular-nums", scoreTone(score), className)}
      title="AI match score"
    >
      {score}
    </span>
  )
}

export function ScoreBar({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value == null ? "—" : `${value}`}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        {value != null && <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />}
      </div>
    </div>
  )
}

const STATUS_CLASS: Record<string, string> = {
  to_review: "bg-primary/10 text-primary border-primary/20",
  maybe: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  shortlisted: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
}

export function StatusBadge({ tab, label }: { tab: string; label: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", STATUS_CLASS[tab])}>
      {label}
    </span>
  )
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")
}
