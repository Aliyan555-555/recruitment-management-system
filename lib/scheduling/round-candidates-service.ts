import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { sendEmail } from "@/lib/email"
import { readStepConfig } from "@/lib/workflow/step-config"
import { SchedulingError } from "./availability-service"
import { appUrl, renderEmailLayout } from "./email-layout"
import { getOrgTimeZone } from "./org-settings"
import { buildRoundCandidateRow } from "./round-candidates"

const REMIND_COOLDOWN_SECONDS = 24 * 3600

/** Candidates tab of a round: everyone admitted to it (applicants still under review live on the Applicants page). */
export async function getRoundCandidates(stepId: bigint) {
  const step = await prisma.workflowStep.findUnique({ where: { id: stepId } })
  if (!step) throw new SchedulingError("Round not found", 404)
  const config = readStepConfig(step)

  const [timeZone, rows, pendingApplicants] = await Promise.all([
    getOrgTimeZone(),
    prisma.candidatePipelineStep.findMany({
      where: { workflowStepId: stepId, status: { in: ["IN_PROGRESS", "COMPLETED", "REJECTED", "SKIPPED"] } },
      orderBy: { startedAt: "asc" },
      take: 1000,
      select: {
        status: true,
        stepOrder: true,
        pipeline: {
          select: {
            id: true,
            currentStepOrder: true,
            overallStatus: true,
            candidate: { select: { id: true, firstname: true, lastname: true, email: true } },
          },
        },
        stageEvaluations: {
          select: {
            evaluatorId: true,
            submittedAt: true,
            recommendation: true,
            formData: true,
            evaluator: { select: { firstname: true, lastname: true } },
          },
        },
        slotBookings: {
          where: { status: { in: ["RESERVED", "COMPLETED", "NO_SHOW"] } },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            slotId: true,
            slot: {
              select: {
                startsAt: true,
                endsAt: true,
                interviewers: { select: { interviewerId: true, interviewer: { select: { firstname: true, lastname: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.candidatePipelineStep.count({ where: { workflowStepId: stepId, status: "PENDING", pipeline: { overallStatus: "IN_PROGRESS" } } }),
  ])

  const now = new Date()
  const candidates = rows.map((r) => {
    const active = r.slotBookings.find((b) => b.status === "RESERVED")
    const last = r.slotBookings.find((b) => b.status !== "RESERVED")
    return buildRoundCandidateRow({
      candidateId: r.pipeline.candidate.id.toString(),
      name: `${r.pipeline.candidate.firstname} ${r.pipeline.candidate.lastname}`,
      email: r.pipeline.candidate.email,
      pipelineId: r.pipeline.id.toString(),
      stepStatus: r.status,
      stepOrder: r.stepOrder,
      pipelineCurrentStepOrder: r.pipeline.currentStepOrder,
      pipelineStatus: r.pipeline.overallStatus,
      roundIsRequired: step.isRequired,
      roundIsInterview: config.isInterview,
      booking: active
        ? {
            id: active.id.toString(),
            slotId: active.slotId.toString(),
            startsAt: active.slot.startsAt,
            endsAt: active.slot.endsAt,
            interviewerIds: active.slot.interviewers.map((i) => i.interviewerId.toString()),
            interviewerNames: active.slot.interviewers.map((i) => `${i.interviewer.firstname} ${i.interviewer.lastname}`),
          }
        : null,
      lastBooking: last
        ? { status: last.status, startsAt: last.slot.startsAt, interviewerIds: last.slot.interviewers.map((i) => i.interviewerId.toString()) }
        : null,
      noShowCount: r.slotBookings.filter((b) => b.status === "NO_SHOW").length,
      evaluations: r.stageEvaluations.map((e) => ({
        evaluatorId: e.evaluatorId.toString(),
        evaluatorName: `${e.evaluator.firstname} ${e.evaluator.lastname}`,
        submittedAt: e.submittedAt,
        recommendation: e.recommendation,
        formData: e.formData,
      })),
      now,
    })
  })

  return {
    timeZone,
    round: {
      id: step.id.toString(),
      name: step.stepName,
      stepType: config.stepType,
      stepOrder: step.stepOrder,
      isRequired: step.isRequired,
      isInterview: config.isInterview,
    },
    pendingApplicants,
    candidates,
  }
}

/** Drawer details: every scorecard of the candidate in this round (submitted ones in full, drafts only as "pending"). */
export async function getRoundCandidateDetail(stepId: bigint, candidateId: bigint) {
  const ps = await prisma.candidatePipelineStep.findFirst({
    where: { workflowStepId: stepId, pipeline: { candidateId } },
    select: {
      status: true,
      pipeline: {
        select: {
          id: true,
          candidate: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true,
              phone1: true,
              educations: { include: { educationLevel: true }, orderBy: { createdAt: "desc" }, take: 1 },
              experiences: { orderBy: { createdAt: "desc" }, take: 1 },
            },
          },
        },
      },
      stageEvaluations: {
        select: {
          id: true,
          submittedAt: true,
          recommendation: true,
          score: true,
          formData: true,
          evaluator: { select: { firstname: true, lastname: true, role: true } },
        },
      },
      slotBookings: {
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, cancelReason: true, slot: { select: { startsAt: true, endsAt: true } } },
      },
    },
  })
  if (!ps) throw new SchedulingError("Candidate not found in this round", 404)
  const c = ps.pipeline.candidate
  const edu = c.educations[0]
  const exp = c.experiences[0]
  const { scoreFormData } = await import("@/lib/evaluations/scoring")

  return {
    candidate: {
      id: c.id.toString(),
      name: `${c.firstname} ${c.lastname}`,
      email: c.email,
      phone: c.phone1,
      education: edu ? `${edu.educationLevel.name} - ${edu.degreeTitle}` : null,
      lastRole: exp ? `${exp.jobTitle} at ${exp.company}` : null,
    },
    pipelineId: ps.pipeline.id.toString(),
    scorecards: ps.stageEvaluations.map((e) => {
      const scored = e.submittedAt ? scoreFormData(e.formData) : null
      const fd = (e.formData ?? {}) as Record<string, unknown>
      return {
        id: e.id.toString(),
        by: `${e.evaluator.firstname} ${e.evaluator.lastname}`,
        byAdmin: e.evaluator.role === "ADMIN",
        submitted: e.submittedAt !== null,
        recommendation: e.submittedAt ? e.recommendation : null,
        scorePercentage: scored?.percentage ?? null,
        comments: e.submittedAt && typeof fd.comments === "string" ? fd.comments : null,
      }
    }),
    bookings: ps.slotBookings.map((b) => ({
      id: b.id.toString(),
      status: b.status,
      startsAt: b.slot.startsAt.toISOString(),
      endsAt: b.slot.endsAt.toISOString(),
      cancelReason: b.cancelReason,
    })),
  }
}

/** Nudges admitted candidates who have not booked yet (once per 24h each). */
export async function remindToBook(stepId: bigint, candidateIds: bigint[], cooldownSeconds = REMIND_COOLDOWN_SECONDS): Promise<{ sent: number }> {
  const step = await prisma.workflowStep.findUnique({
    where: { id: stepId },
    select: { stepName: true, workflow: { select: { job: { select: { title: true } } } } },
  })
  if (!step) throw new SchedulingError("Round not found", 404)

  const waiting = await prisma.candidatePipelineStep.findMany({
    where: {
      workflowStepId: stepId,
      status: "IN_PROGRESS",
      pipeline: { candidateId: { in: candidateIds }, overallStatus: "IN_PROGRESS", lockState: "NONE" },
      slotBookings: { none: { status: "RESERVED" } },
    },
    select: { pipeline: { select: { id: true, candidate: { select: { id: true, firstname: true, email: true } } } } },
  })

  const since = BigInt(Math.floor(Date.now() / 1000) - cooldownSeconds)
  let sent = 0
  for (const w of waiting) {
    const c = w.pipeline.candidate
    const recent = await prisma.notification.findFirst({
      where: { userId: c.id, entityType: "booking_reminder", entityId: w.pipeline.id, createdAt: { gte: since } },
      select: { id: true },
    })
    if (recent) continue
    await createNotification({
      userId: c.id,
      title: `Book your ${step.stepName}`,
      message: `${step.workflow.job.title}: please choose your interview time.`,
      type: "REMINDER",
      entityType: "booking_reminder",
      entityId: w.pipeline.id,
    })
    await sendEmail({
      to: c.email,
      subject: `Reminder: book your ${step.stepName} - ${step.workflow.job.title}`,
      html: renderEmailLayout({
        heading: "Please choose your interview time",
        intro: `Hello ${c.firstname}, you have not booked your ${step.stepName} for ${step.workflow.job.title} yet. It only takes a minute.`,
        cta: { label: "Book my interview", url: appUrl(`/applications/${w.pipeline.id}`) },
      }),
    })
    sent++
  }
  return { sent }
}
