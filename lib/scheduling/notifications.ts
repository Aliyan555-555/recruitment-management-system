import { prisma } from "@/lib/prisma"
import { buildIcs } from "@/lib/calendar/ics"
import { sendEmail } from "@/lib/email"
import { createNotification } from "@/lib/notifications"
import { formatInZone, formatTimeInZone, zoneLabel } from "@/lib/timezone"
import { readStepConfig } from "@/lib/workflow/step-config"
import { appUrl, renderEmailLayout } from "./email-layout"
import { getOrgTimeZone } from "./org-settings"

export type BookingEvent = "BOOKED" | "RESCHEDULED" | "CANCELLED" | "REMINDER_DAY" | "REMINDER_HOUR"

interface Person {
  id: bigint
  name: string
  email: string
}

export interface BookingContext {
  bookingId: bigint
  pipelineId: bigint | null
  sequence: number
  candidate: Person
  interviewers: Person[]
  jobTitle: string
  stepName: string
  startsAt: Date
  endsAt: Date
  mode: "REMOTE" | "ONSITE" | null
  meetingLink: string | null
  location: string | null
  instructionsForCandidate: string | null
  timeZone: string
}

export async function loadBookingContext(bookingId: bigint): Promise<BookingContext | null> {
  const booking = await prisma.slotBooking.findUnique({
    where: { id: bookingId },
    include: {
      candidate: { select: { id: true, firstname: true, lastname: true, email: true } },
      pipelineStep: { select: { pipelineId: true } },
      application: { select: { id: true } },
      slot: {
        include: {
          step: { include: { workflow: { include: { job: { select: { title: true } } } } } },
          interviewers: { include: { interviewer: { select: { id: true, firstname: true, lastname: true, email: true } } } },
        },
      },
    },
  })
  if (!booking) return null

  const config = readStepConfig(booking.slot.step)
  const mode = booking.slot.mode ?? config.interviewMode
  const pipeline = booking.pipelineStep
    ? { id: booking.pipelineStep.pipelineId }
    : await prisma.candidatePipeline.findUnique({ where: { applicationId: booking.applicationId }, select: { id: true } })

  return {
    bookingId,
    pipelineId: pipeline?.id ?? null,
    sequence: booking.icsSequence,
    candidate: {
      id: booking.candidate.id,
      name: `${booking.candidate.firstname} ${booking.candidate.lastname}`,
      email: booking.candidate.email,
    },
    interviewers: booking.slot.interviewers.map((i) => ({
      id: i.interviewer.id,
      name: `${i.interviewer.firstname} ${i.interviewer.lastname}`,
      email: i.interviewer.email,
    })),
    jobTitle: booking.slot.step.workflow.job.title,
    stepName: booking.slot.step.stepName,
    startsAt: booking.slot.startsAt,
    endsAt: booking.slot.endsAt,
    mode,
    meetingLink: mode === "REMOTE" ? booking.slot.meetingLink ?? config.meetingLink : null,
    location: mode === "ONSITE" ? booking.slot.location ?? config.location : null,
    instructionsForCandidate: config.candidateInstructions,
    timeZone: await getOrgTimeZone(),
  }
}

