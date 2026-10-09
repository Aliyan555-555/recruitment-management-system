import test from "node:test"
import assert from "node:assert/strict"
import { generateSlots, summarizeDrafts, type GeneratorInput, type GeneratorInterviewer } from "./slot-generator"
import { zonedDateKey } from "../timezone"

const TZ = "Asia/Karachi"
// 2026-10-12 is a Monday
const NOW = new Date("2026-10-11T00:00:00.000Z")

function iv(id: string, partial: Partial<GeneratorInterviewer> = {}): GeneratorInterviewer {
  return {
    id,
    availability: [{ dayOfWeek: 1, startMinute: 9 * 60, endMinute: 12 * 60 }], // Mondays 09:00-12:00
    timeOff: [],
    busy: [],
    load: 0,
    ...partial,
  }
}

function input(partial: Partial<GeneratorInput> = {}): GeneratorInput {
  return {
    timeZone: TZ,
    fromDate: "2026-10-12",
    toDate: "2026-10-12",
    durationMins: 30,
    bufferMins: 0,
    panelSize: 1,
    capacity: 1,
    now: NOW,
    minLeadMins: 60,
    interviewers: [iv("1")],
    ...partial,
  }
}

const hhmm = (d: Date) => d.toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false })

test("1:1 slots fill the window back to back", () => {
  const drafts = generateSlots(input())
  assert.equal(drafts.length, 6)
  assert.equal(hhmm(drafts[0].startsAt), "09:00")
  assert.equal(hhmm(drafts[5].endsAt), "12:00")
  assert.ok(drafts.every((d) => d.interviewerIds.length === 1 && d.capacity === 1))
})

test("buffer spaces slots and the last slot must still fit the window", () => {
  const drafts = generateSlots(input({ bufferMins: 15 }))
  // 09:00, 09:45, 10:30, 11:15 (ends 11:45); 12:00 would not fit
  assert.deepEqual(drafts.map((d) => hhmm(d.startsAt)), ["09:00", "09:45", "10:30", "11:15"])
})

test("only the matching weekday produces slots", () => {
  assert.equal(generateSlots(input({ fromDate: "2026-10-13", toDate: "2026-10-13" })).length, 0) // Tuesday
})

test("one-off date windows work and are in addition to weekly rules", () => {
  const drafts = generateSlots(
    input({
      fromDate: "2026-10-13",
      toDate: "2026-10-13",
      interviewers: [iv("1", { availability: [{ date: "2026-10-13", startMinute: 14 * 60, endMinute: 15 * 60 }] })],
    })
  )
  assert.deepEqual(drafts.map((d) => hhmm(d.startsAt)), ["14:00", "14:30"])
})

test("time off and already-booked time are excluded", () => {
  const start = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 12, h - 5, m)) // PKT -> UTC
  const drafts = generateSlots(
    input({
      interviewers: [
        iv("1", {
          timeOff: [{ startsAt: start(9), endsAt: start(10) }],
          busy: [{ startsAt: start(11), endsAt: start(11, 30) }],
        }),
      ],
    })
  )
  assert.deepEqual(drafts.map((d) => hhmm(d.startsAt)), ["10:00", "10:30", "11:30"])
})

test("busy time pads the buffer so back-to-back stays spaced", () => {
  const start = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 12, h - 5, m))
  const drafts = generateSlots(input({ bufferMins: 10, interviewers: [iv("1", { busy: [{ startsAt: start(10), endsAt: start(10, 30) }] })] }))
  for (const d of drafts) {
    const overlapsPadded = d.startsAt < start(10, 40) && d.endsAt > start(9, 50)
    assert.equal(overlapsPadded, false, `${hhmm(d.startsAt)} too close to the booked interview`)
  }
})

test("lead time drops slots that start too soon", () => {
  const now = new Date(Date.UTC(2026, 9, 12, 4, 0)) // 09:00 PKT
  const drafts = generateSlots(input({ now, minLeadMins: 90 }))
  assert.equal(hhmm(drafts[0].startsAt), "10:30")
})

test("panel slots need the whole panel free at once and rotate by load", () => {
  const drafts = generateSlots(
    input({
      panelSize: 2,
      capacity: 6,
      interviewers: [
        iv("1"),
        iv("2", { availability: [{ dayOfWeek: 1, startMinute: 10 * 60, endMinute: 12 * 60 }] }),
        iv("3", { load: 5 }),
      ],
    })
  )
  // 09:00 only interviewers 1 and 3 are free; from 10:00 all three are, the least loaded pair is used
  assert.equal(hhmm(drafts[0].startsAt), "09:00")
  assert.deepEqual([...drafts[0].interviewerIds].sort(), ["1", "3"])
  assert.ok(drafts.every((d) => d.interviewerIds.length === 2 && d.capacity === 6))
  const second = drafts.find((d) => hhmm(d.startsAt) === "10:00")!
  assert.ok(second.interviewerIds.includes("2"))
})

test("a panel is never formed when too few interviewers overlap", () => {
  const drafts = generateSlots(input({ panelSize: 2, interviewers: [iv("1"), iv("2", { availability: [{ dayOfWeek: 2, startMinute: 540, endMinute: 720 }] })] }))
  assert.equal(drafts.length, 0)
})

test("re-running with existing slots as busy time creates no duplicates", () => {
  const first = generateSlots(input())
  const second = generateSlots(input({ interviewers: [iv("1", { busy: first.map((d) => ({ startsAt: d.startsAt, endsAt: d.endsAt })) })] }))
  assert.equal(second.length, 0)
})

test("range limits and summary", () => {
  assert.throws(() => generateSlots(input({ fromDate: "2026-10-01", toDate: "2027-03-01" })))
  const drafts = generateSlots(input())
  const summary = summarizeDrafts(drafts, (d) => zonedDateKey(d, TZ))
  assert.equal(summary.total, 6)
  assert.deepEqual(summary.perDay, [{ date: "2026-10-12", count: 6 }])
  assert.equal(summary.interviewersUsed, 1)
})
