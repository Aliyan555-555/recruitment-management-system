import { prisma } from "@/lib/prisma"

export interface CreateBatchParams {
  jobId: bigint
  workflowStepId: bigint
  candidateIds: bigint[]
  batchNumber: number
  batchName?: string
  createdBy: bigint
}

export interface BatchWithCandidates {
  id: bigint
  jobId: bigint
  workflowStepId: bigint
  batchNumber: number
  batchName: string | null
  status: string
  candidates: Array<{
    id: bigint
    candidateId: bigint
    applicationId: bigint
    currentStatus: string
    candidate: {
      id: bigint
      firstname: string
      lastname: string
      email: string
    }
    application: {
      id: bigint
      cv: {
        id: bigint
        filename: string
        filepath: string
      } | null
    }
  }>
}

/**
 * Create a new batch with candidates
 */
export async function createBatch(params: CreateBatchParams): Promise<bigint> {
  const now = BigInt(Math.floor(Date.now() / 1000))

  const batch = await prisma.$transaction(async (tx) => {
    // Create batch
    const newBatch = await (tx as any).batch.create({
      data: {
        jobId: params.jobId,
        workflowStepId: params.workflowStepId,
        batchNumber: params.batchNumber,
        batchName: params.batchName || null,
        status: "PENDING_ADMIN",
        createdBy: params.createdBy,
        createdAt: now,
        updatedAt: now
      }
    })

    // Create batch candidates
    const batchCandidates = await Promise.all(
      params.candidateIds.map(async (candidateId) => {
        // Get application for this candidate and job
        const application = await tx.jobsApplied.findFirst({
          where: {
            jobId: params.jobId,
            userId: candidateId
          },
          select: { id: true }
        })

        if (!application) {
          throw new Error(`Application not found for candidate ${candidateId} and job ${params.jobId}`)
        }

        return (tx as any).batchCandidate.create({
          data: {
            batchId: newBatch.id,
            applicationId: application.id,
            candidateId: candidateId,
            currentStatus: "PENDING"
          }
        })
      })
    )

    // Update application statuses
    await tx.jobsApplied.updateMany({
      where: {
        id: {
          in: batchCandidates.map((bc: any) => bc.applicationId)
        }
      },
      data: {
        status: "BATCH_ASSIGNED",
        batchId: newBatch.id,
        statusUpdatedAt: now
      }
    })

    return newBatch.id
  })

  return batch
}

/**
 * Get batch by ID with candidates
 */
export async function getBatchById(batchId: bigint): Promise<BatchWithCandidates | null> {
  const batch = await (prisma as any).batch.findUnique({
    where: { id: batchId },
    include: {
      batchCandidates: {
        include: {
          candidate: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true
            }
          },
          application: {
            include: {
              cv: {
                select: {
                  id: true,
                  filename: true,
                  filepath: true
                }
              }
            }
          }
        }
      }
    }
  })

  if (!batch) {
    return null
  }

  return {
    id: batch.id,
    jobId: batch.jobId,
    workflowStepId: batch.workflowStepId,
    batchNumber: batch.batchNumber,
    batchName: batch.batchName,
    status: batch.status,
    candidates: batch.batchCandidates.map((bc: any) => ({
      id: bc.id,
      candidateId: bc.candidateId,
      applicationId: bc.applicationId,
      currentStatus: bc.currentStatus,
      candidate: {
        id: bc.candidate.id,
        firstname: bc.candidate.firstname,
        lastname: bc.candidate.lastname,
        email: bc.candidate.email
      },
      application: {
        id: bc.application.id,
        cv: bc.application.cv ? {
          id: bc.application.cv.id,
          filename: bc.application.cv.filename,
          filepath: bc.application.cv.filepath
        } : null
      }
    }))
  }
}

/**
 * Get all batches for a workflow step
 */
export async function getBatchesForStep(
  jobId: bigint,
  stepId: bigint
): Promise<Array<{
  id: bigint
  batchNumber: number
  batchName: string | null
  status: string
  candidateCount: number
}>> {
  const batches = await (prisma as any).batch.findMany({
    where: {
      jobId,
      workflowStepId: stepId
    },
    include: {
      _count: {
        select: {
          batchCandidates: true
        }
      }
    },
    orderBy: {
      batchNumber: "asc"
    }
  })

  return batches.map((b: any) => ({
    id: b.id,
    batchNumber: b.batchNumber,
    batchName: b.batchName,
    status: b.status,
    candidateCount: b._count.batchCandidates
  }))
}

/**
 * Update batch status
 */
export async function updateBatchStatus(
  batchId: bigint,
  status: "PENDING_ADMIN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
): Promise<void> {
  await (prisma as any).batch.update({
    where: { id: batchId },
    data: {
      status,
      updatedAt: BigInt(Math.floor(Date.now() / 1000))
    }
  })
}

/**
 * Get all SELECTED candidates from a batch
 */
export async function getSelectedCandidatesFromBatch(batchId: bigint): Promise<bigint[]> {
  const batchCandidates = await (prisma as any).batchCandidate.findMany({
    where: {
      batchId,
      currentStatus: "SELECTED"
    },
    select: {
      candidateId: true
    }
  })

  return batchCandidates.map((bc: any) => bc.candidateId)
}

/**
 * Create next batch from previous batch's selected candidates
 */
export async function createNextBatchFromPrevious(
  jobId: bigint,
  previousBatchId: bigint,
  nextStepId: bigint,
  createdBy: bigint,
  candidateOverrides?: bigint[] // Admin can override which candidates to include
): Promise<bigint> {
  // Get selected candidates from previous batch
  const selectedCandidateIds = candidateOverrides && candidateOverrides.length > 0
    ? candidateOverrides
    : await getSelectedCandidatesFromBatch(previousBatchId)

  if (selectedCandidateIds.length === 0) {
    throw new Error("No selected candidates to create next batch")
  }

  // Get next batch number
  const existingBatches = await (prisma as any).batch.findMany({
    where: {
      jobId,
      workflowStepId: nextStepId
    },
    select: {
      batchNumber: true
    },
    orderBy: {
      batchNumber: "desc"
    },
    take: 1
  })

  const nextBatchNumber = existingBatches.length > 0
    ? existingBatches[0].batchNumber + 1
    : 1

  // Create new batch
  return await createBatch({
    jobId,
    workflowStepId: nextStepId,
    candidateIds: selectedCandidateIds,
    batchNumber: nextBatchNumber,
    createdBy
  })
}

