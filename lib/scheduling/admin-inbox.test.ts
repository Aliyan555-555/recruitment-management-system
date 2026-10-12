import test from "node:test"
import assert from "node:assert/strict"
import { buildInbox, type RoundFacts } from "./admin-inbox"

const round = (over: Partial<RoundFacts> = {}): RoundFacts => ({
  jobId: "1",
  jobTitle: "Backend Engineer",
  stepId: "10",
  stepName: "Screening",
  isInterview: true,
  newApplicants: 0,
  readyForDecision: 0,
  awaitingBooking: 0,
  freeSeats: 0,
  openSlots: 0,
  ...over,
})

test("nothing to do gives an empty inbox", () => {
  assert.deepEqual(buildInbox({ rounds: [round({ freeSeats: 5, openSlots: 5 })], interviewersWithoutAvailability: [], overdueScorecards: 0 }), [])
})

test("items link to the screen that fixes them and are sorted by priority", () => {
  const items = buildInbox({
    rounds: [
      round({ newApplicants: 18, awaitingBooking: 12, freeSeats: 5, openSlots: 3 }),
      round({ stepId: "11", stepName: "Focus Group", readyForDecision: 25 }),
    ],
    interviewersWithoutAvailability: ["Ali", "Sara"],
    overdueScorecards: 4,
  })
  assert.deepEqual(
    items.map((i) => i.id),
    ["decide-11", "seats-10", "availability", "review-10", "scorecards"]
  )
  assert.equal(items[0].href, "/admin/jobs/1/rounds/11/results")
  assert.equal(items[0].title, "25 candidates ready for a decision")
  assert.equal(items[0].context, "Backend Engineer › Focus Group")
  assert.equal(items[1].href, "/admin/jobs/1/rounds/10/schedule")
  assert.match(items[1].title, /12 candidates waiting, only 5 free seats/)
  assert.match(items[2].title, /2 interviewers have not shared availability: Ali, Sara/)
})

test("no seats message when nothing is open; non-interview rounds never ask for slots", () => {
  const [item] = buildInbox({ rounds: [round({ awaitingBooking: 3 })], interviewersWithoutAvailability: [], overdueScorecards: 0 })
  assert.match(item.title, /no interview slots open/)
  assert.deepEqual(buildInbox({ rounds: [round({ isInterview: false, awaitingBooking: 3 })], interviewersWithoutAvailability: [], overdueScorecards: 0 }), [])
})
