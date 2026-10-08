import type { Prisma } from "@prisma/client"

/**
 * Single shortlist gate for NORMAL jobs.
 *
 * Both the job-level shortlist screen and the round screens go through these
 * helpers so a candidate always ends in the same state:
 *   admit  -> application SHORTLISTED, pipeline exists, step IN_PROGRESS
 *   reject -> application REMOVED, pipeline REJECTED + LOCKED_REJECTED, step REJECTED
 */

type Tx = Prisma.TransactionClient

export const nowSeconds = () => BigInt(Math.floor(Date.now() / 1000))

/**
 * Make sure the application has a pipeline with step 1 (PENDING).
 * Idempotent: returns the existing pipeline id when there is one.
 * Returns null when the job has no workflow (nothing to create).
 */
export async function ensurePipelineForApplication(
  tx: Tx,
  input: { applicationId: bigint; jobId: bigint; userId: bigint; startedAt?: bigint }
): Promise<{ id: bigint; created: boolean } | null> {
  const existing = await tx.candidatePipeline.findUnique({
    where: { applicationId: input.applicationId },
    select: { id: true },
  })
  if (existing) return { id: existing.id, created: false }

  const firstStep = await tx.workflowStep.findFirst({
    where: { stepOrder: 1, workflow: { jobId: input.jobId } },
    select: { id: true },
  })
  if (!firstStep) return null

  const startedAt = input.startedAt ?? nowSeconds()
  const pipeline = await tx.candidatePipeline.create({
    data: {
      candidateId: input.userId,
      jobId: input.jobId,
      applicationId: input.applicationId,
      currentStepOrder: 1,
      overallStatus: "IN_PROGRESS",
      lockState: "NONE",
      pipelineMode: "INDIVIDUAL",
      startedAt,
      steps: {
        create: {
          workflowStepId: firstStep.id,
          stepOrder: 1,
          status: "PENDING",
          startedAt,
        },
      },
    },
    select: { id: true },
  })
  return { id: pipeline.id, created: true }
}

/**
 * Admit candidates into a round: PENDING steps become IN_PROGRESS and the
 * application is marked SHORTLISTED.
 */
export async function admitToRound(
  tx: Tx,
  input: { jobId: bigint; userIds: bigint[]; workflowStepId: bigint; now?: bigint }
): Promise<void> {
  const now = input.now ?? nowSeconds()

  await tx.candidatePipelineStep.updateMany({
    where: {
      workflowStepId: input.workflowStepId,
      pipeline: { jobId: input.jobId, candidateId: { in: input.userIds } },
      status: "PENDING",
    },
    data: { status: "IN_PROGRESS", startedAt: now },
  })

  await tx.jobsApplied.updateMany({
    where: { jobId: input.jobId, userId: { in: input.userIds } },
    data: { status: "SHORTLISTED", statusUpdatedAt: now },
  })
}

/**
 * Reject candidates: open steps become REJECTED, the pipeline is locked and
 * the application is marked REMOVED so every screen shows "Rejected".
 */
export async function rejectFromRound(
  tx: Tx,
  input: { jobId: bigint; userIds: bigint[]; workflowStepId?: bigint; now?: bigint }
): Promise<void> {
  const now = input.now ?? nowSeconds()

  await tx.candidatePipelineStep.updateMany({
    where: {
      ...(input.workflowStepId ? { workflowStepId: input.workflowStepId } : {}),
      pipeline: { jobId: input.jobId, candidateId: { in: input.userIds } },
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    data: { status: "REJECTED", completedAt: now },
  })

  await tx.candidatePipeline.updateMany({
    where: { jobId: input.jobId, candidateId: { in: input.userIds } },
    data: { overallStatus: "REJECTED", completedAt: now, lockState: "LOCKED_REJECTED" },
  })

  await tx.jobsApplied.updateMany({
    where: { jobId: input.jobId, userId: { in: input.userIds } },
    data: { status: "REMOVED", statusUpdatedAt: now },
  })
}
