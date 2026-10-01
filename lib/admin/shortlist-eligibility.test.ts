import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  formatShortlistBlockedReason,
  getShortlistEligibility,
  isShortlistActionable,
  pickCurrentStepStatus,
} from "./shortlist-eligibility"

describe("getShortlistEligibility", () => {
  it("allows APPLIED candidates with no pipeline (bulk jobs)", () => {
    const result = getShortlistEligibility({ applicationStatus: "APPLIED" })
    assert.equal(result.actionable, true)
    assert.equal(result.actionBlockedReason, null)
    assert.equal(result.statusLabel, "Needs review")
    assert.equal(result.queueTab, "applied")
  })

  it("allows SUBMITTED candidates still pending at step 1", () => {
    const result = getShortlistEligibility({
      applicationStatus: "SUBMITTED",
      pipeline: {
        overallStatus: "IN_PROGRESS",
        lockState: "NONE",
        currentStepOrder: 1,
        currentStepStatus: "PENDING",
      },
    })
    assert.equal(result.actionable, true)
    assert.equal(result.queueTab, "applied")
  })

  it("blocks hired candidates even if application is still SUBMITTED", () => {
    const result = getShortlistEligibility({
      applicationStatus: "SUBMITTED",
      pipeline: {
        overallStatus: "COMPLETED",
        lockState: "NONE",
        currentStepOrder: 3,
        currentStepStatus: "COMPLETED",
      },
    })
    assert.equal(result.actionable, false)
    assert.equal(result.actionBlockedReason, "HIRED")
    assert.equal(result.statusLabel, "Hired")
    assert.equal(result.queueTab, "shortlisted")
  })

  it("blocks hired candidates whose application is still SHORTLISTED", () => {
    const result = getShortlistEligibility({
      applicationStatus: "SHORTLISTED",
      pipeline: {
        overallStatus: "COMPLETED",
        lockState: "NONE",
        currentStepOrder: 4,
        currentStepStatus: "COMPLETED",
      },
    })
    assert.equal(isShortlistActionable({
      applicationStatus: "SHORTLISTED",
      pipeline: {
        overallStatus: "COMPLETED",
        lockState: "NONE",
      },
    }), false)
    assert.equal(result.actionBlockedReason, "HIRED")
  })

  it("blocks rejected / locked pipelines", () => {
    const rejected = getShortlistEligibility({
      applicationStatus: "SUBMITTED",
      pipeline: {
        overallStatus: "REJECTED",
        lockState: "LOCKED_REJECTED",
        currentStepOrder: 1,
        currentStepStatus: "REJECTED",
      },
    })
    assert.equal(rejected.actionable, false)
    assert.equal(rejected.actionBlockedReason, "REJECTED")
    assert.equal(rejected.queueTab, "rejected")

    const locked = getShortlistEligibility({
      applicationStatus: "SHORTLISTED",
      pipeline: {
        overallStatus: "IN_PROGRESS",
        lockState: "LOCKED_REJECTED",
        currentStepOrder: 1,
        currentStepStatus: "PENDING",
      },
    })
    assert.equal(locked.actionBlockedReason, "REJECTED")
  })

  it("blocks on-hold pipelines", () => {
    const result = getShortlistEligibility({
      applicationStatus: "SUBMITTED",
      pipeline: {
        overallStatus: "ON_HOLD",
        lockState: "NONE",
        currentStepOrder: 1,
        currentStepStatus: "PENDING",
      },
    })
    assert.equal(result.actionable, false)
    assert.equal(result.actionBlockedReason, "ON_HOLD")
    assert.equal(result.statusLabel, "On hold")
    assert.equal(result.queueTab, "shortlisted")
  })

  it("blocks candidates already in a later round", () => {
    const inProgress = getShortlistEligibility({
      applicationStatus: "SUBMITTED",
      pipeline: {
        overallStatus: "IN_PROGRESS",
        lockState: "NONE",
        currentStepOrder: 1,
        currentStepStatus: "IN_PROGRESS",
      },
    })
    assert.equal(inProgress.actionBlockedReason, "IN_LATER_ROUND")
    assert.equal(inProgress.queueTab, "shortlisted")

    const laterStep = getShortlistEligibility({
      applicationStatus: "SHORTLISTED",
      pipeline: {
        overallStatus: "IN_PROGRESS",
        lockState: "NONE",
        currentStepOrder: 2,
        currentStepStatus: "PENDING",
      },
    })
    assert.equal(laterStep.actionBlockedReason, "IN_LATER_ROUND")
  })

  it("blocks already-shortlisted candidates who have not entered a round", () => {
    const result = getShortlistEligibility({
      applicationStatus: "SHORTLISTED",
      pipeline: {
        overallStatus: "IN_PROGRESS",
        lockState: "NONE",
        currentStepOrder: 1,
        currentStepStatus: "PENDING",
      },
    })
    assert.equal(result.actionable, false)
    assert.equal(result.actionBlockedReason, "ALREADY_SHORTLISTED")
    assert.equal(result.queueTab, "shortlisted")
  })

  it("blocks BATCH_ASSIGNED as already shortlisted", () => {
    const result = getShortlistEligibility({
      applicationStatus: "BATCH_ASSIGNED",
    })
    assert.equal(result.actionBlockedReason, "ALREADY_SHORTLISTED")
  })

  it("blocks REMOVED applications as rejected", () => {
    const result = getShortlistEligibility({ applicationStatus: "REMOVED" })
    assert.equal(result.actionable, false)
    assert.equal(result.actionBlockedReason, "REJECTED")
    assert.equal(result.queueTab, "rejected")
  })
})

describe("formatShortlistBlockedReason", () => {
  it("maps reasons to UI labels", () => {
    assert.equal(formatShortlistBlockedReason("HIRED"), "Hired")
    assert.equal(formatShortlistBlockedReason("REJECTED"), "Rejected")
    assert.equal(formatShortlistBlockedReason("ON_HOLD"), "On hold")
    assert.equal(formatShortlistBlockedReason("IN_LATER_ROUND"), "In later round")
    assert.equal(formatShortlistBlockedReason("ALREADY_SHORTLISTED"), "Already shortlisted")
    assert.equal(formatShortlistBlockedReason(null), null)
  })
})

describe("pickCurrentStepStatus", () => {
  it("returns the status for the current step order", () => {
    assert.equal(
      pickCurrentStepStatus(2, [
        { stepOrder: 1, status: "COMPLETED" },
        { stepOrder: 2, status: "PENDING" },
      ]),
      "PENDING"
    )
    assert.equal(pickCurrentStepStatus(1, []), null)
  })
})
