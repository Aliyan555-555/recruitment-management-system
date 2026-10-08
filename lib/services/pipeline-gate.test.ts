import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  admitToRound,
  ensurePipelineForApplication,
  rejectFromRound,
} from "./pipeline-gate"

type Call = { model: string; method: string; args: any }

function makeTx(opts: { existingPipelineId?: bigint; firstStepId?: bigint | null }) {
  const calls: Call[] = []
  const record = (model: string, method: string, result: unknown) => async (args: any) => {
    calls.push({ model, method, args })
    return result
  }
  const tx: any = {
    candidatePipeline: {
      findUnique: record(
        "candidatePipeline",
        "findUnique",
        opts.existingPipelineId ? { id: opts.existingPipelineId } : null
      ),
      create: record("candidatePipeline", "create", { id: BigInt(99) }),
      updateMany: record("candidatePipeline", "updateMany", { count: 1 }),
    },
    workflowStep: {
      findFirst: record(
        "workflowStep",
        "findFirst",
        opts.firstStepId === null ? null : { id: opts.firstStepId ?? BigInt(7) }
      ),
    },
    candidatePipelineStep: { updateMany: record("candidatePipelineStep", "updateMany", { count: 1 }) },
    jobsApplied: { updateMany: record("jobsApplied", "updateMany", { count: 1 }) },
  }
  return { tx, calls }
}

const ids = { applicationId: BigInt(1), jobId: BigInt(3), userId: BigInt(2) }

describe("ensurePipelineForApplication", () => {
  it("returns the existing pipeline without creating another", async () => {
    const { tx, calls } = makeTx({ existingPipelineId: BigInt(5) })
    const result = await ensurePipelineForApplication(tx, ids)
    assert.deepEqual(result, { id: BigInt(5), created: false })
    assert.equal(calls.some((c) => c.method === "create"), false)
  })

  it("creates a pipeline with only step 1 PENDING when none exists", async () => {
    const { tx, calls } = makeTx({})
    const result = await ensurePipelineForApplication(tx, { ...ids, startedAt: BigInt(100) })
    assert.deepEqual(result, { id: BigInt(99), created: true })
    const create = calls.find((c) => c.method === "create")!
    assert.equal(create.args.data.applicationId, BigInt(1))
    assert.equal(create.args.data.currentStepOrder, 1)
    assert.equal(create.args.data.steps.create.status, "PENDING")
    assert.equal(create.args.data.steps.create.workflowStepId, BigInt(7))
  })

  it("returns null when the job has no step 1", async () => {
    const { tx, calls } = makeTx({ firstStepId: null })
    const result = await ensurePipelineForApplication(tx, ids)
    assert.equal(result, null)
    assert.equal(calls.some((c) => c.method === "create"), false)
  })
})

describe("admitToRound", () => {
  it("moves PENDING steps in progress and marks the application SHORTLISTED", async () => {
    const { tx, calls } = makeTx({})
    await admitToRound(tx, {
      jobId: BigInt(3),
      userIds: [BigInt(2)],
      workflowStepId: BigInt(5),
      now: BigInt(50),
    })
    const step = calls.find((c) => c.model === "candidatePipelineStep")!
    assert.equal(step.args.where.status, "PENDING")
    assert.equal(step.args.data.status, "IN_PROGRESS")
    const app = calls.find((c) => c.model === "jobsApplied")!
    assert.equal(app.args.data.status, "SHORTLISTED")
  })
})

describe("rejectFromRound", () => {
  it("rejects steps, locks the pipeline and marks the application REMOVED", async () => {
    const { tx, calls } = makeTx({})
    await rejectFromRound(tx, { jobId: BigInt(3), userIds: [BigInt(2)], now: BigInt(50) })
    const step = calls.find((c) => c.model === "candidatePipelineStep")!
    assert.deepEqual(step.args.where.status, { in: ["PENDING", "IN_PROGRESS"] })
    assert.equal(step.args.data.status, "REJECTED")
    const pipe = calls.find((c) => c.model === "candidatePipeline")!
    assert.equal(pipe.args.data.lockState, "LOCKED_REJECTED")
    assert.equal(pipe.args.data.overallStatus, "REJECTED")
    const app = calls.find((c) => c.model === "jobsApplied")!
    assert.equal(app.args.data.status, "REMOVED")
  })
})
