import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { sendEmail } from "@/lib/email"
import { appUrl, renderEmailLayout } from "./email-layout"
import { notifyBookingEvent } from "./notifications"

const HOUR = 3_600_000
const nowSeconds = () => BigInt(Math.floor(Date.now() / 1000))

export interface ReminderRunResult {
  dayReminders: number
  hourReminders: number
  feedbackNudges: number
}

/** Sends the reminder at most once per booking: the claim (UPDATE ... WHERE reminded_* IS NULL) wins exactly one run. */
async function claim(bookingId: bigint, field: "remindedDayAt" | "remindedHourAt"): Promise<boolean> {
  const { count } = await prisma.slotBooking.updateMany({
    where: { id: bookingId, status: "RESERVED", [field]: null },
    data: { [field]: nowSeconds() },
  })
  return count === 1
}

/**
 * Meant to be called every ~15 minutes (see app/api/cron/interview-reminders).
 *  - 24h reminder: interview within the next 24h (but not within 3h) and the booking is older than 12h
 *  - 1h reminder:  interview starts within the next hour
 *  - scorecard nudge: an interviewer has not submitted 2h+ after the interview ended (once)
 */
export async function runInterviewReminders(): Promise<ReminderRunResult> {
  const now = Date.now()
  const result: ReminderRunResult = { dayReminders: 0, hourReminders: 0, feedbackNudges: 0 }

  // --- 1 hour
  const soon = await prisma.slotBooking.findMany({
    where: { status: "RESERVED", remindedHourAt: null, slot: { startsAt: { gt: new Date(now), lte: new Date(now + HOUR) } } },
    select: { id: true },
    take: 200,
  })
  for (const b of soon) {
    if (await claim(b.id, "remindedHourAt")) {
      await notifyBookingEvent(b.id, "REMINDER_HOUR")
      result.hourReminders++
    }
  }

  // --- 24 hours
  const twelveHoursAgo = BigInt(Math.floor((now - 12 * HOUR) / 1000))
  const tomorrow = await prisma.slotBooking.findMany({
    where: {
      status: "RESERVED",
      remindedDayAt: null,
      createdAt: { lte: twelveHoursAgo },
      slot: { startsAt: { gt: new Date(now + 3 * HOUR), lte: new Date(now + 24 * HOUR) } },
    },
    select: { id: true },
    take: 200,
  })
  for (const b of tomorrow) {
    if (await claim(b.id, "remindedDayAt")) {
      await notifyBookingEvent(b.id, "REMINDER_DAY")
      result.dayReminders++
    }
  }

  // --- scorecard nudges (deduplicated through the notification table)
  const overdue = await prisma.slotBooking.findMany({
    where: {
      status: { in: ["RESERVED", "COMPLETED"] },
      slot: { endsAt: { lte: new Date(now - 2 * HOUR), gte: new Date(now - 7 * 24 * HOUR) } },
    },
    select: {
      id: true,
      pipelineStepId: true,
      candidate: { select: { firstname: true, lastname: true } },
      slot: { select: { interviewers: { select: { interviewerId: true, interviewer: { select: { firstname: true, email: true } } } } } },
    },
    take: 300,
  })

  for (const b of overdue) {
    if (!b.pipelineStepId) continue
    const submitted = await prisma.stageEvaluation.findMany({
      where: { pipelineStepId: b.pipelineStepId, submittedAt: { not: null } },
      select: { evaluatorId: true },
    })
    const done = new Set(submitted.map((e) => e.evaluatorId.toString()))

    for (const i of b.slot.interviewers) {
      if (done.has(i.interviewerId.toString())) continue
      const already = await prisma.notification.findFirst({
        where: { userId: i.interviewerId, entityType: "scorecard_overdue", entityId: b.id },
        select: { id: true },
      })
      if (already) continue

      const name = `${b.candidate.firstname} ${b.candidate.lastname}`
      await createNotification({
        userId: i.interviewerId,
        title: "Scorecard waiting",
        message: `Please submit your scorecard for ${name}.`,
        type: "REMINDER",
        entityType: "scorecard_overdue",
        entityId: b.id,
      }).catch((e) => console.error("Nudge notification failed:", e))
      await sendEmail({
        to: i.interviewer.email,
        subject: `Scorecard waiting: ${name}`,
        html: renderEmailLayout({
          heading: "Your scorecard is waiting",
          intro: `Hello ${i.interviewer.firstname}, the interview with ${name} has finished. Please submit your scorecard so the team can decide.`,
          cta: { label: "Open scorecard", url: appUrl(`/interviewer/interviews/${b.id}`) },
        }),
      })
      result.feedbackNudges++
    }
  }

  return result
}
