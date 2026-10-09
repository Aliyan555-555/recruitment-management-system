import { parseDateKey } from "@/lib/timezone"

/** Pure validation for availability payloads (shared by the API and its tests). */

export interface WeeklyWindowInput {
  dayOfWeek: number
  startMinute: number
  endMinute: number
}

export interface OneOffWindowInput {
  date: string
  startMinute: number
  endMinute: number
}

export const MIN_WINDOW_MINUTES = 15

function checkMinutes(start: number, end: number): string | null {
  if (!Number.isInteger(start) || !Number.isInteger(end)) return "Times must be whole minutes"
  if (start < 0 || end > 24 * 60) return "Times must be within a single day"
  if (end - start < MIN_WINDOW_MINUTES) return `Each window must be at least ${MIN_WINDOW_MINUTES} minutes`
  return null
}

function overlaps(windows: Array<{ startMinute: number; endMinute: number }>): boolean {
  const sorted = [...windows].sort((a, b) => a.startMinute - b.startMinute)
  return sorted.some((w, i) => i > 0 && w.startMinute < sorted[i - 1].endMinute)
}

export function validateAvailability(input: { weekly: WeeklyWindowInput[]; oneOff: OneOffWindowInput[] }, todayKey: string): string | null {
  const byDay = new Map<number, WeeklyWindowInput[]>()
  for (const w of input.weekly) {
    if (!Number.isInteger(w.dayOfWeek) || w.dayOfWeek < 0 || w.dayOfWeek > 6) return "Invalid day of week"
    const err = checkMinutes(w.startMinute, w.endMinute)
    if (err) return err
    byDay.set(w.dayOfWeek, [...(byDay.get(w.dayOfWeek) ?? []), w])
  }
  for (const windows of byDay.values()) if (overlaps(windows)) return "Weekly windows on the same day overlap"

  const byDate = new Map<string, OneOffWindowInput[]>()
  for (const w of input.oneOff) {
    try {
      parseDateKey(w.date)
    } catch {
      return "Invalid date"
    }
    if (w.date < todayKey) return "One-off availability cannot be in the past"
    const err = checkMinutes(w.startMinute, w.endMinute)
    if (err) return err
    byDate.set(w.date, [...(byDate.get(w.date) ?? []), w])
  }
  for (const windows of byDate.values()) if (overlaps(windows)) return "Windows on the same date overlap"
  return null
}
