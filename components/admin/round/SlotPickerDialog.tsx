"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatInZone, zoneLabel } from "@/lib/timezone"

interface SlotOption {
  id: string
  startsAt: string
  endsAt: string
  capacity: number
  bookedCount: number
  isBlocked: boolean
  interviewers: Array<{ name: string }>
}

interface Props {
  open: boolean
  roundId: string
  title: string
  description: string
  confirmLabel: string
  /** slot the candidate is in now (excluded from the list) */
  excludeSlotId?: string | null
  busy: boolean
  onClose: () => void
  onConfirm: (slotId: string) => void
}

/** Lets the admin pick a free future slot of the round (book for a candidate / reschedule). */
export function SlotPickerDialog({ open, roundId, title, description, confirmLabel, excludeSlotId, busy, onClose, onConfirm }: Props) {
  const [slots, setSlots] = useState<SlotOption[] | null>(null)
  const [timeZone, setTimeZone] = useState("Asia/Karachi")
  const [selected, setSelected] = useState("")

  useEffect(() => {
    if (!open) return
    setSelected("")
    setSlots(null)
    fetch(`/api/admin/steps/${roundId}/slots`)
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((d) => {
        setSlots(d.slots ?? [])
        if (d.timeZone) setTimeZone(d.timeZone)
      })
      .catch(() => setSlots([]))
  }, [open, roundId])

  const options = useMemo(
    () =>
      (slots ?? []).filter(
        (s) => s.id !== excludeSlotId && !s.isBlocked && s.bookedCount < s.capacity && new Date(s.startsAt) > new Date()
      ),
    [slots, excludeSlotId]
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="slot-pick">Free slot ({zoneLabel(timeZone)})</Label>
          {slots === null ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading slots…
            </p>
          ) : options.length === 0 ? (
            <p className="text-sm text-muted-foreground">No free slots. Open more slots on the Schedule tab first.</p>
          ) : (
            <select
              id="slot-pick"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select a slot…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {formatInZone(new Date(o.startsAt), timeZone, { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
                  {" · "}
                  {o.interviewers.map((i) => i.name).join(", ")}
                  {o.capacity > 1 ? ` · ${o.capacity - o.bookedCount} seats left` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Back
          </Button>
          <Button disabled={busy || !selected} onClick={() => onConfirm(selected)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
