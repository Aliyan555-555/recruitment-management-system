"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, CheckCircle2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ApplicantRow } from "@/lib/admin/applicant-serializers"
import type { ShortlistFilters } from "@/lib/ai-shortlist/filters"
import type { Decision } from "./types"
import { CandidateProfilePanel } from "./CandidateProfilePanel"
import { prefetchApplicantDetail, useApplicantDetail } from "./useApplicants"
import { useReviewShortcuts } from "./useReviewShortcuts"

interface Props {
  jobId: string
  queueIds: string[] // snapshot of the visible list when review mode opened
  applicants: ApplicantRow[] // live rows (for current state)
  version: number
  filters: ShortlistFilters
  firstRound: { id: string; stepName: string } | null
  decide: (ids: string[], action: Decision) => Promise<boolean>
  onNoteSaved: (candidateId: string, hasNote: boolean) => void
  onClose: () => void
}

/** Focused one-candidate-at-a-time review, like a card deck. Auto-advances after a decision. */
export function ReviewMode({ jobId, queueIds, applicants, version, filters, firstRound, decide, onNoteSaved, onClose }: Props) {
  const [index, setIndex] = useState(0)
  const [leaving, setLeaving] = useState<"left" | "right" | "down" | null>(null)
  const [busy, setBusy] = useState(false)
  const [tally, setTally] = useState({ select: 0, maybe: 0, reject: 0 })
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const byId = useMemo(() => new Map(applicants.map((a) => [a.candidateId, a])), [applicants])
  const finished = index >= queueIds.length
  const currentId = finished ? null : queueIds[index]
  const current = currentId ? byId.get(currentId) ?? null : null
  // Detail is keyed by the version when review mode opened so earlier decisions don't refetch
  const [openVersion] = useState(version)
  const { detail, loading } = useApplicantDetail(jobId, currentId, openVersion)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    for (const id of queueIds.slice(index + 1, index + 3)) prefetchApplicantDetail(jobId, id, openVersion)
  }, [index, queueIds, jobId, openVersion])

  const go = (delta: number) => setIndex((i) => Math.max(0, Math.min(queueIds.length, i + delta)))

  const act = async (action: Decision) => {
    if (!current || busy) return
    if (!current.actionable) {
      go(1)
      return
    }
    const dir = action === "select" ? "right" : action === "reject" ? "left" : "down"
    setBusy(true)
    setLeaving(dir)
    const ok = await decide([current.candidateId], action)
    setTimeout(() => {
      setLeaving(null)
      setBusy(false)
      if (ok) {
        if (action === "select" || action === "reject" || action === "maybe")
          setTally((t) => ({ ...t, [action]: t[action as "select" | "reject" | "maybe"] + 1 }))
        go(1)
      }
    }, 180)
  }

  useReviewShortcuts({
    ArrowRight: () => act("select"),
    s: () => act("select"),
    ArrowLeft: () => act("reject"),
    r: () => act("reject"),
    ArrowDown: () => act("maybe"),
    m: () => act("maybe"),
    j: () => go(1),
    k: () => go(-1),
    ArrowUp: () => go(-1),
    n: () => noteRef.current?.focus(),
    Escape: () => (document.activeElement === noteRef.current ? noteRef.current?.blur() : onClose()),
  })

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur" role="dialog" aria-modal="true" aria-label="Review mode">
      <div className="flex items-center gap-4 border-b border-border px-4 py-3 sm:px-6">
        <button type="button" onClick={onClose} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" /> Exit <kbd className="ml-1 rounded border px-1 text-[10px]">Esc</kbd>
        </button>
        <div className="flex-1">
          <div className="mx-auto max-w-md">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Review mode</span>
              <span>{finished ? queueIds.length : index + 1} of {queueIds.length}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${(Math.min(index, queueIds.length) / Math.max(1, queueIds.length)) * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <button type="button" onClick={() => go(-1)} disabled={index === 0} className="rounded-md p-2 hover:bg-muted disabled:opacity-40" aria-label="Previous (K)">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => go(1)} disabled={finished} className="rounded-md p-2 hover:bg-muted disabled:opacity-40" aria-label="Skip (J)">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {finished ? (
          <div className="mx-auto max-w-md space-y-6 py-16 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <div>
              <h2 className="text-2xl font-bold">Review complete</h2>
              <p className="mt-1 text-sm text-muted-foreground">You went through {queueIds.length} candidate(s).</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border p-3"><p className="text-2xl font-bold text-emerald-600">{tally.select}</p>Shortlisted</div>
              <div className="rounded-xl border p-3"><p className="text-2xl font-bold text-amber-600">{tally.maybe}</p>Maybe</div>
              <div className="rounded-xl border p-3"><p className="text-2xl font-bold text-rose-600">{tally.reject}</p>Rejected</div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">Back to list</button>
              {firstRound && tally.select > 0 && (
                <Link href={`/admin/jobs/${jobId}/rounds/${firstRound.id}/applied`} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  Continue to {firstRound.stepName} →
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "mx-auto max-w-3xl rounded-2xl border border-border bg-card p-5 shadow-lg transition-all duration-200",
              leaving === "right" && "translate-x-24 rotate-2 opacity-0",
              leaving === "left" && "-translate-x-24 -rotate-2 opacity-0",
              leaving === "down" && "translate-y-12 opacity-0"
            )}
          >
            <CandidateProfilePanel
              jobId={jobId}
              detail={detail && detail.candidate.id === currentId ? { ...detail, application: { ...detail.application, actionable: current?.actionable ?? detail.application.actionable, reviewFlag: current?.reviewFlag ?? null, statusLabel: current?.statusLabel ?? detail.application.statusLabel } } : null}
              loading={loading}
              filters={filters}
              onDecide={act}
              deciding={busy}
              noteRef={noteRef}
              onNoteSaved={(has) => currentId && onNoteSaved(currentId, has)}
            />
          </div>
        )}
      </div>

      {!finished && (
        <p className="hidden border-t border-border py-2 text-center text-xs text-muted-foreground sm:block">
          ← / R reject · ↓ / M maybe · → / S shortlist · J skip · K back · N note · Esc exit
        </p>
      )}
    </div>
  )
}
