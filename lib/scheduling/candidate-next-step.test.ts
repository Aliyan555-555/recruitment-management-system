import test from "node:test"
import assert from "node:assert/strict"
import { computeNextStep, mostUrgent, type NextStepInput } from "./candidate-next-step"

const NOW = new Date("2026-10-12T05:00:00.000Z")
const H = 3600_000

const input = (over: Partial<NextStepInput> = {}): NextStepInput => ({
  pipelineId: "7",
  jobTitle: "Backend Engineer",
  overallStatus: "IN_PROGRESS",
  lockState: "NONE",
  stepName: "Screening Interview",
  stepStatus: "IN_PROGRESS",
  isInterview: true,
  booking: null,
  freeSeats: 4,
  letterStatus: null,
  now: NOW,
  ...over,
})

test("admitted with free seats: book now", () => {
  const s = computeNextStep(input())
  assert.equal(s.kind, "BOOK_INTERVIEW")
  assert.deepEqual(s.cta, { label: "Book now", href: "/applications/7" })
})

test("admitted, no seats yet: slots opening soon", () => {
  assert.equal(computeNextStep(input({ freeSeats: 0 })).kind, "SLOTS_OPENING_SOON")
})

test("booked: later, within a day, joinable, finished", () => {
  const booking = (startInH: number) => ({
    startsAt: new Date(NOW.getTime() + startInH * H),
    endsAt: new Date(NOW.getTime() + (startInH + 0.5) * H),
    meetingLink: "https://meet.example/x",
  })
  assert.equal(computeNextStep(input({ booking: booking(48) })).kind, "INTERVIEW_BOOKED")
  const soon = computeNextStep(input({ booking: booking(5) }))
  assert.equal(soon.kind, "INTERVIEW_SOON")
  assert.equal(soon.cta?.label, "Details")
  assert.equal(computeNextStep(input({ booking: booking(0.1) })).cta?.label, "Join now")
  assert.equal(computeNextStep(input({ booking: booking(-2) })).kind, "AWAITING_RESULT")
})

test("scored, review, offer and closed states", () => {
  assert.equal(computeNextStep(input({ stepStatus: "COMPLETED" })).kind, "AWAITING_RESULT")
  assert.equal(computeNextStep(input({ stepStatus: "PENDING" })).kind, "IN_REVIEW")
  assert.equal(computeNextStep(input({ isInterview: false, stepName: "Offer" })).kind, "IN_REVIEW")
  assert.equal(computeNextStep(input({ letterStatus: "SENT" })).kind, "RESPOND_TO_OFFER")
  const closed = computeNextStep(input({ overallStatus: "REJECTED", lockState: "LOCKED_REJECTED" }))
  assert.equal(closed.kind, "CLOSED")
  assert.equal(closed.priority, null)
})

test("most urgent across applications", () => {
  const steps = [
    computeNextStep(input({ pipelineId: "1", stepStatus: "PENDING" })),
    computeNextStep(input({ pipelineId: "2" })),
    computeNextStep(input({ pipelineId: "3", letterStatus: "SENT" })),
    computeNextStep(input({ pipelineId: "4", overallStatus: "REJECTED" })),
  ]
  assert.equal(mostUrgent(steps)?.pipelineId, "3")
  assert.equal(mostUrgent([steps[3]]), null)
})
