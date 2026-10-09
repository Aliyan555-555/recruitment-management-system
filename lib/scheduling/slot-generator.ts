import { addDaysToDateKey, dateKeyMinuteToUtc, dateKeyWeekday, parseDateKey } from "@/lib/timezone"

/**
 * Pure slot generation: interviewer availability - time off - already-booked time => slot drafts.
 * No database access here so the rules are unit-testable.
 */

export interface AvailabilityRule {
  /** 0=Sunday .. 6=Saturday: repeats weekly */
  dayOfWeek?: number | null
  /** "YYYY-MM-DD": one-off window on that calendar date */
  date?: string | null
  /** minutes from midnight in the organization timezone */
  startMinute: number
  endMinute: number
}

export interface Interval {
  startsAt: Date
  endsAt: Date
}

export interface GeneratorInterviewer {
  id: string
  availability: AvailabilityRule[]
  timeOff: Interval[]
  /** slots (any step) this interviewer already sits on */
  busy: Interval[]
  /** how many upcoming slots they already carry; used to rotate panel members fairly */
  load: number
}

export interface GeneratorInput {
  timeZone: string
  /** inclusive "YYYY-MM-DD" bounds in the organization timezone */
  fromDate: string
  toDate: string
  durationMins: number
  bufferMins: number
  panelSize: number
  /** candidates per slot */
  capacity: number
  now: Date
  /** earliest allowed start relative to now */
  minLeadMins: number
  interviewers: GeneratorInterviewer[]
}

export interface SlotDraft {
  startsAt: Date
  endsAt: Date
  interviewerIds: string[]
  capacity: number
}

export const MAX_RANGE_DAYS = 62
const MIN = 60_000

type Span = [number, number] // epoch ms, [start, end)

function mergeSpans(spans: Span[]): Span[] {
  const sorted = spans.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0])
  const out: Span[] = []
  for (const s of sorted) {
    const last = out[out.length - 1]
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1])
    else out.push([s[0], s[1]])
  }
  return out
}

function subtractSpans(base: Span[], cuts: Span[]): Span[] {
  const mergedCuts = mergeSpans(cuts)
  const result: Span[] = []
  for (const [start, end] of base) {
    let cursor = start
    for (const [cs, ce] of mergedCuts) {
      if (ce <= cursor) continue
      if (cs >= end) break
      if (cs > cursor) result.push([cursor, cs])
      cursor = Math.max(cursor, ce)
      if (cursor >= end) break
    }
    if (cursor < end) result.push([cursor, end])
  }
  return result
}

function fits(spans: Span[], start: number, end: number): boolean {
  return spans.some(([a, b]) => start >= a && end <= b)
}

export function listDateKeys(fromDate: string, toDate: string): string[] {
  parseDateKey(fromDate)
  parseDateKey(toDate)
  const keys: string[] = []
  let cursor = fromDate
  while (cursor <= toDate) {
    keys.push(cursor)
    cursor = addDaysToDateKey(cursor, 1)
    if (keys.length > 366) throw new Error("Date range too large")
  }
  return keys
}

/** Availability windows (as UTC spans) of one interviewer on one calendar date. */
function windowsForDate(rules: AvailabilityRule[], dateKey: string, timeZone: string): Span[] {
  const weekday = dateKeyWeekday(dateKey)
  const spans: Span[] = []
  for (const r of rules) {
    const matches = r.date ? r.date === dateKey : r.dayOfWeek === weekday
    if (!matches || r.endMinute <= r.startMinute) continue
    spans.push([
      dateKeyMinuteToUtc(dateKey, r.startMinute, timeZone).getTime(),
      dateKeyMinuteToUtc(dateKey, r.endMinute, timeZone).getTime(),
    ])
  }
  return mergeSpans(spans)
}

export function generateSlots(input: GeneratorInput): SlotDraft[] {
  const { timeZone, durationMins, bufferMins, panelSize, capacity } = input
  if (durationMins < 1) throw new Error("Duration must be positive")
  if (panelSize < 1) throw new Error("Panel size must be at least 1")

  const days = listDateKeys(input.fromDate, input.toDate)
  if (days.length > MAX_RANGE_DAYS) throw new Error(`Date range cannot exceed ${MAX_RANGE_DAYS} days`)

  const duration = durationMins * MIN
  const buffer = bufferMins * MIN
  const step = duration + buffer
  const earliest = input.now.getTime() + input.minLeadMins * MIN

  const load = new Map(input.interviewers.map((i) => [i.id, i.load]))
  // Existing commitments (padded by the buffer so back-to-back slots keep their gap) + time off.
  const blocked = new Map<string, Span[]>(
    input.interviewers.map((i) => [
      i.id,
      [
        ...i.busy.map((b): Span => [b.startsAt.getTime() - buffer, b.endsAt.getTime() + buffer]),
        ...i.timeOff.map((t): Span => [t.startsAt.getTime(), t.endsAt.getTime()]),
      ],
    ])
  )

  const drafts: SlotDraft[] = []
  const pushDraft = (start: number, ids: string[]) => {
    drafts.push({ startsAt: new Date(start), endsAt: new Date(start + duration), interviewerIds: ids, capacity })
    for (const id of ids) {
      blocked.get(id)!.push([start - buffer, start + duration + buffer])
      load.set(id, (load.get(id) ?? 0) + 1)
    }
  }

  for (const day of days) {
    const freeByInterviewer = new Map<string, Span[]>()
    for (const iv of input.interviewers) {
      const windows = windowsForDate(iv.availability, day, timeZone)
      freeByInterviewer.set(iv.id, subtractSpans(windows, blocked.get(iv.id)!))
    }

    if (panelSize === 1) {
      // 1:1 interviews: each interviewer fills their own free time back to back.
      for (const iv of input.interviewers) {
        for (const [a, b] of freeByInterviewer.get(iv.id)!) {
          for (let t = Math.max(a, earliest); t + duration <= b; t += step) {
            pushDraft(t, [iv.id])
          }
        }
      }
      continue
    }

    // Panels: walk one shared grid for the day so several interviewers line up.
    const starts = [...freeByInterviewer.values()].flat().map(([a]) => a)
    if (starts.length === 0) continue
    const anchor = Math.min(...starts)
    const lastEnd = Math.max(...[...freeByInterviewer.values()].flat().map(([, b]) => b))

    for (let t = anchor; t + duration <= lastEnd; t += step) {
      if (t < earliest) continue
      const available = input.interviewers
        .filter((iv) => fits(subtractSpans(freeByInterviewer.get(iv.id)!, blocked.get(iv.id)!), t, t + duration))
        .sort((x, y) => (load.get(x.id)! - load.get(y.id)!) || x.id.localeCompare(y.id))
      if (available.length >= panelSize) {
        pushDraft(
          t,
          available.slice(0, panelSize).map((iv) => iv.id)
        )
      }
    }
  }

  return drafts.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.interviewerIds[0].localeCompare(b.interviewerIds[0]))
}

export interface DraftSummary {
  total: number
  perDay: Array<{ date: string; count: number }>
  interviewersUsed: number
}

export function summarizeDrafts(drafts: SlotDraft[], dateKeyOf: (d: Date) => string): DraftSummary {
  const perDay = new Map<string, number>()
  const used = new Set<string>()
  for (const d of drafts) {
    const key = dateKeyOf(d.startsAt)
    perDay.set(key, (perDay.get(key) ?? 0) + 1)
    d.interviewerIds.forEach((id) => used.add(id))
  }
  return {
    total: drafts.length,
    perDay: [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
    interviewersUsed: used.size,
  }
}
