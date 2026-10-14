import type { Prisma } from "@prisma/client"
import { closeRoundBookings } from "@/lib/scheduling/booking-service"

type Tx = Prisma.TransactionClient

export class RoundAdvanceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message)
  }
}

export interface AdvanceInput {
  jobId: bigint
  workflowStepId: bigint
  candidateIds: bigint[]
  actorId: bigint
  /** COMPLETE: the round is done and the candidate moves on. SKIP: an optional round is bypassed. */
  mode: "COMPLETE" | "SKIP"
  now: bigint
}

export interface AdvanceResult {
  advanced: number
  /** pipelines that moved on (for follow-up notifications after the transaction commits) */
  advancedPipelineIds: bigint[]
  /** future interviews in this round that were cancelled because the candidate left it (notify interviewers) */
  cancelledBookingIds: bigint[]
  /** candidates that were not in this round (or whose pipeline is closed) and were left untouched */
  ignored: number
  nextStepId: string | null
}

/**
 * Single place that moves candidates out of a round. Used by the Results page ("Move to next round")
 * and by "Skip round" for optional rounds. Runs inside the caller's transaction.
 *
 * Candidates who pass are admitted straight into the next round (step IN_PROGRESS): the admin's decision on
 * the Results page is the shortlist for the next round, so there is no second "Needs Review" for them.
 *
 * Only pipelines that are currently AT this round and still open are touched, so a stale selection can never
 * rewind or double-advance a candidate.
 */
export async function advanceFromRound(tx: Tx, input: AdvanceInput): Promise<AdvanceResult> {
  const step = await tx.workflowStep.findUnique({
    where: { id: input.workflowStepId },
    select: { stepOrder: true, workflowId: true, isRequired: true, stepName: true },
  })
  if (!step) throw new RoundAdvanceError("Round not found", 404)
  if (input.mode === "SKIP" && step.isRequired) {
    throw new RoundAdvanceError(`${step.stepName} is a required round and cannot be skipped.`)
  }

  const pipelines = await tx.candidatePipeline.findMany({
    where: {
      jobId: input.jobId,
      candidateId: { in: input.candidateIds },
      overallStatus: "IN_PROGRESS",
      lockState: "NONE",
      currentStepOrder: step.stepOrder,
    },
    select: { id: true, candidateId: true },
  })

  const nextStep = await tx.workflowStep.findFirst({
    where: { workflowId: step.workflowId, stepOrder: { gt: step.stepOrder } },
    orderBy: { stepOrder: "asc" },
  })

  // leaving the round: a finished interview is marked done, a future one is cancelled and its seat freed
  const cancelledBookingIds = await closeRoundBookings(tx, {
    workflowStepId: input.workflowStepId,
    candidateIds: pipelines.map((p) => p.candidateId),
    actorId: input.actorId,
  })

  for (const pipeline of pipelines) {

    await tx.candidatePipelineStep.updateMany({
      where: { pipelineId: pipeline.id, workflowStepId: input.workflowStepId },
      data:
        input.mode === "SKIP"
          ? { status: "SKIPPED", skippedAt: input.now, skippedBy: input.actorId, completedAt: input.now }
          : { status: "COMPLETED", completedAt: input.now },
    })

    if (nextStep) {
      await tx.candidatePipeline.update({ where: { id: pipeline.id }, data: { currentStepOrder: nextStep.stepOrder } })
      const existing = await tx.candidatePipelineStep.findFirst({
        where: { pipelineId: pipeline.id, workflowStepId: nextStep.id },
        select: { id: true },
      })
      if (existing) {
        await tx.candidatePipelineStep.update({
          where: { id: existing.id },
          data: { status: "IN_PROGRESS", startedAt: input.now, completedAt: null, skippedAt: null, skippedBy: null },
        })
      } else {
        await tx.candidatePipelineStep.create({
          data: { pipelineId: pipeline.id, workflowStepId: nextStep.id, stepOrder: nextStep.stepOrder, status: "IN_PROGRESS", startedAt: input.now },
        })
      }
    } else {
      await tx.candidatePipeline.update({ where: { id: pipeline.id }, data: { overallStatus: "COMPLETED", completedAt: input.now } })
    }

    await tx.auditLog.create({
      data: {
        pipelineId: pipeline.id,
        userId: input.actorId,
        action: input.mode === "SKIP" ? "SKIPPED" : "ADVANCED",
        entityType: "WorkflowStep",
        entityId: input.workflowStepId,
        changes: JSON.stringify({ to: nextStep?.id.toString() ?? null }),
        timestamp: input.now,
      },
    })
  }

  return {
    advanced: pipelines.length,
    advancedPipelineIds: pipelines.map((p) => p.id),
    cancelledBookingIds,
    ignored: input.candidateIds.length - pipelines.length,
    nextStepId: nextStep ? nextStep.id.toString() : null,
  }
}
