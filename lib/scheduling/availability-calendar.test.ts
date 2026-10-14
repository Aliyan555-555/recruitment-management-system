import test from "node:test"
import assert from "node:assert/strict"
import { copyWeekForward, effectiveDay, mondayOf, normalizeWindows, resetDate, setDateWindows } from "./availability-calendar"
import { validateAvailability } from "./availability-rules"

const weekly = [{ dayOfWeek: 1, startMinute: 540, endMinute: 600 }] // Mondays 09-10

test("effectiveDay: weekly template, custom override and day off", () => {
  assert.equal(effectiveDay(weekly, [], "2026-10-12").source, "weekly")
  const custom = [{ date: "2026-10-12", startMinute: 840, endMinute: 900 }]
  assert.deepEqual(effectiveDay(weekly, custom, "2026-10-12"), { source: "custom", windows: [{ startMinute: 840, endMinute: 900 }] })
  const off = [{ date: "2026-10-12", startMinute: 0, endMinute: 0 }]
  assert.deepEqual(effectiveDay(weekly, off, "2026-10-12"), { source: "off", windows: [] })
  assert.equal(effectiveDay(weekly, off, "2026-10-19").source, "weekly")
})

test("setDateWindows merges, marks day off when empty, and resetDate restores the template", () => {
  const a = setDateWindows([], "2026-10-12", [{ startMinute: 600, endMinute: 660 }, { startMinute: 630, endMinute: 720 }])
  assert.deepEqual(a, [{ date: "2026-10-12", startMinute: 600, endMinute: 720 }])
  const off = setDateWindows(a, "2026-10-12", [])
  assert.deepEqual(off, [{ date: "2026-10-12", startMinute: 0, endMinute: 0 }])
  assert.equal(validateAvailability({ weekly: [], oneOff: off }, "2026-10-01"), null)
  assert.deepEqual(resetDate(off, "2026-10-12"), [])
})

test("normalizeWindows drops empty and merges touching windows", () => {
  assert.deepEqual(normalizeWindows([{ startMinute: 60, endMinute: 60 }, { startMinute: 0, endMinute: 60 }, { startMinute: 60, endMinute: 90 }]), [
    { startMinute: 0, endMinute: 90 },
  ])
})

test("mondayOf and copyWeekForward", () => {
  assert.equal(mondayOf("2026-10-14"), "2026-10-12")
  assert.equal(mondayOf("2026-10-18"), "2026-10-12") // Sunday
  const copied = copyWeekForward(weekly, [], "2026-10-12")
  assert.equal(effectiveDay(weekly, copied, "2026-10-19").source, "custom")
  assert.equal(effectiveDay(weekly, copied, "2026-10-20").source, "off")
})

test("a day off cannot be mixed with real windows", () => {
  const bad = [{ date: "2026-10-12", startMinute: 0, endMinute: 0 }, { date: "2026-10-12", startMinute: 600, endMinute: 660 }]
  assert.ok(validateAvailability({ weekly: [], oneOff: bad }, "2026-10-01"))
})
