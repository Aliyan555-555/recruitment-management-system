"use client"

import { useEffect, useRef, useState } from "react"
import { Pencil, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DayWindow } from "@/lib/scheduling/availability-calendar"

export interface CalendarColumn {
  key: string
  title: string
  subtitle?: string
  windows: DayWindow[]
  /** Faded styling: the hours come from the repeating weekly template, not set for this date. */
  inherited?: boolean
  disabled?: boolean
  isToday?: boolean
  /** Read-only blocked ranges (time off), in minutes from midnight. */
  blocked?: DayWindow[]
  header?: React.ReactNode
}

interface Props {
  columns: CalendarColumn[]
  onChange: (columnKey: string, windows: DayWindow[]) => void
  startHour?: number
  endHour?: number
}

const HOUR_PX = 48
const STEP = 15
const MIN_LEN = 30

const fmt = (m: number) => {
  const h = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, "0")
  const ampm = h >= 12 && h < 24 ? "PM" : "AM"
  return `${h % 12 === 0 ? 12 : h % 12}:${mm} ${ampm}`
}

type Drag =
  | { kind: "create"; col: string; anchor: number; current: number }
  | { kind: "move"; col: string; index: number; grab: number; len: number; start: number; base: DayWindow[] }
  | { kind: "start" | "end"; col: string; index: number; base: DayWindow[]; value: number }

const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
const fromTime = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

interface Editing {
  col: string
  index: number
  x: number
  y: number
  start: string
  end: string
  error: string | null
}

const STRIPES =
  "repeating-linear-gradient(45deg, transparent, transparent 6px, hsl(var(--muted-foreground) / 0.18) 6px, hsl(var(--muted-foreground) / 0.18) 12px)"

