import { logApplicantAudit } from "@/lib/services/applicant-audit"
import { prisma } from "@/lib/prisma"
import {
  eligibilityFromApplication,
  ShortlistIneligibleError,
  SHORTLIST_PIPELINE_SELECT,
} from "@/lib/admin/shortlist-eligibility"
import { createBatch } from "./batch-service"
import {
  admitToRound,
  ensurePipelineForApplication,
  rejectFromRound,
} from "./pipeline-gate"

/**
 * Handle bulk job application - creates application with status "applied" (no pipeline)
 */
export async function handleBulkApplication(
  jobId: bigint,
  userId: bigint
): Promise<bigint> {
  const now = BigInt(Math.floor(Date.now() / 1000))

  // Check if job end date has passed
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      postTo: true,
      jobStatus: true,
      jobType: true
    }
  })

  if (!job) {
    throw new Error("Job not found")
  }

  if (job.jobType !== "BULK") {
    throw new Error("This function is only for bulk jobs")
  }

  const endDate = new Date(job.postTo)
  endDate.setHours(23, 59, 59, 999)
  const nowDate = new Date()

  if (nowDate > endDate) {
    throw new Error("Application deadline has passed")
  }

  // Check if already applied
  const existing = await prisma.jobsApplied.findUnique({
    where: {
      jobId_userId: {
        jobId,
        userId
      }
    }
  })

  if (existing) {
    throw new Error("You have already applied for this job")
  }

  // Create application with status "APPLIED" (not SUBMITTED)
  const application = await prisma.jobsApplied.create({
    data: {
      jobId,
      userId,
      status: "APPLIED",
      appliedAt: now
    }
  })

  return application.id
}

/**
 * Admin shortlisting - select or reject candidates still waiting at the shortlist gate.
 * Hired, rejected, on-hold, and in-round candidates are rejected with ShortlistIneligibleError.
 */
export async function shortlistCandidates(
  jobId: bigint,
  candidateIds: bigint[],
  action: "select" | "reject",
  adminId?: bigint
): Promise<void> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const newStatus = action === "select" ? "SHORTLISTED" : "REMOVED"

  const applications = await prisma.jobsApplied.findMany({
    where: {
      jobId,
      userId: { in: candidateIds },
    },
    include: {
      pipeline: {
        select: { ...SHORTLIST_PIPELINE_SELECT, id: true },
      },
    },
  })

  const foundIds = new Set(applications.map((app) => app.userId.toString()))
  const ineligibleIds = [
    ...candidateIds
      .filter((id) => !foundIds.has(id.toString()))
      .map((id) => id.toString()),
    ...applications
      .filter((app) => !eligibilityFromApplication(app).actionable)
      .map((app) => app.userId.toString()),
  ]

  if (ineligibleIds.length > 0) {
    throw new ShortlistIneligibleError(ineligibleIds)
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { jobType: true },
  })

  // A decision clears any "Maybe" flag and records who made it.
  const afterDecision = async () => {
    await prisma.jobsApplied.updateMany({
      where: { jobId, userId: { in: candidateIds } },
      data: { reviewFlag: null, ...(adminId ? { reviewedBy: adminId, reviewedAt: now } : {}) },
    })
    if (adminId) {
      await logApplicantAudit(
        applications.map((app) => ({
          applicationId: app.id,
          pipelineId: app.pipeline?.id ?? null,
          action: action === "select" ? "ASSIGNED" : "REJECTED",
          changes: { jobId: jobId.toString(), from: app.status, to: newStatus, decision: action },
        })),
        adminId
      )
    }
  }

  // BULK jobs use the batch flow and keep the status-only update.
  if (job?.jobType === "NORMAL") {
    const roundOne = await prisma.workflowStep.findFirst({
      where: { stepOrder: 1, workflow: { jobId } },
      select: { id: true },
    })

    await prisma.$transaction(async (tx) => {
      if (action === "reject") {
        await rejectFromRound(tx, { jobId, userIds: candidateIds, now })
        return
      }

      // Self-heal applications that never got a pipeline (legacy or seeded data).
      for (const app of applications) {
        await ensurePipelineForApplication(tx, {
          applicationId: app.id,
          jobId,
          userId: app.userId,
          startedAt: now,
        })
      }

      if (roundOne) {
        await admitToRound(tx, { jobId, userIds: candidateIds, workflowStepId: roundOne.id, now })
      } else {
        await tx.jobsApplied.updateMany({
          where: { jobId, userId: { in: candidateIds } },
          data: { status: newStatus, statusUpdatedAt: now },
        })
      }
    })
    await afterDecision()
    return
  }

  await prisma.jobsApplied.updateMany({
    where: {
      jobId,
      userId: { in: candidateIds },
      status: { in: ["APPLIED", "SUBMITTED"] },
    },
    data: {
      status: newStatus,
      statusUpdatedAt: now,
    },
  })
  await afterDecision()
}

/**
 * Create initial batch (Batch 1) from shortlisted candidates
 */
