import test from "node:test"
import assert from "node:assert/strict"
import { evaluateReadiness, type ReadinessInput } from "./round-readiness"

const base: ReadinessInput = {
  interviewMode: "REMOTE",
  meetingLink: "https://meet.example/x",
  location: null,
  panelSize: 1,
  pool: [
    { id: "1", name: "Ali", hasAvailability: true },
    { id: "2", name: "Sara", hasAvailability: true },
  ],
  openSlots: 10,
  freeSeats: 10,
  awaitingBooking: 3,
}

const byId = (r: ReturnType<typeof evaluateReadiness>, id: string) => r.items.find((i) => i.id === id)

test("a fully set up round is ready with all ok", () => {
  const r = evaluateReadiness(base)
  assert.equal(r.ready, true)
  assert.ok(r.items.every((i) => i.status === "ok"))
})

test("missing link / location blocks with an edit action", () => {
  const remote = evaluateReadiness({ ...base, meetingLink: null })
  assert.equal(remote.ready, false)
  assert.equal(byId(remote, "setup")?.action?.kind, "EDIT_JOB")
  const onsite = evaluateReadiness({ ...base, interviewMode: "ONSITE" })
  assert.match(byId(onsite, "setup")!.title, /location/)
  assert.equal(evaluateReadiness({ ...base, interviewMode: null }).ready, false)
})

test("pool must cover the panel size", () => {
  assert.equal(byId(evaluateReadiness({ ...base, pool: [] }), "pool")?.status, "todo")
  const small = evaluateReadiness({ ...base, panelSize: 3 })
  assert.equal(byId(small, "pool")?.status, "todo")
  assert.match(byId(small, "pool")!.title, /3 needed/)
})

test("missing availability warns, and blocks only when too few people remain", () => {
  const one = evaluateReadiness({ ...base, pool: [base.pool[0], { id: "2", name: "Sara", hasAvailability: false }] })
  const item = byId(one, "availability")!
  assert.equal(item.status, "warn")
  assert.equal(item.action?.kind, "REMIND_AVAILABILITY")
  assert.deepEqual(item.action?.kind === "REMIND_AVAILABILITY" && item.action.interviewerIds, ["2"])
  assert.equal(one.ready, true)

  const panel = evaluateReadiness({ ...base, panelSize: 2, pool: [base.pool[0], { id: "2", name: "Sara", hasAvailability: false }] })
  assert.equal(byId(panel, "availability")?.status, "todo")
})

test("no slots blocks; too few seats warns", () => {
  const none = evaluateReadiness({ ...base, openSlots: 0, freeSeats: 0 })
  assert.equal(none.ready, false)
  assert.equal(byId(none, "slots")?.action?.kind, "PUBLISH")
  assert.equal(byId(none, "seats"), undefined)

  const few = evaluateReadiness({ ...base, freeSeats: 2, awaitingBooking: 12 })
  assert.equal(few.ready, true)
  assert.match(byId(few, "seats")!.title, /12 candidates waiting, only 2 free seats/)
})

test("an empty pool points the admin to the interviewer picker on the round", () => {
  assert.equal(byId(evaluateReadiness({ ...base, pool: [] }), "pool")?.action?.kind, "ASSIGN_INTERVIEWERS")
})
