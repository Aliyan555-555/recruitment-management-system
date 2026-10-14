import { addDaysToDateKey, dateKeyWeekday } from "@/lib/timezone"
import { isDayOffWindow, type OneOffWindowInput, type WeeklyWindowInput } from "./availability-rules"

/** Pure helpers behind the interviewer week-calendar editor. */

export interface DayWindow {
  startMinute: number
  endMinute: number
}

export type DaySource = "weekly" | "custom" | "off"

export function effectiveDay(
  weekly: WeeklyWindowInput[],
  oneOff: OneOffWindowInput[],
  dateKey: string
): { source: DaySource; windows: DayWindow[] } {
  const custom = oneOff.filter((w) => w.date === dateKey)
  if (custom.length > 0) {
    if (custom.some(isDayOffWindow)) return { source: "off", windows: [] }
    return { source: "custom", windows: sortWindows(custom) }
  }
  const dow = dateKeyWeekday(dateKey)
  return {
    source: "weekly",
    windows: sortWindows(weekly.filter((w) => w.dayOfWeek === dow)),
  }
}

const sortWindows = (ws: DayWindow[]): DayWindow[] =>
  ws.map(({ startMinute, endMinute }) => ({ startMinute, endMinute })).sort((a, b) => a.startMinute - b.startMinute)

/** Merges overlapping or touching windows. */
export function normalizeWindows(ws: DayWindow[]): DayWindow[] {
  const out: DayWindow[] = []
  for (const w of sortWindows(ws.filter((x) => x.endMinute > x.startMinute))) {
    const last = out[out.length - 1]
    if (last && w.startMinute <= last.endMinute) last.endMinute = Math.max(last.endMinute, w.endMinute)
    else out.push({ ...w })
  }
  return out
}

/** Replaces everything for one date. An empty list becomes an explicit "day off" marker. */
export function setDateWindows(oneOff: OneOffWindowInput[], dateKey: string, windows: DayWindow[]): OneOffWindowInput[] {
  const rest = oneOff.filter((w) => w.date !== dateKey)
  const merged = normalizeWindows(windows)
  if (merged.length === 0) return [...rest, { date: dateKey, startMinute: 0, endMinute: 0 }]
  return [...rest, ...merged.map((w) => ({ date: dateKey, ...w }))]
}

/** Removes the override so the date follows the weekly template again. */
export function resetDate(oneOff: OneOffWindowInput[], dateKey: string): OneOffWindowInput[] {
  return oneOff.filter((w) => w.date !== dateKey)
}

export function weekDateKeys(mondayKey: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysToDateKey(mondayKey, i))
}

export function mondayOf(dateKey: string): string {
  const dow = dateKeyWeekday(dateKey) // 0=Sun
  return addDaysToDateKey(dateKey, dow === 0 ? -6 : 1 - dow)
}

/** Copies the effective hours of each day of one week onto the same weekdays of the next week. */
export function copyWeekForward(weekly: WeeklyWindowInput[], oneOff: OneOffWindowInput[], mondayKey: string): OneOffWindowInput[] {
  let next = oneOff
  for (const day of weekDateKeys(mondayKey)) {
    const { windows } = effectiveDay(weekly, oneOff, day)
    next = setDateWindows(next, addDaysToDateKey(day, 7), windows)
  }
  return next
}
