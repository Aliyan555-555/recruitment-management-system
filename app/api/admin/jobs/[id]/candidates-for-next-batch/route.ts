import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { BatchCandidateStatus, PipelineMode } from "@prisma/client"
import { ensureJobStatusCurrent } from "@/lib/middleware/job-status-check"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const jobId = BigInt(params.id)
    const { searchParams } = new URL(req.url)
    const currentStepOrder = parseInt(searchParams.get("currentStepOrder") || "0")

    await ensureJobStatusCurrent(jobId)

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { jobType: true, workflow: { include: { steps: { orderBy: { stepOrder: "asc" } } } } }
    })

    if (!job || job.jobType !== "BULK") {
      return NextResponse.json({ error: "Job not found or not a bulk hiring job" }, { status: 404 })
    }

    if (currentStepOrder === 0) {
      // For the first step, return all shortlisted candidates
      const shortlistedApplications = await prisma.jobsApplied.findMany({
        where: {
          jobId,
          status: "SHORTLISTED"
        },
        include: {
          user: {
            select: { id: true, firstname: true, lastname: true, email: true }
          },
          pipeline: {
            select: {
              id: true,
              pipelineMode: true,
              currentStepOrder: true
            }
          }
        }
      })

      return NextResponse.json({
        candidates: shortlistedApplications.map(app => ({
          applicationId: app.id.toString(),
          candidateId: app.userId.toString(),
          name: `${app.user.firstname} ${app.user.lastname}`,
          email: app.user.email,
          status: app.status
        }))
      })
    }

    // For subsequent steps, find candidates who were SELECTED in the previous step's batch
    const previousStepOrder = currentStepOrder - 1
    const previousStep = job.workflow?.steps.find(s => s.stepOrder === previousStepOrder)

    if (!previousStep) {
      return NextResponse.json({ error: "Previous step not found" }, { status: 404 })
    }

    // Find all batches for the previous step that are COMPLETED
    const previousBatches = await prisma.batch.findMany({
      where: {
        jobId,
        workflowStepId: previousStep.id,
        status: "COMPLETED"
      },
      include: {
        batchCandidates: {
          where: {
            currentStatus: BatchCandidateStatus.SELECTED
          },
          include: {
            application: {
              include: {
                user: {
                  select: { id: true, firstname: true, lastname: true, email: true }
                }
              }
            }
          }
        }
      }
    })

    // Get unique candidates from all previous batches
    const candidateMap = new Map<string, any>()
    for (const batch of previousBatches) {
      for (const batchCandidate of batch.batchCandidates) {
        const appId = batchCandidate.applicationId.toString()
        if (!candidateMap.has(appId)) {
          candidateMap.set(appId, {
            applicationId: appId,
            candidateId: batchCandidate.candidateId.toString(),
            name: `${batchCandidate.application.user.firstname} ${batchCandidate.application.user.lastname}`,
            email: batchCandidate.application.user.email,
            status: batchCandidate.currentStatus
          })
        }
      }
    }

    return NextResponse.json({
      candidates: Array.from(candidateMap.values())
    })
  } catch (error: any) {
    console.error("Error fetching candidates for next batch:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch candidates for next batch" },
      { status: 500 }
    )
  }
}

