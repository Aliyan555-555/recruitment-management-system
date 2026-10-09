import test from "node:test"
import assert from "node:assert/strict"
import { buildIcs, escapeIcsText, foldLine } from "./ics"

const base = {
  uid: "booking-42@rms",
  sequence: 0,
  method: "REQUEST" as const,
  startsAt: new Date("2026-10-12T05:00:00.000Z"),
  endsAt: new Date("2026-10-12T05:30:00.000Z"),
  summary: "Screening Interview - Backend Engineer",
  attendees: [{ name: "Ayesha Khan", email: "ayesha@example.com" }],
  stamp: new Date("2026-10-10T00:00:00.000Z"),
}

test("request invite has required properties and CRLF endings", () => {
  const ics = buildIcs({ ...base, location: "Office, 3rd floor; Karachi", organizer: { name: "HR", email: "hr@example.com" } })
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"))
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"))
  assert.ok(ics.includes("METHOD:REQUEST\r\n"))
  assert.ok(ics.includes("UID:booking-42@rms\r\n"))
  assert.ok(ics.includes("DTSTART:20261012T050000Z\r\n"))
  assert.ok(ics.includes("DTEND:20261012T053000Z\r\n"))
  assert.ok(ics.includes("LOCATION:Office\\, 3rd floor\\; Karachi\r\n"))
  assert.ok(ics.includes("STATUS:CONFIRMED"))
  assert.ok(ics.includes("BEGIN:VALARM"))
  assert.equal(/[^\r]\n/.test(ics), false, "no bare LF line endings")
})

test("cancel keeps the uid, bumps the sequence and drops the alarm", () => {
  const ics = buildIcs({ ...base, method: "CANCEL", sequence: 3 })
  assert.ok(ics.includes("METHOD:CANCEL"))
  assert.ok(ics.includes("SEQUENCE:3"))
  assert.ok(ics.includes("STATUS:CANCELLED"))
  assert.equal(ics.includes("VALARM"), false)
})

test("text escaping and 75 octet folding", () => {
  assert.equal(escapeIcsText("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne")
  const folded = foldLine("DESCRIPTION:" + "x".repeat(200))
  for (const line of folded.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75)
  assert.equal(folded.split("\r\n").map((l, i) => (i === 0 ? l : l.slice(1))).join(""), "DESCRIPTION:" + "x".repeat(200))
})