export function WeekCalendar({ columns, onChange, startHour = 6, endHour = 23 }: Props) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const [editing, setEditing] = useState<Editing | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const colRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const columnsRef = useRef(columns)
  columnsRef.current = columns
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const minM = startHour * 60
  const maxM = endHour * 60
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)

  const minuteAt = (col: string, clientY: number) => {
    const el = colRefs.current[col]
    if (!el) return minM
    const y = clientY - el.getBoundingClientRect().top
    const raw = minM + (y / HOUR_PX) * 60
    return Math.min(maxM, Math.max(minM, Math.round(raw / STEP) * STEP))
  }

  const update = (d: Drag | null) => {
    dragRef.current = d
    setDrag(d)
  }

  const dragging = !!drag
  useEffect(() => {
    if (!dragging) return
    const move = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const m = minuteAt(d.col, e.clientY)
      if (d.kind === "create") update({ ...d, current: m })
      else if (d.kind === "move") {
        const start = Math.min(maxM - d.len, Math.max(minM, Math.round((m - d.grab) / STEP) * STEP))
        update({ ...d, start })
      } else if (d.kind === "start") {
        const end = d.base[d.index].endMinute
        update({ ...d, value: Math.min(m, end - MIN_LEN) })
      } else {
        const start = d.base[d.index].startMinute
        update({ ...d, value: Math.max(m, start + MIN_LEN) })
      }
    }
    const up = () => {
      const d = dragRef.current
      update(null)
      if (!d) return
      if (d.kind === "create") {
        const a = Math.min(d.anchor, d.current)
        let b = Math.max(d.anchor, d.current)
        if (b - a < MIN_LEN) b = Math.min(maxM, a + 60)
        if (b - a < MIN_LEN) return
        const base = columnsRef.current.find((c) => c.key === d.col)?.windows ?? []
        onChangeRef.current(d.col, [...base, { startMinute: a, endMinute: b }])
        return
      }
      const next = d.base.map((w, i) => {
        if (i !== d.index) return w
        if (d.kind === "move") return { startMinute: d.start, endMinute: d.start + d.len }
        if (d.kind === "start") return { ...w, startMinute: d.value }
        return { ...w, endMinute: d.value }
      })
      onChangeRef.current(d.col, next)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging])

  useEffect(() => {
    if (!editing) return
    const onDown = (e: PointerEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setEditing(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setEditing(null)
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [editing])

  const applyEdit = () => {
    if (!editing) return
    const start = fromTime(editing.start)
    const end = fromTime(editing.end)
    if (!editing.start || !editing.end || end - start < MIN_LEN) {
      return setEditing({ ...editing, error: `End must be at least ${MIN_LEN} minutes after start` })
    }
    const col = columns.find((c) => c.key === editing.col)
    if (!col) return setEditing(null)
    onChange(
      editing.col,
      col.windows.map((w, i) => (i === editing.index ? { startMinute: start, endMinute: end } : w))
    )
    setEditing(null)
  }

  const removeEdit = () => {
    if (!editing) return
    const col = columns.find((c) => c.key === editing.col)
    if (col) onChange(editing.col, col.windows.filter((_, j) => j !== editing.index))
    setEditing(null)
  }

  const top = (m: number) => ((m - minM) / 60) * HOUR_PX

  // Windows of a column including an in-progress drag.
  const liveWindows = (col: CalendarColumn): DayWindow[] => {
    if (!drag || drag.kind === "create" || drag.col !== col.key) return col.windows
    return col.windows.map((w, i) => {
      if (i !== drag.index) return w
      if (drag.kind === "move") return { startMinute: drag.start, endMinute: drag.start + drag.len }
      if (drag.kind === "start") return { ...w, startMinute: drag.value }
      return { ...w, endMinute: drag.value }
    })
  }

  const gridCols = `56px repeat(${columns.length}, minmax(96px, 1fr))`

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <div className="min-w-[760px] select-none">
        <div className="grid border-b bg-card" style={{ gridTemplateColumns: gridCols }}>
          <div />
          {columns.map((c) => (
            <div key={c.key} className={cn("border-l px-2 py-2 text-center", c.isToday && "bg-primary/5")}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.title}</p>
              {c.subtitle && <p className={cn("text-lg font-semibold leading-tight", c.isToday && "text-primary")}>{c.subtitle}</p>}
              {c.header}
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: gridCols }}>
          <div className="relative" style={{ height: hours.length * HOUR_PX }}>
            {hours.slice(1).map((h) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground"
                style={{ top: (h - startHour) * HOUR_PX }}
              >
                {fmt(h * 60).replace(":00", "")}
              </span>
            ))}
          </div>

          {columns.map((c) => {
            const windows = liveWindows(c)
            return (
              <div
                key={c.key}
                ref={(el) => {
                  colRefs.current[c.key] = el
                }}
                className={cn("relative border-l", c.disabled ? "bg-muted/40" : "cursor-crosshair", c.isToday && "bg-primary/5")}
                style={{
                  height: hours.length * HOUR_PX,
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_PX - 1}px, hsl(var(--border)) ${HOUR_PX - 1}px, hsl(var(--border)) ${HOUR_PX}px)`,
                }}
                onPointerDown={(e) => {
                  if (c.disabled || e.button !== 0 || e.target !== e.currentTarget) return
                  const m = minuteAt(c.key, e.clientY)
                  update({ kind: "create", col: c.key, anchor: m, current: m })
                }}
              >
                {c.blocked?.map((b, i) => {
                  const s = Math.max(b.startMinute, minM)
                  const e = Math.min(b.endMinute, maxM)
                  if (e <= s) return null
                  return (
                    <div
                      key={i}
                      className="pointer-events-none absolute inset-x-0"
                      title="Time off"
                      style={{ top: top(s), height: top(e) - top(s), backgroundImage: STRIPES }}
                    />
                  )
                })}

                {windows.map((w, i) => {
                  const s = Math.max(w.startMinute, minM)
                  const e = Math.min(w.endMinute, maxM)
                  if (e <= s) return null
                  return (
                    <div
                      key={i}
                      className={cn(
                        "group absolute inset-x-1 overflow-hidden rounded-md border px-2 py-1 text-xs shadow-sm",
                        c.inherited ? "border-primary/30 bg-primary/10 text-primary" : "border-primary bg-primary text-primary-foreground",
                        c.disabled ? "cursor-default opacity-60" : "cursor-grab active:cursor-grabbing"
                      )}
                      style={{ top: top(s), height: Math.max(18, top(e) - top(s) - 1) }}
                      onPointerDown={(ev) => {
                        if (c.disabled || ev.button !== 0) return
                        ev.stopPropagation()
                        update({
                          kind: "move",
                          col: c.key,
                          index: i,
                          grab: minuteAt(c.key, ev.clientY) - w.startMinute,
                          len: w.endMinute - w.startMinute,
                          start: w.startMinute,
                          base: c.windows,
                        })
                      }}
                    >
                      <div
                        className={cn("whitespace-nowrap font-medium leading-tight", c.disabled ? "pr-0" : "pr-11")}
                        title={`${fmt(w.startMinute)} – ${fmt(w.endMinute)}`}
                      >
                        <p>{fmt(w.startMinute)}</p>
                        {top(e) - top(s) >= 40 && <p className="opacity-80">{fmt(w.endMinute)}</p>}
                      </div>
                      {!c.disabled && (
                        <>
                          <button
                            type="button"
                            aria-label="Edit window"
                            className="absolute right-6 top-1 z-10 rounded bg-black/10 p-0.5 opacity-70 transition-opacity hover:bg-black/25 hover:opacity-100 group-hover:opacity-100"
                            onPointerDown={(ev) => ev.stopPropagation()}
                            onClick={(ev) => {
                              const r = ev.currentTarget.getBoundingClientRect()
                              setEditing({
                                col: c.key,
                                index: i,
                                x: Math.min(r.left, window.innerWidth - 272),
                                y: Math.min(r.bottom + 6, window.innerHeight - 220),
                                start: toTime(w.startMinute),
                                end: toTime(w.endMinute),
                                error: null,
                              })
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            aria-label="Remove window"
                            className="absolute right-1 top-1 z-10 rounded bg-black/10 p-0.5 opacity-70 transition-opacity hover:bg-black/25 hover:opacity-100 group-hover:opacity-100"
                            onPointerDown={(ev) => ev.stopPropagation()}
                            onClick={() =>
                              onChange(
                                c.key,
                                c.windows.filter((_, j) => j !== i)
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <span
                            className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize"
                            onPointerDown={(ev) => {
                              ev.stopPropagation()
                              update({ kind: "start", col: c.key, index: i, base: c.windows, value: w.startMinute })
                            }}
                          />
                          <span
                            className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
                            onPointerDown={(ev) => {
                              ev.stopPropagation()
                              update({ kind: "end", col: c.key, index: i, base: c.windows, value: w.endMinute })
                            }}
                          />
                        </>
                      )}
                    </div>
                  )
                })}

                {drag?.kind === "create" && drag.col === c.key && (
                  <div
                    className="pointer-events-none absolute inset-x-1 rounded-md border border-dashed border-primary bg-primary/20 px-2 py-1 text-xs text-primary"
                    style={{
                      top: top(Math.min(drag.anchor, drag.current)),
                      height: Math.max(18, top(Math.max(drag.anchor, drag.current)) - top(Math.min(drag.anchor, drag.current))),
                    }}
                  >
                    {fmt(Math.min(drag.anchor, drag.current))} – {fmt(Math.max(drag.anchor, drag.current))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {editing && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label="Edit availability"
          className="fixed z-50 w-64 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg"
          style={{ left: editing.x, top: editing.y }}
        >
          <p className="mb-2 text-sm font-semibold">Edit hours</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              Start
              <input
                type="time"
                autoFocus
                value={editing.start}
                onChange={(e) => setEditing({ ...editing, start: e.target.value, error: null })}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              End
              <input
                type="time"
                value={editing.end}
                onChange={(e) => setEditing({ ...editing, end: e.target.value, error: null })}
                onKeyDown={(e) => e.key === "Enter" && applyEdit()}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
              />
            </label>
          </div>
          {editing.error && <p className="mt-2 text-xs text-destructive">{editing.error}</p>}
          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={removeEdit} className="text-xs font-medium text-destructive hover:underline">
              Delete
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(null)} className="h-8 rounded-md border px-3 text-xs font-medium hover:bg-accent">
                Cancel
              </button>
              <button type="button" onClick={applyEdit} className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
