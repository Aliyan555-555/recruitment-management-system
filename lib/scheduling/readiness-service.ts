import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { sendEmail } from "@/lib/email"
import { readStepConfig } from "@/lib/workflow/step-config"
import { SchedulingError } from "./availability-service"
import { appUrl, renderEmailLayout } from "./email-layout"
import { evaluateReadiness } from "./round-readiness"
import { getRoundOverview, MIN_LEAD_MINUTES } from "./slot-service"

const REMINDER_COOLDOWN_SECONDS = 24 * 3600

export async function getRoundReadiness(stepId: bigint) {
  const step = await prisma.workflowStep.findUnique({
    where: { id: stepId },
    include: {
      workflow: { select: { jobId: true } },
      interviewers: {
        where: { interviewer: { role: "INTERVIEWER", suspended: false, deletedAt: null } },
        include: {
          interviewer: {
            select: { id: true, firstname: true, lastname: true, _count: { select: { interviewerAvailability: { where: { isActive: true } } } } },
          },
        },
      },
    },
  })
  if (!step) throw new SchedulingError("Round not found", 404)
  const config = readStepConfig(step)
  if (!config.isInterview) throw new SchedulingError("Only interview rounds have a schedule")

  const [openSlots, overview] = await Promise.all([
    prisma.interviewSlot.count({
      where: { stepId, isBlocked: false, startsAt: { gt: new Date(Date.now() + MIN_LEAD_MINUTES * 60_000) } },
    }),
    getRoundOverview(stepId),
  ])

  const result = evaluateReadiness({
    interviewMode: config.interviewMode,
    meetingLink: config.meetingLink,
    location: config.location,
    panelSize: config.panelSize,
    pool: step.interviewers.map((p) => ({
      id: p.interviewer.id.toString(),
      name: `${p.interviewer.firstname} ${p.interviewer.lastname}`,
      hasAvailability: p.interviewer._count.interviewerAvailability > 0,
    })),
    openSlots,
    freeSeats: overview.freeSeats,
    awaitingBooking: overview.counts.awaitingBooking,
  })

  return { ...result, jobId: step.workflow.jobId.toString() }
}

/**
 * Emails interviewers of this round who have not shared availability. Only pool members can be reminded,
 * and each person at most once per 24h (tracked through the notification table).
 */
export async function remindAvailability(stepId: bigint, interviewerIds: bigint[]): Promise<{ sent: number; skipped: number }> {
  const step = await prisma.workflowStep.findUnique({
    where: { id: stepId },
    select: { stepName: true, workflow: { select: { job: { select: { title: true } } } } },
  })
  if (!step) throw new SchedulingError("Round not found", 404)

  const targets = await prisma.user.findMany({
    where: {
      id: { in: interviewerIds },
      role: "INTERVIEWER",
      suspended: false,
      deletedAt: null,
      stepInterviewerAssignments: { some: { stepId } },
      interviewerAvailability: { none: { isActive: true } },
    },
    select: { id: true, firstname: true, email: true },
  })

  const since = BigInt(Math.floor(Date.now() / 1000) - REMINDER_COOLDOWN_SECONDS)
  let sent = 0
  for (const t of targets) {
    const recent = await prisma.notification.findFirst({
      where: { userId: t.id, entityType: "availability_reminder", createdAt: { gte: since } },
      select: { id: true },
    })
    if (recent) continue

    await createNotification({
      userId: t.id,
      title: "Please share your availability",
      message: `Candidates are waiting to book the ${step.stepName} for ${step.workflow.job.title}.`,
      type: "REMINDER",
      entityType: "availability_reminder",
      entityId: stepId,
    })
    await sendEmail({
      to: t.email,
      subject: "Please share your interview availability",
      html: renderEmailLayout({
        heading: "When can you interview?",
        intro: `Hello ${t.firstname}, candidates are waiting to book the ${step.stepName} for ${step.workflow.job.title}. Add the times you are free so interview slots can open.`,
        cta: { label: "Set my availability", url: appUrl("/interviewer/availability") },
      }),
    })
    sent++
  }
  return { sent, skipped: interviewerIds.length - sent }
}
