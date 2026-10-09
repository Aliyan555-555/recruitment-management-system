import test from "node:test"
import assert from "node:assert/strict"
import { validateAvailability } from "./availability-rules"

const TODAY = "2026-10-12"

test("accepts clean weekly and one-off windows", () => {
  assert.equal(
    validateAvailability(
      {
        weekly: [
          { dayOfWeek: 1, startMinute: 540, endMinute: 720 },
          { dayOfWeek: 1, startMinute: 780, endMinute: 1020 },
        ],
        oneOff: [{ date: "2026-10-20", startMinute: 600, endMinute: 660 }],
      },
      TODAY
    ),
    null
  )
})

test("rejects overlaps, tiny windows, bad days and past dates", () => {
  const base = { oneOff: [] }
  assert.match(validateAvailability({ ...base, weekly: [{ dayOfWeek: 1, startMinute: 540, endMinute: 700 }, { dayOfWeek: 1, startMinute: 650, endMinute: 800 }] }, TODAY)!, /overlap/)
  assert.match(validateAvailability({ ...base, weekly: [{ dayOfWeek: 1, startMinute: 540, endMinute: 550 }] }, TODAY)!, /at least/)
  assert.match(validateAvailability({ ...base, weekly: [{ dayOfWeek: 7, startMinute: 540, endMinute: 600 }] }, TODAY)!, /day of week/)
  assert.match(validateAvailability({ ...base, weekly: [{ dayOfWeek: 1, startMinute: 1300, endMinute: 1500 }] }, TODAY)!, /single day/)
  assert.match(validateAvailability({ weekly: [], oneOff: [{ date: "2026-10-01", startMinute: 540, endMinute: 600 }] }, TODAY)!, /past/)
  assert.match(validateAvailability({ weekly: [], oneOff: [{ date: "2026-02-31", startMinute: 540, endMinute: 600 }] }, TODAY)!, /Invalid date/)
})