export async function createInitialBatch(
  jobId: bigint,
  shortlistedIds: bigint[],
  createdBy: bigint
): Promise<bigint> {
  // Get job workflow to find step 1
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      workflow: {
        include: {
          steps: {
            where: {
              stepOrder: 1
            }
          }
        }
      }
    }
  })

  if (!job || !job.workflow) {
    throw new Error("Job workflow not found")
  }

  const firstStep = job.workflow.steps[0]
  if (!firstStep) {
    throw new Error("Workflow must have a step 1")
  }

  // Verify candidates are shortlisted
  const applications = await prisma.jobsApplied.findMany({
    where: {
      jobId,
      userId: {
        in: shortlistedIds
      },
      status: "SHORTLISTED"
    },
    select: {
      userId: true
    }
  })

  if (applications.length !== shortlistedIds.length) {
    throw new Error("Some candidates are not shortlisted")
  }

  // Create batch 1
  return await createBatch({
    jobId,
    workflowStepId: firstStep.id,
    candidateIds: shortlistedIds,
    batchNumber: 1,
    batchName: "Batch 1",
    createdBy
  })
}

/**
 * Process batch evaluation from interviewer
 */
export async function processBatchEvaluation(
  batchId: bigint,
  evaluations: Array<{
    candidateId: bigint
    status: "SELECTED" | "REJECTED" | "REVIEW"
    feedback?: string
    rating?: number
  }>,
  interviewerId: bigint
): Promise<void> {
  const now = BigInt(Math.floor(Date.now() / 1000))

  await prisma.$transaction(async (tx) => {
    for (const evalData of evaluations) {
      // Find batch candidate
      const batchCandidate = await tx.batchCandidate.findFirst({
        where: {
          batchId,
          candidateId: evalData.candidateId
        }
      })

      if (!batchCandidate) {
        throw new Error(`Batch candidate not found for candidate ${evalData.candidateId}`)
      }

      // Update batch candidate status
      await tx.batchCandidate.update({
        where: { id: batchCandidate.id },
        data: {
          currentStatus: evalData.status,
          evaluatedAt: now,
          evaluatedBy: interviewerId
        }
      })

      // Create evaluation record
      await tx.batchCandidateEvaluation.create({
        data: {
          batchCandidateId: batchCandidate.id,
          evaluatorId: interviewerId,
          status: evalData.status,
          feedback: evalData.feedback || null,
          rating: evalData.rating || null,
          submittedAt: now
        }
      })
    }

    // Check if all candidates are evaluated
    const batch = await tx.batch.findUnique({
      where: { id: batchId },
      include: {
        _count: {
          select: {
            batchCandidates: true
          }
        },
        batchCandidates: {
          select: {
            currentStatus: true
          }
        }
      }
    })
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`)
    }

    const totalCandidates = batch._count.batchCandidates
    const evaluatedCount = batch.batchCandidates.filter(
      (bc: any) => bc.currentStatus !== "PENDING"
    ).length

    // If all evaluated, update batch status to PENDING_ADMIN
    if (evaluatedCount === totalCandidates) {
      await tx.batch.update({
        where: { id: batchId },
        data: {
          status: "PENDING_ADMIN",
          updatedAt: now
        }
      })
    }
  })
}

/**
 * Advance to next batch step - create next batch from selected candidates
 */
export async function advanceToNextBatchStep(
  jobId: bigint,
  currentBatchId: bigint,
  nextStepId: bigint,
  createdBy: bigint,
  candidateOverrides?: bigint[]
): Promise<bigint> {
  const { createNextBatchFromPrevious } = await import("./batch-service")
  return await createNextBatchFromPrevious(
    jobId,
    currentBatchId,
    nextStepId,
    createdBy,
    candidateOverrides
  )
}

/**
 * Get final selected candidates after all steps
 */
export async function getFinalSelectedCandidates(jobId: bigint): Promise<Array<{
  candidateId: bigint
  candidateName: string
  email: string
  finalBatchId: bigint
}>> {
  // Get job workflow to find last step
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      workflow: {
        include: {
          steps: {
            orderBy: {
              stepOrder: "desc"
            },
            take: 1
          }
        }
      }
    }
  })

  if (!job || !job.workflow || job.workflow.steps.length === 0) {
    return []
  }

  const lastStep = job.workflow.steps[0]

  // Get all batches for last step
  const batches = await prisma.batch.findMany({
    where: {
      jobId,
      workflowStepId: lastStep.id,
      status: "COMPLETED"
    },
    include: {
      batchCandidates: {
        where: {
          currentStatus: "SELECTED"
        },
        include: {
          candidate: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true
            }
          }
        }
      }
    }
  })

  const selected: Array<{
    candidateId: bigint
    candidateName: string
    email: string
    finalBatchId: bigint
  }> = []

  for (const batch of batches) {
    for (const bc of batch.batchCandidates) {
      selected.push({
        candidateId: bc.candidateId,
        candidateName: `${bc.candidate.firstname} ${bc.candidate.lastname}`,
        email: bc.candidate.email,
        finalBatchId: batch.id
      })
    }
  }

  return selected
}

