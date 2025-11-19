import { NextRequest, NextResponse } from "next/server"
import { requireInterviewer } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest) {
  try {
    const user = await requireInterviewer()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const interviewerId = BigInt(user.id)

    // Fetch both pipeline steps and batch assignments
    const [steps, batches] = await Promise.all([
      prisma.candidatePipelineStep.findMany({
        where: { interviewerId: interviewerId },
        include: {
          workflowStep: { select: { id: true, stepName: true, stepOrder: true } },
          pipeline: {
            include: {
              job: { select: { id: true, title: true, company: true } },
              candidate: { select: { id: true, firstname: true, lastname: true, email: true } },
            },
          },
        },
        orderBy: [{ status: "asc" }, { stepOrder: "asc" }],
        take: 100,
      }),
      // Fetch batches assigned to this interviewer
      (prisma as any).batch.findMany({
        where: {
          workflowStep: {
            interviewerId: interviewerId
          },
          status: { in: ["IN_PROGRESS", "PENDING_ADMIN"] }
        },
        include: {
          workflowStep: {
            select: { id: true, stepName: true, stepOrder: true }
          },
          job: {
            select: { id: true, title: true, company: true }
          },
          _count: {
            select: {
              batchCandidates: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 50
      })
    ])

    const assignments = [
      // Pipeline assignments
      ...steps.map((s) => ({
        id: s.id.toString(),
        type: "pipeline" as const,
        status: s.status,
        stepOrder: s.stepOrder,
        workflowStep: {
          id: s.workflowStep.id.toString(),
          stepName: s.workflowStep.stepName,
          stepOrder: s.workflowStep.stepOrder,
        },
        pipeline: {
          id: s.pipeline.id.toString(),
          job: {
            id: s.pipeline.job.id.toString(),
            title: s.pipeline.job.title,
            company: s.pipeline.job.company || "",
          },
          candidate: {
            id: s.pipeline.candidate.id.toString(),
            name: `${s.pipeline.candidate.firstname} ${s.pipeline.candidate.lastname}`,
            email: s.pipeline.candidate.email || "",
          },
        },
      })),
      // Batch assignments
      ...batches.map((b: any) => ({
        id: b.id.toString(),
        type: "batch" as const,
        status: b.status,
        stepOrder: b.workflowStep.stepOrder,
        workflowStep: {
          id: b.workflowStep.id.toString(),
          stepName: b.workflowStep.stepName,
          stepOrder: b.workflowStep.stepOrder,
        },
        batch: {
          id: b.id.toString(),
          batchNumber: b.batchNumber,
          batchName: b.batchName,
          candidateCount: b._count.batchCandidates,
          job: {
            id: b.job.id.toString(),
            title: b.job.title,
            company: b.job.company || "",
          },
        },
      }))
    ]

    // Sort by step order, then by type (batches first for same step)
    assignments.sort((a, b) => {
      if (a.stepOrder !== b.stepOrder) {
        return a.stepOrder - b.stepOrder
      }
      return a.type === "batch" ? -1 : 1
    })

    return NextResponse.json({
      assignments
    })
  } catch (error: any) {
    console.error("Interviewer assignments list error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to load assignments" },
      { status: 500 }
    )
  }
}


