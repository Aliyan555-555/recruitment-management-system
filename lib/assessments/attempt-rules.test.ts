import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { SkillAssessment } from "@prisma/client"
import {
  getCooldownEndsAt,
  isCooldownActive,
} from "./attempt-rules"

function mockAttempt(submittedAt: bigint): SkillAssessment {
  return {
    id: BigInt(1),
    userSkillId: BigInt(1),
    userId: BigInt(1),
    skillName: "React",
    status: "FAILED",
    attemptNumber: 1,
    minPoints: 60,
    maxPoints: 100,
    totalPoints: 100,
    scoredPoints: 40,
    level: null,
    startedAt: submittedAt - BigInt(3600),
    submittedAt,
    expiresAt: null,
    createdAt: submittedAt,
    updatedAt: submittedAt,
  }
}

describe("isCooldownActive", () => {
  it("returns false when there is no prior attempt", () => {
    assert.equal(isCooldownActive(null, 24, BigInt(1_000_000)), false)
  })

  it("returns true inside the cooldown window", () => {
    const submittedAt = BigInt(1_000_000)
    const now = submittedAt + BigInt(3600)
    assert.equal(isCooldownActive(mockAttempt(submittedAt), 24, now), true)
  })

  it("returns false after cooldown expires", () => {
    const submittedAt = BigInt(1_000_000)
    const now = submittedAt + BigInt(24 * 60 * 60 + 1)
    assert.equal(isCooldownActive(mockAttempt(submittedAt), 24, now), false)
  })
})

describe("getCooldownEndsAt", () => {
  it("returns submittedAt plus cooldown hours", () => {
    const submittedAt = BigInt(1_000_000)
    assert.equal(
      getCooldownEndsAt(mockAttempt(submittedAt), 24),
      submittedAt + BigInt(24 * 60 * 60)
    )
  })

  it("returns null without a submitted attempt", () => {
    assert.equal(getCooldownEndsAt(null, 24), null)
  })
})
