import { test } from "node:test"
import assert from "node:assert/strict"
import {
  calculatePercent,
  computeExpiresAt,
  distributeCount,
  getRemainingSeconds,
  isFinalStatus,
  isPastDeadline,
  quickTestConfigSchema,
  toCandidateState,
} from "./rules"

test("computeExpiresAt adds the time limit in seconds", () => {
  assert.equal(computeExpiresAt(1000, 15), 1000 + 900)
})

test("getRemainingSeconds never goes negative", () => {
  assert.equal(getRemainingSeconds(BigInt(1100), 1000), 100)
  assert.equal(getRemainingSeconds(BigInt(1100), 1200), 0)
})

test("isPastDeadline honours the grace window", () => {
  assert.equal(isPastDeadline(BigInt(1000), 1000, 15), false)
  assert.equal(isPastDeadline(BigInt(1000), 1015, 15), false)
  assert.equal(isPastDeadline(BigInt(1000), 1016, 15), true)
})

test("status helpers", () => {
  assert.equal(isFinalStatus("IN_PROGRESS"), false)
  assert.equal(isFinalStatus("SUBMITTED"), true)
  assert.equal(isFinalStatus("EXPIRED"), true)
  assert.equal(toCandidateState(null), "NOT_STARTED")
  assert.equal(toCandidateState("IN_PROGRESS"), "IN_PROGRESS")
  assert.equal(toCandidateState("EXPIRED"), "COMPLETED")
})

test("calculatePercent clamps and rounds", () => {
  assert.equal(calculatePercent(0, 100), 0)
  assert.equal(calculatePercent(67, 100), 67)
  assert.equal(calculatePercent(2, 3), 67)
  assert.equal(calculatePercent(10, 0), 0)
  assert.equal(calculatePercent(150, 100), 100)
})

test("distributeCount spreads evenly and drops empty buckets", () => {
  assert.deepEqual(distributeCount(10, 3), [4, 3, 3])
  assert.deepEqual(distributeCount(2, 5), [1, 1])
  assert.deepEqual(distributeCount(0, 3), [])
  assert.deepEqual(distributeCount(5, 0), [])
})

test("quickTestConfigSchema applies defaults and rejects out-of-range values", () => {
  const parsed = quickTestConfigSchema.parse({ enabled: true })
  assert.equal(parsed.questionCount, 10)
  assert.equal(parsed.timeLimitMinutes, 15)
  assert.equal(quickTestConfigSchema.safeParse({ enabled: true, questionCount: 2 }).success, false)
  assert.equal(quickTestConfigSchema.safeParse({ enabled: true, questionCount: 31 }).success, false)
  assert.equal(quickTestConfigSchema.safeParse({ enabled: true, timeLimitMinutes: 4 }).success, false)
  assert.equal(quickTestConfigSchema.safeParse({ enabled: true, timeLimitMinutes: 91 }).success, false)
  assert.equal(quickTestConfigSchema.safeParse({ enabled: true, questionCount: 7.5 }).success, false)
})
