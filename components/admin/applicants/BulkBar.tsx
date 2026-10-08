"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Decision } from "./types"

const LABEL: Record<Exclude<Decision, "unmaybe">, string> = {
  select: "Shortlist",
  maybe: "Mark as maybe",
  reject: "Reject",
}

/** Bulk actions on the checked (and visible) candidates, always behind a confirmation. */
export function BulkBar({
  count,
  filterSummary,
  onAction,
  onClear,
}: {
  count: number
  filterSummary: string
  onAction: (action: Exclude<Decision, "unmaybe">) => Promise<void>
  onClear: () => void
}) {
  const [pending, setPending] = useState<Exclude<Decision, "unmaybe"> | null>(null)
  const [busy, setBusy] = useState(false)
  if (count === 0) return null

  return (
    <>
      <div className="sticky bottom-4 z-20 mx-auto flex w-fit flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 shadow-lg">
        <span className="text-sm font-medium">{count} selected</span>
        <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setPending("select")}>Shortlist</Button>
        <Button size="sm" variant="outline" onClick={() => setPending("maybe")}>Maybe</Button>
        <Button size="sm" variant="outline" className="text-rose-600" onClick={() => setPending("reject")}>Reject</Button>
        <Button size="sm" variant="ghost" onClick={onClear}>Clear</Button>
      </div>

      <Dialog open={!!pending} onOpenChange={(o) => !o && !busy && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending ? `${LABEL[pending]} ${count} candidate(s)?` : ""}</DialogTitle>
            <DialogDescription>
              Only the {count} checked candidate(s) currently shown are affected.
              {filterSummary && <span className="mt-1 block">Active filters: {filterSummary}</span>}
              {pending === "reject" && <span className="mt-1 block font-medium text-rose-600">Rejected candidates are removed from this job&apos;s pipeline.</span>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setPending(null)}>Cancel</Button>
            <Button
              disabled={busy}
              className={pending === "reject" ? "bg-rose-600 text-white hover:bg-rose-700" : ""}
              onClick={async () => {
                if (!pending) return
                setBusy(true)
                await onAction(pending)
                setBusy(false)
                setPending(null)
              }}
            >
              {busy ? "Working…" : pending ? LABEL[pending] : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
