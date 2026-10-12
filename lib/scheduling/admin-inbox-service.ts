import { prisma } from "@/lib/prisma"
import { readStepConfig } from "@/lib/workflow/step-config"
import { buildInbox, type RoundFacts } from "./admin-inbox"
import { MIN_LEAD_MINUTES } from "./slot-service"

/** Collects per-round facts for all open jobs (a handful of grouped queries, no per-round loops). */
export async function getAdminInbox() {
  const jobs = await prisma.job.findMany({
    where: { deletedAt: null, jobStatus: { in: ["ACTIVE", "ADMIN_SHORTLISTING"] } },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: { id: true, title: true, workflow: { select: { steps: true } } },
  })

  const steps = jobs.flatMap((j) => (j.workflow?.steps ?? []).map((s) => ({ job: j, step: s })))
  const stepIds = steps.map((s) => s.step.id)
  if (stepIds.length === 0) return { items: [] }

  const now = new Date()
  const [pipelineSteps, seats, withoutAvailability, overdueScorecards] = await Promise.all([
    prisma.candidatePipelineStep.findMany({
      where: {
        workflowStepId: { in: stepIds },
        status: { in: ["PENDING", "IN_PROGRESS", "COMPLETED"] },
        pipeline: { overallStatus: "IN_PROGRESS", lockState: "NONE" },
      },
      select: {
        workflowStepId: true,
        status: true,
        stepOrder: true,
        pipeline: { select: { currentStepOrder: true } },
        slotBookings: { where: { status: "RESERVED" }, select: { id: true }, take: 1 },
      },
    }),
    prisma.interviewSlot.groupBy({
      by: ["stepId"],
      where: { stepId: { in: stepIds }, isBlocked: false, startsAt: { gt: new Date(now.getTime() + MIN_LEAD_MINUTES * 60_000) } },
      _sum: { capacity: true, bookedCount: true },
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: {
        role: "INTERVIEWER",
        suspended: false,
        deletedAt: null,
        stepInterviewerAssignments: { some: { stepId: { in: stepIds } } },
        interviewerAvailability: { none: { isActive: true } },
      },
      select: { firstname: true, lastname: true },
      take: 20,
    }),
    prisma.slotBooking.count({
      where: { status: "RESERVED", slot: { stepId: { in: stepIds }, endsAt: { lt: new Date(now.getTime() - 24 * 3600_000) } } },
    }),
  ])

  const rounds: RoundFacts[] = steps.map(({ job, step }) => {
    const rows = pipelineSteps.filter((p) => p.workflowStepId === step.id && p.pipeline.currentStepOrder === step.stepOrder)
    const seat = seats.find((s) => s.stepId === step.id)
    return {
      jobId: job.id.toString(),
      jobTitle: job.title,
      stepId: step.id.toString(),
      stepName: step.stepName,
      isInterview: readStepConfig(step).isInterview,
      newApplicants: rows.filter((r) => r.status === "PENDING").length,
      readyForDecision: rows.filter((r) => r.status === "COMPLETED").length,
      awaitingBooking: rows.filter((r) => r.status === "IN_PROGRESS" && r.slotBookings.length === 0).length,
      freeSeats: Math.max(0, (seat?._sum.capacity ?? 0) - (seat?._sum.bookedCount ?? 0)),
      openSlots: seat?._count._all ?? 0,
    }
  })

  return {
    items: buildInbox({
      rounds,
      interviewersWithoutAvailability: withoutAvailability.map((u) => `${u.firstname} ${u.lastname}`),
      overdueScorecards,
    }),
  }
}
