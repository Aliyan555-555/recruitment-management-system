"use client"

import { Check, HelpCircle, Undo2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Decision } from "./types"

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="ml-1.5 rounded border border-current/30 px-1 text-[10px] font-normal opacity-70">{children}</kbd>
}

/** Shortlist / Maybe / Reject with keyboard hints. Disabled with the reason when not actionable. */
export function DecisionBar({
  actionable,
  blockedLabel,
  isMaybe,
  onDecide,
  busy,
  size = "md",
}: {
  actionable: boolean
  blockedLabel: string
  isMaybe: boolean
  onDecide: (action: Decision) => void
  busy?: boolean
  size?: "md" | "lg"
}) {
  if (!actionable) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        Decision made: <span className="font-semibold text-foreground">{blockedLabel}</span>
      </div>
    )
  }
  const base = cn(
    "inline-flex flex-1 items-center justify-center rounded-lg border font-semibold transition-colors disabled:opacity-50",
    size === "lg" ? "h-12 text-base" : "h-10 text-sm"
  )
  return (
    <div className="flex gap-2">
      <button type="button" disabled={busy} onClick={() => onDecide("reject")} className={cn(base, "border-rose-500/40 text-rose-700 hover:bg-rose-500/10 dark:text-rose-400")}>
        <X className="mr-1.5 h-4 w-4" /> Reject <Kbd>R</Kbd>
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onDecide(isMaybe ? "unmaybe" : "maybe")}
        className={cn(base, "border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400", isMaybe && "bg-amber-500/10")}
      >
        {isMaybe ? <Undo2 className="mr-1.5 h-4 w-4" /> : <HelpCircle className="mr-1.5 h-4 w-4" />}
        {isMaybe ? "Back to review" : "Maybe"} <Kbd>M</Kbd>
      </button>
      <button type="button" disabled={busy} onClick={() => onDecide("select")} className={cn(base, "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700")}>
        <Check className="mr-1.5 h-4 w-4" /> Shortlist <Kbd>S</Kbd>
      </button>
    </div>
  )
}
