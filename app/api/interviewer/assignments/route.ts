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

    const steps = await prisma.candidatePipelineStep.findMany({
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
    })

    return NextResponse.json({
      assignments: steps.map((s) => ({
        id: s.id.toString(),
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
    })
  } catch (error: any) {
    console.error("Interviewer assignments list error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to load assignments" },
      { status: 500 }
    )
  }
}


