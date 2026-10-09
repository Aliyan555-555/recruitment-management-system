import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { getOrgTimeZone } from "@/lib/scheduling/org-settings"
import { readStepConfig } from "@/lib/workflow/step-config"
import { INTERNAL_BEHAVIORS } from "@/lib/constants/focus-group-behaviors"
import { isRecommended, scoreFormData, validatePanelForm, validateSkillsForm } from "./scoring"

export class EvaluationError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message)
  }
}

const nowSeconds = () => BigInt(Math.floor(Date.now() / 1000))
/** Interviewers may open the scorecard slightly before the interview starts. */
const EARLY_ACCESS_MS = 15 * 60_000

export type InterviewTab = "upcoming" | "needs-feedback" | "completed"

async function resolvePipelineStepId(booking: { pipelineStepId: bigint | null; applicationId: bigint; slot: { stepId: bigint } }) {
  if (booking.pipelineStepId) return booking.pipelineStepId
  const found = await prisma.candidatePipelineStep.findFirst({
    where: { workflowStepId: booking.slot.stepId, pipeline: { applicationId: booking.applicationId } },
    select: { id: true },
  })
  return found?.id ?? null
}

/** Loads a booking only if the interviewer sits on its slot; otherwise it does not exist for them. */
async function loadOwnedBooking(interviewerId: bigint, bookingId: bigint) {
  const booking = await prisma.slotBooking.findFirst({
    where: { id: bookingId, slot: { interviewers: { some: { interviewerId } } } },
    include: {
      candidate: {
        include: {
          profileDetails: true,
          educations: { include: { educationLevel: true }, orderBy: { createdAt: "desc" }, take: 1 },
          experiences: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      slot: {
        include: {
          step: { include: { workflow: { include: { job: { select: { id: true, title: true, company: true } } } } } },
          interviewers: { include: { interviewer: { select: { id: true, firstname: true, lastname: true } } } },
        },
      },
    },
  })
  if (!booking) throw new EvaluationError("Interview not found", 404)
  return booking
}

export async function getInterviewDetail(interviewerId: bigint, bookingId: bigint) {
  const booking = await loadOwnedBooking(interviewerId, bookingId)
  const timeZone = await getOrgTimeZone()
  const config = readStepConfig(booking.slot.step)
  const pipelineStepId = await resolvePipelineStepId(booking)

  const evaluations = pipelineStepId
    ? await prisma.stageEvaluation.findMany({
        where: { pipelineStepId, evaluatorId: { in: booking.slot.interviewers.map((i) => i.interviewerId) } },
        select: { evaluatorId: true, formData: true, submittedAt: true, score: true },
      })
    : []
  const mine = evaluations.find((e) => e.evaluatorId === interviewerId) ?? null
  const mode = booking.slot.mode ?? config.interviewMode
  const latestEducation = booking.candidate.educations[0]
  const latestExperience = booking.candidate.experiences[0]

  return {
    timeZone,
    booking: {
      id: booking.id.toString(),
      status: booking.status,
      startsAt: booking.slot.startsAt.toISOString(),
      endsAt: booking.slot.endsAt.toISOString(),
      mode,
      meetingLink: mode === "REMOTE" ? booking.slot.meetingLink ?? config.meetingLink : null,
      location: mode === "ONSITE" ? booking.slot.location ?? config.location : null,
    },
    round: {
      name: booking.slot.step.stepName,
      type: config.stepType,
      notesForInterviewers: config.interviewerInstructions,
      formKind: config.stepType === "FOCUS_GROUP" ? ("PANEL" as const) : ("SKILLS" as const),
    },
    job: {
      title: booking.slot.step.workflow.job.title,
      company: booking.slot.step.workflow.job.company,
    },
    candidate: {
      name: `${booking.candidate.firstname} ${booking.candidate.lastname}`,
      email: booking.candidate.email,
      phone: booking.candidate.phone1,
      education: latestEducation ? `${latestEducation.educationLevel.name} - ${latestEducation.degreeTitle}` : null,
      institution: latestEducation?.institute ?? null,
      lastEmployer: latestExperience?.company ?? null,
      lastRole: latestExperience?.jobTitle ?? null,
      expectedSalary: booking.candidate.profileDetails?.expectedSalary ?? null,
      noticePeriod: booking.candidate.profileDetails?.noticePeriod ?? null,
    },
    panel: booking.slot.interviewers.map((i) => ({
      id: i.interviewerId.toString(),
      name: `${i.interviewer.firstname} ${i.interviewer.lastname}`,
      isMe: i.interviewerId === interviewerId,
      submitted: evaluations.some((e) => e.evaluatorId === i.interviewerId && e.submittedAt !== null),
    })),
    behaviors: config.stepType === "FOCUS_GROUP" ? INTERNAL_BEHAVIORS : null,
    evaluation: mine
      ? { formData: mine.formData, submittedAt: mine.submittedAt?.toString() ?? null, score: mine.score }
      : null,
    canEvaluate:
      (booking.status === "RESERVED" || booking.status === "COMPLETED") &&
      booking.slot.startsAt.getTime() - EARLY_ACCESS_MS <= Date.now(),
  }
}

function assertCanEvaluate(booking: Awaited<ReturnType<typeof loadOwnedBooking>>) {
  if (booking.status !== "RESERVED" && booking.status !== "COMPLETED") {
    throw new EvaluationError("This interview is not active.", 409)
  }
  if (booking.slot.startsAt.getTime() - EARLY_ACCESS_MS > Date.now()) {
    throw new EvaluationError("The scorecard opens shortly before the interview starts.", 409)
  }
}

export async function saveDraft(interviewerId: bigint, bookingId: bigint, formData: unknown) {
  if (!formData || typeof formData !== "object") throw new EvaluationError("Invalid form")
  const booking = await loadOwnedBooking(interviewerId, bookingId)
  assertCanEvaluate(booking)
  const pipelineStepId = await resolvePipelineStepId(booking)
  if (!pipelineStepId) throw new EvaluationError("Pipeline step not found", 404)

  const existing = await prisma.stageEvaluation.findUnique({
    where: { pipelineStepId_evaluatorId: { pipelineStepId, evaluatorId: interviewerId } },
    select: { submittedAt: true },
  })
  if (existing?.submittedAt) throw new EvaluationError("This scorecard was already submitted.", 409)

  await prisma.stageEvaluation.upsert({
    where: { pipelineStepId_evaluatorId: { pipelineStepId, evaluatorId: interviewerId } },
    create: { pipelineStepId, evaluatorId: interviewerId, formData: formData as Prisma.InputJsonValue },
    update: { formData: formData as Prisma.InputJsonValue },
  })
}

export async function submitEvaluation(interviewerId: bigint, bookingId: bigint, formData: any) {
  const booking = await loadOwnedBooking(interviewerId, bookingId)
  assertCanEvaluate(booking)
  const config = readStepConfig(booking.slot.step)
  const problem = config.stepType === "FOCUS_GROUP" ? validatePanelForm(formData) : validateSkillsForm(formData)
  if (problem) throw new EvaluationError(problem)

  const pipelineStepId = await resolvePipelineStepId(booking)
  if (!pipelineStepId) throw new EvaluationError("Pipeline step not found", 404)

  const scored = scoreFormData(formData)
  const recommendation = isRecommended(formData.recommendedToHire) ? "HIRE" : "NO_HIRE"
  const panelIds = booking.slot.interviewers.map((i) => i.interviewerId)

  const result = await prisma.$transaction(async (tx) => {
    // Serialize panel members finishing at the same moment so exactly one of them sees "everyone submitted".
    await tx.$queryRaw`SELECT "id" FROM "candidate_pipeline_step" WHERE "id" = ${pipelineStepId} FOR UPDATE`
    const existing = await tx.stageEvaluation.findUnique({
      where: { pipelineStepId_evaluatorId: { pipelineStepId, evaluatorId: interviewerId } },
      select: { submittedAt: true },
    })
    if (existing?.submittedAt) throw new EvaluationError("This scorecard was already submitted.", 409)

    await tx.stageEvaluation.upsert({
      where: { pipelineStepId_evaluatorId: { pipelineStepId, evaluatorId: interviewerId } },
      create: {
        pipelineStepId,
        evaluatorId: interviewerId,
        formData: formData as Prisma.InputJsonValue,
        score: scored?.total ?? null,
        recommendation,
        submittedAt: nowSeconds(),
      },
      update: { formData: formData as Prisma.InputJsonValue, score: scored?.total ?? null, recommendation, submittedAt: nowSeconds() },
    })

    const submitted = await tx.stageEvaluation.count({
      where: { pipelineStepId, evaluatorId: { in: panelIds }, submittedAt: { not: null } },
    })
    const allIn = submitted >= panelIds.length

    if (allIn) {
      // Everyone has scored: the candidate is "ready for decision". The admin moves them on or rejects them.
      await tx.candidatePipelineStep.update({
        where: { id: pipelineStepId },
        data: { status: "COMPLETED", completedAt: nowSeconds() },
      })
      await tx.slotBooking.update({ where: { id: booking.id }, data: { status: "COMPLETED", updatedAt: nowSeconds() } })
    }
    return { allIn, submitted, total: panelIds.length }
  })

  if (result.allIn) {
    void notifyAdminsReadyForDecision(booking.candidate.firstname + " " + booking.candidate.lastname, booking.slot.step.stepName, booking.slot.step.workflow.job.title)
  }
  return { ...result, recommendation, scorePercentage: scored?.percentage ?? null }
}

async function notifyAdminsReadyForDecision(candidateName: string, stepName: string, jobTitle: string) {
  try {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN", suspended: false, deletedAt: null }, select: { id: true }, take: 50 })
    await Promise.all(
      admins.map((a) =>
        createNotification({
          userId: a.id,
          title: "Scorecards complete",
          message: `${candidateName} is ready for a decision after ${stepName} (${jobTitle}).`,
          type: "COMPLETION",
          entityType: "pipeline",
        })
      )
    )
  } catch (error) {
    console.error("Failed to notify admins:", error)
  }
}

// ---------------------------------------------------------------------------------------------
// Lists + dashboard
// ---------------------------------------------------------------------------------------------

export async function listInterviewerInterviews(interviewerId: bigint, tab: InterviewTab) {
  const timeZone = await getOrgTimeZone()
  const now = new Date()

  const mine: Prisma.SlotBookingWhereInput = { slot: { interviewers: { some: { interviewerId } } } }
  const where: Prisma.SlotBookingWhereInput =
    tab === "upcoming"
      ? { AND: [mine, { status: "RESERVED", slot: { endsAt: { gt: now } } }] }
      : tab === "needs-feedback"
        ? { AND: [mine, { status: { in: ["RESERVED", "COMPLETED"] }, slot: { startsAt: { lte: new Date(now.getTime() + EARLY_ACCESS_MS) } } }] }
        : { AND: [mine, { status: { in: ["RESERVED", "COMPLETED"] } }] }

  const bookings = await prisma.slotBooking.findMany({
    where,
    orderBy: { slot: { startsAt: tab === "upcoming" ? "asc" : "desc" } },
    take: 200,
    include: {
      candidate: { select: { firstname: true, lastname: true } },
      slot: {
        include: {
          step: { include: { workflow: { include: { job: { select: { title: true } } } } } },
          interviewers: { select: { interviewerId: true } },
        },
      },
    },
  })

  const stepIds = await Promise.all(bookings.map((b) => resolvePipelineStepId(b)))
  const evals = await prisma.stageEvaluation.findMany({
    where: { pipelineStepId: { in: stepIds.filter((x): x is bigint => x !== null) } },
    select: { pipelineStepId: true, evaluatorId: true, submittedAt: true },
  })

  const rows = bookings.map((b, i) => {
    const pipelineStepId = stepIds[i]
    const panelIds = b.slot.interviewers.map((p) => p.interviewerId)
    const forStep = evals.filter((e) => e.pipelineStepId === pipelineStepId && panelIds.includes(e.evaluatorId))
    const myEval = forStep.find((e) => e.evaluatorId === interviewerId)
    const myStatus = myEval?.submittedAt ? "SUBMITTED" : myEval ? "DRAFT" : "NOT_STARTED"
    const config = readStepConfig(b.slot.step)
    return {
      bookingId: b.id.toString(),
      candidateName: `${b.candidate.firstname} ${b.candidate.lastname}`,
      jobTitle: b.slot.step.workflow.job.title,
      stepName: b.slot.step.stepName,
      startsAt: b.slot.startsAt.toISOString(),
      endsAt: b.slot.endsAt.toISOString(),
      mode: b.slot.mode ?? config.interviewMode,
      myStatus,
      panelSubmitted: forStep.filter((e) => e.submittedAt).length,
      panelSize: panelIds.length,
    }
  })

  const filtered =
    tab === "needs-feedback" ? rows.filter((r) => r.myStatus !== "SUBMITTED") : tab === "completed" ? rows.filter((r) => r.myStatus === "SUBMITTED") : rows
  return { timeZone, interviews: filtered }
}

export async function getInterviewerDashboard(interviewerId: bigint) {
  const [upcoming, needsFeedback] = await Promise.all([
    listInterviewerInterviews(interviewerId, "upcoming"),
    listInterviewerInterviews(interviewerId, "needs-feedback"),
  ])
  const timeZone = upcoming.timeZone
  const todayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone })
  const today = todayKey(new Date())
  return {
    timeZone,
    counts: {
      today: upcoming.interviews.filter((i) => todayKey(new Date(i.startsAt)) === today).length,
      upcoming: upcoming.interviews.length,
      needsFeedback: needsFeedback.interviews.length,
    },
    next: upcoming.interviews.slice(0, 5),
    needsFeedback: needsFeedback.interviews.slice(0, 5),
  }
}
