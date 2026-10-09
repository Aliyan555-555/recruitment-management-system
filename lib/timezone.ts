/**
 * Timezone utility functions for Pakistan Standard Time (PKT)
 * All dates and times should be handled in Asia/Karachi timezone
 */

export const PKT_TIMEZONE = "Asia/Karachi"
export const PKT_UTC_OFFSET = "+05:00"

/**
 * Convert a date to Pakistan timezone
 */
export function toPKT(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  // Create a date string in PKT format
  const pktString = dateObj.toLocaleString('en-US', { 
    timeZone: PKT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  // Parse back to Date object (this will be in local time but represents PKT)
  // For server-side, we might want to use a library like date-fns-tz
  return new Date(pktString)
}

/**
 * Format date to PKT string
 */
export function formatPKTDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  // Default to 24-hour format if hour and minute are specified but hour12 is not
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: PKT_TIMEZONE,
    ...(options?.hour !== undefined && options?.minute !== undefined && options?.hour12 === undefined
      ? { hour12: false }
      : {}),
    ...options
  }
  return dateObj.toLocaleString('en-GB', defaultOptions)
}

/**
 * Format date to PKT date string (YYYY-MM-DD)
 */
export function formatPKTDateString(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  // Use Intl.DateTimeFormat to get parts in PKT timezone, then format as YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PKT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  // en-CA locale returns YYYY-MM-DD format directly
  return formatter.format(dateObj)
}

/**
 * Format time to PKT time string (HH:MM)
 */
export function formatPKTTime(date: Date | string, includeSeconds = false): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatPKTDate(dateObj, {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds && { second: '2-digit' }),
    hour12: false
  })
}

/**
 * Format datetime to PKT string with full details
 */
export function formatPKTDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatPKTDate(dateObj, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: PKT_TIMEZONE
  })
}

/**
 * Get current date/time in PKT
 */
export function nowPKT(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: PKT_TIMEZONE }))
}

/**
 * Create a date in PKT timezone from year, month, day, hour, minute
 */
export function createPKTDate(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  // Note: This creates a date in local timezone but we interpret it as PKT
  // For proper PKT handling on server, consider using date-fns-tz
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:00`
  return new Date(dateStr)
}

/**
 * Check if a date is in the past (in PKT timezone)
 */
export function isPastPKT(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.getTime() < Date.now()
}

/**
 * Get time difference in milliseconds (PKT aware)
 */
export function getTimeDifferencePKT(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2
  return d1.getTime() - d2.getTime()
}

/**
 * Format time remaining (e.g., "2h 30m 15s")
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "0s"
  
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours % 24 > 0) parts.push(`${hours % 24}h`)
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`)
  if (seconds % 60 > 0 && hours === 0 && days === 0) parts.push(`${seconds % 60}s`)
  
  return parts.join(" ") || "0s"
}



// ---------------------------------------------------------------------------
// Zone-aware helpers (dependency-free, Intl based). Used by interview scheduling.
// The organization timezone is stored in OrganizationSettings.timezone.
// ---------------------------------------------------------------------------

export const DEFAULT_ORG_TIMEZONE = PKT_TIMEZONE

export interface ZonedParts {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
  second: number
  weekday: number // 0=Sunday .. 6=Saturday
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>()

function getPartsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    })
    partsFormatters.set(timeZone, f)
  }
  return f
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Wall-clock parts of an instant in the given timezone. */
export function getZonedParts(date: Date, timeZone: string = DEFAULT_ORG_TIMEZONE): ZonedParts {
  const out: Record<string, string> = {}
  for (const p of getPartsFormatter(timeZone).formatToParts(date)) out[p.type] = p.value
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: WEEKDAYS.indexOf(out.weekday),
  }
}

function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const p = getZonedParts(new Date(utcMs), timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(utcMs / 1000) * 1000
}

/** Convert a wall-clock time in `timeZone` to the matching UTC instant. */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string = DEFAULT_ORG_TIMEZONE
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const off1 = zoneOffsetMs(guess, timeZone)
  let utc = guess - off1
  const off2 = zoneOffsetMs(utc, timeZone)
  if (off2 !== off1) utc = guess - off2
  return new Date(utc)
}

/** "YYYY-MM-DD" of an instant in the given timezone. */
export function zonedDateKey(date: Date, timeZone: string = DEFAULT_ORG_TIMEZONE): string {
  const p = getZonedParts(date, timeZone)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** Parse "YYYY-MM-DD" into numeric parts (throws on invalid input). */
export function parseDateKey(key: string): { year: number; month: number; day: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) throw new Error(`Invalid date key: ${key}`)
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const check = new Date(Date.UTC(year, month - 1, day))
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new Error(`Invalid date key: ${key}`)
  }
  return { year, month, day }
}

/** Day of week (0=Sunday) of a "YYYY-MM-DD" calendar date (zone independent). */
export function dateKeyWeekday(key: string): number {
  const { year, month, day } = parseDateKey(key)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

/** Add whole calendar days to a "YYYY-MM-DD" key. */
export function addDaysToDateKey(key: string, days: number): string {
  const { year, month, day } = parseDateKey(key)
  const d = new Date(Date.UTC(year, month - 1, day + days))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/** UTC instant for `minuteOfDay` (0-1440) on the calendar date `dateKey` in `timeZone`. */
export function dateKeyMinuteToUtc(dateKey: string, minuteOfDay: number, timeZone: string = DEFAULT_ORG_TIMEZONE): Date {
  const { year, month, day } = parseDateKey(dateKey)
  return zonedWallTimeToUtc(year, month, day, Math.floor(minuteOfDay / 60), minuteOfDay % 60, timeZone)
}

/** Human formatting in an explicit timezone, e.g. "Mon, 12 Oct 2026, 10:30". */
export function formatInZone(
  date: Date | string,
  timeZone: string = DEFAULT_ORG_TIMEZONE,
  options: Intl.DateTimeFormatOptions = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-GB', { timeZone, ...options })
}

/** "10:30" of an instant in the timezone. */
export function formatTimeInZone(date: Date | string, timeZone: string = DEFAULT_ORG_TIMEZONE): string {
  return formatInZone(date, timeZone, { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** Short zone label such as "PKT" / "GMT+5". */
export function zoneLabel(timeZone: string = DEFAULT_ORG_TIMEZONE, at: Date = new Date()): string {
  if (timeZone === 'Asia/Karachi') return 'PKT'
  const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')
  return part?.value ?? timeZone
}
