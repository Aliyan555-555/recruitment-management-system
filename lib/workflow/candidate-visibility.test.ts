import { test } from "node:test"
import assert from "node:assert/strict"
import { candidateRoundName, candidateRoundPhrase, filterStepsForCandidate, HIDDEN_ROUND_NAME, isCandidateShortlisted } from "./candidate-visibility"
import { readStepConfig } from "./step-config"
import { buildStepMetadata, normalizeStep, resolveCustomRounds, validateWorkflow, type WorkflowStepPayload } from "./step-persistence"

test("applications not yet admitted are not shortlisted", () => {
  assert.equal(
    isCandidateShortlisted({ applicationStatus: "SUBMITTED", pipelineSteps: [{ status: "PENDING", stepOrder: 1 }] }),
    false
  )
  // rejected during screening: never shortlisted
  assert.equal(
    isCandidateShortlisted({ applicationStatus: "REMOVED", pipelineSteps: [{ status: "REJECTED", stepOrder: 1 }] }),
    false
  )
})

test("shortlisted, admitted, progressed or interviewed candidates are shortlisted", () => {
  assert.equal(isCandidateShortlisted({ applicationStatus: "SHORTLISTED", pipelineSteps: [] }), true)
  assert.equal(isCandidateShortlisted({ applicationStatus: "BATCH_ASSIGNED", pipelineSteps: [] }), true)
  assert.equal(isCandidateShortlisted({ applicationStatus: "REMOVED", pipelineSteps: [{ status: "COMPLETED", stepOrder: 1 }] }), true)
  assert.equal(isCandidateShortlisted({ applicationStatus: "REMOVED", pipelineSteps: [{ status: "REJECTED", stepOrder: 2 }] }), true)
  assert.equal(isCandidateShortlisted({ applicationStatus: "REMOVED", pipelineSteps: [{ status: "REJECTED", stepOrder: 1 }], hasBooking: true }), true)
})

test("no rounds before shortlisting, all rounds after", () => {
  const steps = [{ name: "a" }, { name: "b" }]
  assert.deepEqual(filterStepsForCandidate(steps, false), [])
  assert.equal(filterStepsForCandidate(steps, true).length, 2)
})

test("a round with its name switched off appears as Hidden round", () => {
  assert.equal(candidateRoundName({ stepName: "Screening Interview", showName: true }), "Screening Interview")
  assert.equal(candidateRoundName({ stepName: "Screening Interview", showName: false }), HIDDEN_ROUND_NAME)
  assert.equal(candidateRoundPhrase({ stepName: "Focus Group", showName: true }), "Focus Group")
  assert.equal(candidateRoundPhrase({ stepName: "Focus Group", showName: false }), "next round")
})

test("showName defaults to shown and round-trips through step metadata", () => {
  assert.equal(readStepConfig({ stepType: "SCREENING_INTERVIEW", isRequired: true, stepMetadata: {} }).showName, true)
  const off = buildStepMetadata(normalizeStep({ stepType: "SCREENING_INTERVIEW", stepOrder: 1, showName: false } as WorkflowStepPayload))
  assert.equal(readStepConfig({ stepType: "SCREENING_INTERVIEW", isRequired: true, stepMetadata: off }).showName, false)
  const on = buildStepMetadata(normalizeStep({ stepType: "SCREENING_INTERVIEW", stepOrder: 1, showName: true } as WorkflowStepPayload))
  assert.equal(readStepConfig({ stepType: "SCREENING_INTERVIEW", isRequired: true, stepMetadata: on }).showName, true)
})

const template = {
  id: BigInt(7),
  name: "Technical assessment",
  description: null,
  candidateInstructions: "Bring a laptop",
  isInterview: true,
  interviewMode: "ONSITE",
  durationMins: 45 as number | null,
  panelSize: 2,
  bufferMins: 10,
  capacityPerSlot: 1,
  evaluationSchema: { fields: [], recommendationEnabled: true },
  isActive: true,
}
const reader = (rows = [template]) => ({ customRoundTemplate: { findMany: async () => rows } })

test("custom rounds resolve from the template, may repeat, and run scheduling validation", async () => {
  const steps: WorkflowStepPayload[] = [
    { stepType: "CUSTOM", stepOrder: 1, customRoundTemplateId: "7", location: "HQ" },
    { stepType: "CUSTOM", stepOrder: 2, customRoundTemplateId: "7", location: "HQ" },
    { stepType: "OFFER", stepOrder: 3 },
  ]
  assert.equal(await resolveCustomRounds(reader(), steps), null)
  assert.equal(steps[0]!.durationMins, 45)
  assert.equal(validateWorkflow(steps), null)
  const normalized = normalizeStep(steps[0]!)
  assert.equal(normalized.groupSize, 1)
  assert.equal(normalized.panelSize, 2)
})

test("custom round problems: unknown, inactive, forged client data and bad scheduling", async () => {
  assert.match((await resolveCustomRounds(reader([]), [{ stepType: "CUSTOM", stepOrder: 1, customRoundTemplateId: "7" }]))!, /no longer exists/)
  assert.match(
    (await resolveCustomRounds(reader([{ ...template, isActive: false }]), [{ stepType: "CUSTOM", stepOrder: 1, customRoundTemplateId: "7" }]))!,
    /deactivated/
  )
  // an inactive template stays usable for a job that already has it
  assert.equal(
    await resolveCustomRounds(reader([{ ...template, isActive: false }]), [{ stepType: "CUSTOM", stepOrder: 1, customRoundTemplateId: "7" }], new Set(["7"])),
    null
  )

  const forged: WorkflowStepPayload[] = [
    {
      stepType: "CUSTOM",
      stepOrder: 1,
      customRoundTemplateId: "7",
      customRound: { templateId: "7", name: "Hacked", isInterview: false } as any,
      location: "HQ",
    },
    { stepType: "OFFER", stepOrder: 2 },
  ]
  await resolveCustomRounds(reader(), forged)
  assert.equal(forged[0]!.customRound?.name, "Technical assessment")
  assert.equal(forged[0]!.customRound?.isInterview, true)

  assert.match(validateWorkflow([{ stepType: "CUSTOM", stepOrder: 1 }, { stepType: "OFFER", stepOrder: 2 }])!, /custom round/i)
  // interview custom round without a location/link fails the same checks as built-in interviews
  const noLocation: WorkflowStepPayload[] = [
    { stepType: "CUSTOM", stepOrder: 1, customRoundTemplateId: "7" },
    { stepType: "OFFER", stepOrder: 2 },
  ]
  await resolveCustomRounds(reader(), noLocation)
  assert.match(validateWorkflow(noLocation)!, /location/i)
})

test("a non-scheduled custom round carries no interview settings", async () => {
  const steps: WorkflowStepPayload[] = [
    { stepType: "CUSTOM", stepOrder: 1, customRoundTemplateId: "7", durationMins: 99 },
    { stepType: "OFFER", stepOrder: 2 },
  ]
  await resolveCustomRounds(reader([{ ...template, isInterview: false, durationMins: null }]), steps)
  assert.equal(validateWorkflow(steps), null)
  const normalized = normalizeStep(steps[0]!)
  assert.equal(normalized.durationMins, null)
  assert.equal(readStepConfig({ stepType: "CUSTOM", isRequired: true, durationMins: null }).isInterview, false)
  assert.equal(readStepConfig({ stepType: "CUSTOM", isRequired: true, durationMins: 45 }).isInterview, true)
})
