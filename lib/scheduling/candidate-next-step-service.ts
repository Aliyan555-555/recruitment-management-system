import { prisma } from "@/lib/prisma"
import { readStepConfig } from "@/lib/workflow/step-config"
import { computeNextStep, mostUrgent, type NextStep } from "./candidate-next-step"
import { getOrgTimeZone } from "./org-settings"
import { MIN_LEAD_MINUTES } from "./slot-service"

const LETTER_RANK: Record<string, number> = { SENT: 3, ACCEPTED: 2, REJECTED: 1, EXPIRED: 1, DRAFTED: 0 }

export async function getCandidateNextSteps(candidateId: bigint): Promise<{ timeZone: string; steps: NextStep[]; primary: NextStep | null }> {
  const [timeZone, pipelines] = await Promise.all([
    getOrgTimeZone(),
    prisma.candidatePipeline.findMany({
      where: { candidateId },
      orderBy: { startedAt: "desc" },
      take: 30,
      select: {
        id: true,
        overallStatus: true,
        lockState: true,
        currentStepOrder: true,
        job: { select: { title: true, workflow: { select: { steps: true } } } },
        steps: {
          select: {
            stepOrder: true,
            status: true,
            workflowStepId: true,
            lois: { select: { status: true } },
            offerLetters: { select: { status: true } },
            slotBookings: {
              where: { status: "RESERVED" },
              take: 1,
              select: { slot: { select: { startsAt: true, endsAt: true, meetingLink: true, mode: true } } },
            },
          },
        },
      },
    }),
  ])

  const currentStepIds = pipelines
    .map((p) => p.job.workflow?.steps.find((s) => s.stepOrder === p.currentStepOrder)?.id)
    .filter((id): id is bigint => !!id)
  const seats = currentStepIds.length
    ? await prisma.interviewSlot.groupBy({
        by: ["stepId"],
        where: { stepId: { in: currentStepIds }, isBlocked: false, startsAt: { gt: new Date(Date.now() + MIN_LEAD_MINUTES * 60_000) } },
        _sum: { capacity: true, bookedCount: true },
      })
    : []

  const now = new Date()
  const steps = pipelines.map((p) => {
    const workflowStep = p.job.workflow?.steps.find((s) => s.stepOrder === p.currentStepOrder) ?? null
    const pipelineStep = p.steps.find((s) => s.stepOrder === p.currentStepOrder) ?? null
    const config = workflowStep ? readStepConfig(workflowStep) : null
    const booking = pipelineStep?.slotBookings[0]?.slot ?? null
    const seat = workflowStep ? seats.find((s) => s.stepId === workflowStep.id) : undefined
    const letters = p.steps.flatMap((s) => [...s.lois, ...s.offerLetters]).map((l) => l.status as string)
    const letterStatus = letters.sort((a, b) => (LETTER_RANK[b] ?? 0) - (LETTER_RANK[a] ?? 0))[0] ?? null

    return computeNextStep({
      pipelineId: p.id.toString(),
      jobTitle: p.job.title,
      overallStatus: p.overallStatus,
      lockState: p.lockState,
      stepName: workflowStep?.stepName ?? null,
      stepStatus: pipelineStep?.status ?? null,
      isInterview: !!config?.isInterview,
      booking: booking
        ? {
            startsAt: booking.startsAt,
            endsAt: booking.endsAt,
            meetingLink: (booking.mode ?? config?.interviewMode) === "REMOTE" ? booking.meetingLink ?? config?.meetingLink ?? null : null,
          }
        : null,
      freeSeats: Math.max(0, (seat?._sum.capacity ?? 0) - (seat?._sum.bookedCount ?? 0)),
      letterStatus,
      now,
    })
  })

  return { timeZone, steps, primary: mostUrgent(steps) }
}
