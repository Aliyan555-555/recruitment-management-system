import test from "node:test"
import assert from "node:assert/strict"
import {
  addDaysToDateKey,
  dateKeyMinuteToUtc,
  dateKeyWeekday,
  getZonedParts,
  parseDateKey,
  zonedDateKey,
  zonedWallTimeToUtc,
} from "./timezone"

test("Karachi wall time converts to the right UTC instant", () => {
  const d = zonedWallTimeToUtc(2026, 10, 12, 10, 30, "Asia/Karachi")
  assert.equal(d.toISOString(), "2026-10-12T05:30:00.000Z")
})

test("getZonedParts round-trips", () => {
  const d = new Date("2026-10-12T20:15:00.000Z") // 01:15 next day in Karachi
  const p = getZonedParts(d, "Asia/Karachi")
  assert.deepEqual([p.year, p.month, p.day, p.hour, p.minute], [2026, 10, 13, 1, 15])
  assert.equal(zonedDateKey(d, "Asia/Karachi"), "2026-10-13")
})

test("date key helpers", () => {
  assert.equal(dateKeyWeekday("2026-10-12"), 1) // Monday
  assert.equal(addDaysToDateKey("2026-10-31", 1), "2026-11-01")
  assert.equal(addDaysToDateKey("2026-12-31", 1), "2027-01-01")
  assert.throws(() => parseDateKey("2026-02-30"))
})

test("dateKeyMinuteToUtc handles a DST zone", () => {
  // New York is UTC-4 in October (EDT), 09:00 local -> 13:00Z
  assert.equal(dateKeyMinuteToUtc("2026-10-12", 9 * 60, "America/New_York").toISOString(), "2026-10-12T13:00:00.000Z")
  // ... and UTC-5 after the November switch
  assert.equal(dateKeyMinuteToUtc("2026-11-10", 9 * 60, "America/New_York").toISOString(), "2026-11-10T14:00:00.000Z")
})
