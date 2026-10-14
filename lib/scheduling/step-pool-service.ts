import { prisma } from "@/lib/prisma"
import { readStepConfig } from "@/lib/workflow/step-config"
import { syncStepInterviewers } from "@/lib/workflow/step-persistence"
import { SchedulingError } from "./availability-service"

async function loadInterviewStep(stepId: bigint) {
  const step = await prisma.workflowStep.findUnique({ where: { id: stepId } })
  if (!step) throw new SchedulingError("Round not found", 404)
  const config = readStepConfig(step)
  if (!config.isInterview) throw new SchedulingError("Only interview rounds have interviewers")
  return { step, config }
}

/** Every active interviewer, flagged with whether they sit on this round's pool. */
export async function getStepPool(stepId: bigint) {
  const { config } = await loadInterviewStep(stepId)
  const [users, pool] = await Promise.all([
    prisma.user.findMany({
      where: { role: "INTERVIEWER", suspended: false, deletedAt: null },
      orderBy: [{ firstname: "asc" }, { lastname: "asc" }],
      select: {
        id: true,
        firstname: true,
        lastname: true,
        department: true,
        _count: { select: { interviewerAvailability: { where: { isActive: true } } } },
      },
    }),
    prisma.stepInterviewer.findMany({ where: { stepId }, select: { interviewerId: true } }),
  ])
  const selected = new Set(pool.map((p) => p.interviewerId.toString()))
  return {
    panelSize: config.panelSize,
    interviewers: users.map((u) => ({
      id: u.id.toString(),
      name: `${u.firstname} ${u.lastname}`.trim(),
      department: u.department,
      hasAvailability: u._count.interviewerAvailability > 0,
      selected: selected.has(u.id.toString()),
    })),
  }
}

/**
 * Replaces the round's interviewer pool. Refuses to drop someone who still sits on a slot with a booked,
 * upcoming interview (an admin must reschedule those first).
 */
export async function setStepPool(stepId: bigint, interviewerIds: string[]) {
  await loadInterviewStep(stepId)
  const ids = Array.from(new Set(interviewerIds.filter((id) => /^\d+$/.test(id))))

  const current = await prisma.stepInterviewer.findMany({ where: { stepId }, select: { interviewerId: true } })
  const removed = current.map((c) => c.interviewerId).filter((id) => !ids.includes(id.toString()))
  if (removed.length > 0) {
    const blocking = await prisma.slotInterviewer.findMany({
      where: {
        interviewerId: { in: removed },
        slot: { stepId, startsAt: { gt: new Date() }, bookings: { some: { status: "RESERVED" } } },
      },
      select: { interviewer: { select: { firstname: true, lastname: true } } },
      distinct: ["interviewerId"],
    })
    if (blocking.length > 0) {
      const names = blocking.map((b) => `${b.interviewer.firstname} ${b.interviewer.lastname}`).join(", ")
      throw new SchedulingError(`${names} still ${blocking.length === 1 ? "has" : "have"} booked interviews in this round. Reschedule them first.`, 409)
    }
  }

  const now = BigInt(Math.floor(Date.now() / 1000))
  try {
    await prisma.$transaction((tx) => syncStepInterviewers(tx, stepId, ids, now))
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("One or more selected")) throw new SchedulingError(error.message)
    throw error
  }
}
