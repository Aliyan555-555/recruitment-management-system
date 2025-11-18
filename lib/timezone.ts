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
  const now = nowPKT()
  return dateObj.getTime() < now.getTime()
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

