import test from "node:test"
import assert from "node:assert/strict"
import { parseStepMetadata, readStepConfig, toPublicStep, validateStepConfig } from "./step-config"

test("readStepConfig prefers columns and falls back to legacy metadata", () => {
  const cfg = readStepConfig({
    stepType: "SCREENING_INTERVIEW",
    isRequired: false,
    stepMetadata: { durationMins: "45", interviewMode: "remote", meetingLink: " https://meet.example/x ", junk: 1 },
  })
  assert.equal(cfg.durationMins, 45)
  assert.equal(cfg.interviewMode, "REMOTE")
  assert.equal(cfg.meetingLink, "https://meet.example/x")
  assert.equal(cfg.panelSize, 1)
  assert.equal(cfg.groupSize, 1)

  const cols = readStepConfig({
    stepType: "FOCUS_GROUP",
    isRequired: true,
    durationMins: 60,
    panelSize: 3,
    capacityPerSlot: 8,
    interviewMode: "ONSITE",
    stepMetadata: { durationMins: 10 },
  })
  assert.equal(cols.durationMins, 60)
  assert.equal(cols.panelSize, 3)
  assert.equal(cols.groupSize, 8)
})

test("parseStepMetadata survives garbage", () => {
  assert.deepEqual(parseStepMetadata(null), {})
  assert.deepEqual(parseStepMetadata("x"), {})
  assert.equal(parseStepMetadata({ weightage: "abc" }).weightage, undefined)
})

test("public step never leaks links or interviewers", () => {
  const pub = toPublicStep({
    stepType: "SCREENING_INTERVIEW",
    isRequired: true,
    interviewMode: "REMOTE",
    durationMins: 30,
    stepMetadata: { meetingLink: "https://secret", interviewerIds: ["1"], interviewerInstructions: "x" },
  })
  assert.equal(JSON.stringify(pub).includes("secret"), false)
  assert.equal("interviewerIds" in pub, false)
})

test("validateStepConfig", () => {
  assert.deepEqual(validateStepConfig({ stepType: "OFFER" }), [])
  assert.ok(validateStepConfig({ stepType: "SCREENING_INTERVIEW", durationMins: 30 }).some((e) => /mode/i.test(e)))
  assert.ok(validateStepConfig({ stepType: "SCREENING_INTERVIEW", interviewMode: "REMOTE", durationMins: 30 }).some((e) => /meeting link/i.test(e)))
  assert.ok(validateStepConfig({ stepType: "SCREENING_INTERVIEW", interviewMode: "ONSITE", durationMins: 30 }).some((e) => /location/i.test(e)))
  assert.ok(
    validateStepConfig({ stepType: "SCREENING_INTERVIEW", interviewMode: "ONSITE", location: "HQ", durationMins: 30, panelSize: 2 }).some(
      (e) => /exactly one/i.test(e)
    )
  )
  assert.ok(
    validateStepConfig({ stepType: "FOCUS_GROUP", interviewMode: "ONSITE", location: "HQ", durationMins: 60, panelSize: 1 }).some((e) =>
      /at least 2/i.test(e)
    )
  )
  assert.deepEqual(
    validateStepConfig({
      stepType: "FOCUS_GROUP",
      interviewMode: "REMOTE",
      durationMins: 60,
      panelSize: 3,
      groupSize: 8,
      meetingLink: "https://meet.example/a",
      interviewerIds: [1, 2, 3, 4],
    }),
    []
  )
  assert.ok(
    validateStepConfig({
      stepType: "FOCUS_GROUP",
      interviewMode: "REMOTE",
      durationMins: 60,
      panelSize: 3,
      interviewerIds: [1, 2],
    }).some((e) => /pool/i.test(e))
  )
})
