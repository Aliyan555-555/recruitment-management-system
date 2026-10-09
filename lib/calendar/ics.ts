/**
 * Minimal RFC 5545 iCalendar writer for interview invites (single VEVENT, UTC times).
 */

export interface IcsPerson {
  name?: string
  email: string
}

export interface IcsEvent {
  /** stable per booking so reschedules/cancellations update the same calendar entry */
  uid: string
  /** increment on every change (reschedule = +1, cancel = +1) */
  sequence: number
  method: "REQUEST" | "CANCEL"
  startsAt: Date
  endsAt: Date
  summary: string
  description?: string
  location?: string
  url?: string
  organizer?: IcsPerson
  attendees: IcsPerson[]
  /** defaults to now; injectable for tests */
  stamp?: Date
}

function formatUtc(d: Date): string {
  const p = (n: number, len = 2) => String(n).padStart(len, "0")
  return `${p(d.getUTCFullYear(), 4)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
}

export function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,")
}

/** Folds a content line at 75 octets as required by the spec (continuation lines start with a space). */
export function foldLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line
  const parts: string[] = []
  let current = ""
  let currentBytes = 0
  let limit = 75
  for (const ch of line) {
    const bytes = encoder.encode(ch).length
    if (currentBytes + bytes > limit) {
      parts.push(current)
      current = ""
      currentBytes = 0
      limit = 74 // continuation lines carry a leading space
    }
    current += ch
    currentBytes += bytes
  }
  parts.push(current)
  return parts.join("\r\n ")
}

function cleanParam(value: string): string {
  return value.replace(/["\r\n;:,]/g, " ").trim()
}

function person(prop: "ORGANIZER" | "ATTENDEE", p: IcsPerson, extra = ""): string {
  const cn = p.name ? `;CN=${cleanParam(p.name)}` : ""
  return `${prop}${cn}${extra}:mailto:${p.email}`
}

export function buildIcs(event: IcsEvent): string {
  const cancelled = event.method === "CANCEL"
  const lines: Array<string | null> = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Recruitment Management System//Interview Scheduling//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${event.method}`,
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `SEQUENCE:${event.sequence}`,
    `DTSTAMP:${formatUtc(event.stamp ?? new Date())}`,
    `DTSTART:${formatUtc(event.startsAt)}`,
    `DTEND:${formatUtc(event.endsAt)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : null,
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : null,
    event.url ? `URL:${event.url}` : null,
    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    event.organizer ? person("ORGANIZER", event.organizer) : null,
    ...event.attendees.map((a) => person("ATTENDEE", a, ";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=FALSE")),
    cancelled
      ? null
      : "BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Interview starting soon\r\nTRIGGER:-PT30M\r\nEND:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
  return lines
    .filter((l): l is string => l !== null)
    .map((l) => (l.includes("\r\n") ? l : foldLine(l)))
    .join("\r\n") + "\r\n"
}