function whenText(ctx: BookingContext): string {
  const day = formatInZone(ctx.startsAt, ctx.timeZone, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
  return `${day}, ${formatTimeInZone(ctx.startsAt, ctx.timeZone)} – ${formatTimeInZone(ctx.endsAt, ctx.timeZone)} (${zoneLabel(ctx.timeZone, ctx.startsAt)})`
}

function whereText(ctx: BookingContext): string | null {
  if (ctx.mode === "REMOTE") return ctx.meetingLink ? `Online: ${ctx.meetingLink}` : "Online"
  if (ctx.mode === "ONSITE") return ctx.location ? `Onsite: ${ctx.location}` : "Onsite"
  return null
}

const SUBJECTS: Record<BookingEvent, (c: BookingContext) => string> = {
  BOOKED: (c) => `Interview confirmed: ${c.stepName} for ${c.jobTitle}`,
  RESCHEDULED: (c) => `Interview rescheduled: ${c.stepName} for ${c.jobTitle}`,
  CANCELLED: (c) => `Interview cancelled: ${c.stepName} for ${c.jobTitle}`,
  REMINDER_DAY: (c) => `Reminder: interview tomorrow for ${c.jobTitle}`,
  REMINDER_HOUR: (c) => `Starting soon: ${c.stepName} for ${c.jobTitle}`,
}

const HEADINGS: Record<BookingEvent, string> = {
  BOOKED: "Your interview is confirmed",
  RESCHEDULED: "Your interview has been rescheduled",
  CANCELLED: "Your interview was cancelled",
  REMINDER_DAY: "Your interview is tomorrow",
  REMINDER_HOUR: "Your interview starts soon",
}

function icsFor(ctx: BookingContext, event: BookingEvent, audience: "CANDIDATE" | "INTERVIEWER") {
  const cancelled = event === "CANCELLED"
  const description = [
    audience === "CANDIDATE" ? ctx.instructionsForCandidate : null,
    ctx.meetingLink ? `Join: ${ctx.meetingLink}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  return buildIcs({
    uid: `booking-${ctx.bookingId}@rms`,
    // CANCEL must carry a higher sequence than the invite it cancels
    sequence: ctx.sequence,
    method: cancelled ? "CANCEL" : "REQUEST",
    startsAt: ctx.startsAt,
    endsAt: ctx.endsAt,
    summary: audience === "CANDIDATE" ? `${ctx.stepName} - ${ctx.jobTitle}` : `Interview: ${ctx.candidate.name} (${ctx.stepName})`,
    description: description || undefined,
    location: ctx.location ?? ctx.meetingLink ?? undefined,
    attendees: audience === "CANDIDATE" ? [{ name: ctx.candidate.name, email: ctx.candidate.email }] : ctx.interviewers.map((i) => ({ name: i.name, email: i.email })),
  })
}

/**
 * Sends in-app notifications and emails (with a calendar invite) for a booking event.
 * Best effort: failures are logged and never thrown, so a mail outage cannot undo a booking.
 */
export async function notifyBookingEvent(bookingId: bigint, event: BookingEvent, opts: { reason?: string | null; previous?: BookingContext | null } = {}) {
  try {
    const ctx = await loadBookingContext(bookingId)
    if (!ctx) return
    const when = whenText(ctx)
    const where = whereText(ctx)
    const candidateLink = ctx.pipelineId ? appUrl(`/applications/${ctx.pipelineId}`) : appUrl("/applications")

    // --- candidate
    await createNotification({
      userId: ctx.candidate.id,
      title: HEADINGS[event],
      message: `${ctx.stepName} for ${ctx.jobTitle}: ${when}`,
      type: event.startsWith("REMINDER") ? "REMINDER" : "SYSTEM",
      entityType: "slot_booking",
      entityId: ctx.bookingId,
    }).catch((e) => console.error("Candidate notification failed:", e))

    await sendEmail({
      to: ctx.candidate.email,
      subject: SUBJECTS[event](ctx),
      html: renderEmailLayout({
        heading: HEADINGS[event],
        intro: `Hello ${ctx.candidate.name},`,
        details: [
          { label: "Job", value: ctx.jobTitle },
          { label: "Round", value: ctx.stepName },
          { label: "When", value: when },
          { label: "Where", value: where },
          { label: "Reason", value: event === "CANCELLED" ? opts.reason : null },
        ],
        bodyHtml: ctx.instructionsForCandidate
          ? `<p style="margin:0 0 8px;font-size:14px;color:#374151;"><strong>Instructions:</strong> ${ctx.instructionsForCandidate.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)}</p>`
          : undefined,
        cta: event === "CANCELLED" ? { label: "Choose a new time", url: candidateLink } : { label: "View my application", url: candidateLink },
      }),
      icalEvent: event.startsWith("REMINDER") ? undefined : { method: event === "CANCELLED" ? "CANCEL" : "REQUEST", content: icsFor(ctx, event, "CANDIDATE") },
    })

    // --- interviewers
    const interviewerHeading: Record<BookingEvent, string> = {
      BOOKED: "A candidate booked an interview with you",
      RESCHEDULED: "An interview was rescheduled",
      CANCELLED: "An interview was cancelled",
      REMINDER_DAY: "Interview tomorrow",
      REMINDER_HOUR: "Interview starting soon",
    }
    for (const interviewer of ctx.interviewers) {
      await createNotification({
        userId: interviewer.id,
        title: interviewerHeading[event],
        message: `${ctx.candidate.name} · ${ctx.stepName} · ${when}`,
        type: event.startsWith("REMINDER") ? "REMINDER" : "ASSIGNMENT",
        entityType: "slot_booking",
        entityId: ctx.bookingId,
      }).catch((e) => console.error("Interviewer notification failed:", e))

      await sendEmail({
        to: interviewer.email,
        subject: `${interviewerHeading[event]}: ${ctx.candidate.name}`,
        html: renderEmailLayout({
          heading: interviewerHeading[event],
          intro: `Hello ${interviewer.name},`,
          details: [
            { label: "Candidate", value: ctx.candidate.name },
            { label: "Job", value: ctx.jobTitle },
            { label: "Round", value: ctx.stepName },
            { label: "When", value: when },
            { label: "Where", value: where },
          ],
          cta: event === "CANCELLED" ? undefined : { label: "Open interview", url: appUrl(`/interviewer/interviews/${ctx.bookingId}`) },
        }),
        icalEvent: event.startsWith("REMINDER") ? undefined : { method: event === "CANCELLED" ? "CANCEL" : "REQUEST", content: icsFor(ctx, event, "INTERVIEWER") },
      })
    }

    // --- interviewers who were on the old slot but are not on the new one: take it off their calendar
    if (event === "RESCHEDULED" && opts.previous) {
      const stillOn = new Set(ctx.interviewers.map((i) => String(i.id)))
      for (const old of opts.previous.interviewers.filter((i) => !stillOn.has(String(i.id)))) {
        await createNotification({
          userId: old.id,
          title: "An interview was moved away from you",
          message: `${ctx.candidate.name} · ${ctx.stepName} was rescheduled to another interviewer`,
          type: "SYSTEM",
          entityType: "slot_booking",
          entityId: ctx.bookingId,
        }).catch((e) => console.error("Old panel notification failed:", e))
        await sendEmail({
          to: old.email,
          subject: `Interview removed: ${ctx.candidate.name}`,
          html: renderEmailLayout({
            heading: "An interview was moved away from you",
            intro: `Hello ${old.name}, the interview with ${ctx.candidate.name} (${ctx.stepName}) has been reassigned and no longer needs you.`,
          }),
          icalEvent: {
            method: "CANCEL",
            content: buildIcs({
              uid: `booking-${ctx.bookingId}@rms`,
              sequence: ctx.sequence,
              method: "CANCEL",
              startsAt: opts.previous.startsAt,
              endsAt: opts.previous.endsAt,
              summary: `Interview: ${ctx.candidate.name} (${ctx.stepName})`,
              attendees: [{ name: old.name, email: old.email }],
            }),
          },
        })
      }
    }
  } catch (error) {
    console.error(`Booking notification (${event}) failed for booking ${bookingId}:`, error)
  }
}

/** Tells candidates who are waiting to book that new slots are available. Returns how many were notified. */
export async function notifySlotsPublished(stepId: bigint): Promise<number> {
  try {
    const waiting = await prisma.candidatePipelineStep.findMany({
      where: {
        workflowStepId: stepId,
        status: "IN_PROGRESS",
        pipeline: { overallStatus: "IN_PROGRESS", lockState: "NONE" },
        slotBookings: { none: { status: "RESERVED" } },
      },
      select: {
        pipelineId: true,
        pipeline: { select: { candidate: { select: { id: true, firstname: true, lastname: true, email: true } }, job: { select: { title: true } } } },
        workflowStep: { select: { stepName: true } },
      },
    })

    for (const w of waiting) {
      const candidate = w.pipeline.candidate
      const link = appUrl(`/applications/${w.pipelineId}`)
      await createNotification({
        userId: candidate.id,
        title: "Interview slots are open",
        message: `Book your ${w.workflowStep.stepName} for ${w.pipeline.job.title}`,
        type: "ASSIGNMENT",
        entityType: "pipeline",
        entityId: w.pipelineId,
      }).catch((e) => console.error("Slots notification failed:", e))
      await sendEmail({
        to: candidate.email,
        subject: `Book your ${w.workflowStep.stepName} - ${w.pipeline.job.title}`,
        html: renderEmailLayout({
          heading: "Choose your interview time",
          intro: `Hello ${candidate.firstname}, interview slots for ${w.pipeline.job.title} (${w.workflowStep.stepName}) are now open. Pick the time that suits you best.`,
          cta: { label: "Book my interview", url: link },
        }),
      })
    }
    return waiting.length
  } catch (error) {
    console.error("notifySlotsPublished failed:", error)
    return 0
  }
}
