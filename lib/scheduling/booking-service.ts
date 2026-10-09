import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { checkBookable, checkReschedulable, type BookingErrorCode } from "./booking-rules"
import { MIN_LEAD_MINUTES } from "./slot-service"

export class BookingError extends Error {
  constructor(public code: BookingErrorCode | "NOT_FOUND" | "INVALID_STATE", message: string, public status: number = 409) {
    super(message)
  }
}

const nowSeconds = () => BigInt(Math.floor(Date.now() / 1000))
export const activeKeyFor = (workflowStepId: bigint, candidateId: bigint) => `${workflowStepId}:${candidateId}`

type Tx = Prisma.TransactionClient

/**
 * Atomically takes one seat: succeeds only while the slot is open, unblocked, future and below capacity.
 * Two concurrent bookings of the last seat can never both pass this single UPDATE.
 */
async function takeSeat(tx: Tx, slotId: bigint, minLeadMins: number): Promise<boolean> {
  const changed = await tx.$executeRaw`
    UPDATE "interview_slot"
    SET "booked_count" = "booked_count" + 1, "updated_at" = ${nowSeconds()}
    WHERE "id" = ${slotId}
      AND "is_blocked" = false
      AND "booked_count" < "capacity"
      AND "startsAt" > (NOW() AT TIME ZONE 'UTC') + make_interval(mins => ${minLeadMins}::int)`
  return changed === 1
}

async function releaseSeat(tx: Tx, slotId: bigint) {
  await tx.$executeRaw`
    UPDATE "interview_slot"
    SET "booked_count" = GREATEST("booked_count" - 1, 0), "updated_at" = ${nowSeconds()}
    WHERE "id" = ${slotId}`
}

async function audit(tx: Tx, args: { pipelineId: bigint | null; userId: bigint; action: "CREATED" | "UPDATED" | "DELETED"; bookingId: bigint; changes: object }) {
  await tx.auditLog.create({
    data: {
      pipelineId: args.pipelineId,
      userId: args.userId,
      action: args.action,
      entityType: "SlotBooking",
      entityId: args.bookingId,
      changes: JSON.stringify(args.changes),
      timestamp: nowSeconds(),
    },
  })
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

/** Candidate books a slot for the round their pipeline is currently in. */
export async function bookSlot(input: { candidateId: bigint; pipelineId: bigint; slotId: bigint }): Promise<{ bookingId: bigint }> {
  try {
    return await prisma.$transaction(async (tx) => {
      const pipeline = await tx.candidatePipeline.findUnique({
        where: { id: input.pipelineId },
        select: { id: true, candidateId: true, jobId: true, applicationId: true, overallStatus: true, lockState: true, currentStepOrder: true },
      })
      const slot = await tx.interviewSlot.findUnique({
        where: { id: input.slotId },
        select: {
          id: true,
          stepId: true,
          startsAt: true,
          isBlocked: true,
          capacity: true,
          bookedCount: true,
          step: { select: { workflow: { select: { jobId: true } } } },
        },
      })
      if (!pipeline || !slot) throw new BookingError("NOT_FOUND", "Slot or application not found", 404)

      const [pipelineStep, activeBooking, noShowCount] = await Promise.all([
        tx.candidatePipelineStep.findFirst({
          where: { pipelineId: pipeline.id, workflowStepId: slot.stepId },
          select: { id: true, status: true, stepOrder: true },
        }),
        tx.slotBooking.findFirst({ where: { activeKey: activeKeyFor(slot.stepId, input.candidateId) }, select: { id: true } }),
        tx.slotBooking.count({
          where: { candidateId: input.candidateId, status: "NO_SHOW", slot: { stepId: slot.stepId } },
        }),
      ])

      const failure = checkBookable({
        candidateId: input.candidateId.toString(),
        now: new Date(),
        minLeadMins: MIN_LEAD_MINUTES,
        pipeline: {
          candidateId: pipeline.candidateId.toString(),
          jobId: pipeline.jobId.toString(),
          overallStatus: pipeline.overallStatus,
          lockState: pipeline.lockState,
          currentStepOrder: pipeline.currentStepOrder,
        },
        pipelineStep: pipelineStep && { status: pipelineStep.status, stepOrder: pipelineStep.stepOrder },
        slot: {
          jobId: slot.step.workflow.jobId.toString(),
          startsAt: slot.startsAt,
          isBlocked: slot.isBlocked,
          capacity: slot.capacity,
          bookedCount: slot.bookedCount,
        },
        hasActiveBooking: !!activeBooking,
        noShowCount,
      })
      if (failure) throw new BookingError(failure.code, failure.message, failure.code === "NOT_YOURS" ? 403 : 409)

      if (!(await takeSeat(tx, slot.id, MIN_LEAD_MINUTES))) {
        throw new BookingError("SLOT_FULL", "This slot has just been taken. Please choose another one.")
      }

      const now = nowSeconds()
      const booking = await tx.slotBooking.create({
        data: {
          slotId: slot.id,
          candidateId: input.candidateId,
          applicationId: pipeline.applicationId,
          pipelineStepId: pipelineStep!.id,
          status: "RESERVED",
          activeKey: activeKeyFor(slot.stepId, input.candidateId),
          createdAt: now,
          updatedAt: now,
        },
        select: { id: true },
      })
      await audit(tx, { pipelineId: pipeline.id, userId: input.candidateId, action: "CREATED", bookingId: booking.id, changes: { slotId: slot.id.toString() } })
      return { bookingId: booking.id }
    })
  } catch (error) {
    // The unique activeKey is the last line of defence against a double submit
    if (isUniqueViolation(error)) {
      throw new BookingError("ALREADY_BOOKED", "You already have an interview booked for this round.")
    }
    throw error
  }
}

/** Admin cancels a booking; the seat is released and the candidate returns to "awaiting booking". */
export async function cancelBooking(input: { bookingId: bigint; actorId: bigint; reason?: string | null }): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const booking = await tx.slotBooking.findUnique({
      where: { id: input.bookingId },
      select: { id: true, slotId: true, status: true, pipelineStepId: true, icsSequence: true, pipelineStep: { select: { pipelineId: true } } },
    })
    if (!booking) throw new BookingError("NOT_FOUND", "Booking not found", 404)
    if (booking.status !== "RESERVED") throw new BookingError("INVALID_STATE", "This booking is no longer active.")

    await tx.slotBooking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        activeKey: null,
        cancelledAt: nowSeconds(),
        cancelledBy: input.actorId,
        cancelReason: input.reason?.trim() || null,
        icsSequence: booking.icsSequence + 1,
        updatedAt: nowSeconds(),
      },
    })
    await releaseSeat(tx, booking.slotId)
    await audit(tx, {
      pipelineId: booking.pipelineStep?.pipelineId ?? null,
      userId: input.actorId,
      action: "DELETED",
      bookingId: booking.id,
      changes: { reason: input.reason ?? null },
    })
  })
}

/** Admin moves a booking to another slot of the same round. The booking id (and calendar UID) stays the same. */
export async function rescheduleBooking(input: { bookingId: bigint; newSlotId: bigint; actorId: bigint }): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const booking = await tx.slotBooking.findUnique({
      where: { id: input.bookingId },
      select: { id: true, slotId: true, status: true, icsSequence: true, slot: { select: { stepId: true } }, pipelineStep: { select: { pipelineId: true } } },
    })
    if (!booking) throw new BookingError("NOT_FOUND", "Booking not found", 404)
    if (booking.status !== "RESERVED") throw new BookingError("INVALID_STATE", "This booking is no longer active.")
    if (booking.slotId === input.newSlotId) throw new BookingError("INVALID_STATE", "The booking is already in this slot.")

    const target = await tx.interviewSlot.findUnique({
      where: { id: input.newSlotId },
      select: { id: true, stepId: true, startsAt: true, isBlocked: true, capacity: true, bookedCount: true },
    })
    if (!target) throw new BookingError("NOT_FOUND", "Slot not found", 404)

    const failure = checkReschedulable({
      now: new Date(),
      minLeadMins: 0,
      sameRound: target.stepId === booking.slot.stepId,
      slot: target,
    })
    if (failure) throw new BookingError(failure.code, failure.message)

    if (!(await takeSeat(tx, target.id, 0))) throw new BookingError("SLOT_FULL", "That slot has just been taken.")
    await releaseSeat(tx, booking.slotId)
    await tx.slotBooking.update({
      where: { id: booking.id },
      data: {
        slotId: target.id,
        icsSequence: booking.icsSequence + 1,
        remindedDayAt: null,
        remindedHourAt: null,
        updatedAt: nowSeconds(),
      },
    })
    await audit(tx, {
      pipelineId: booking.pipelineStep?.pipelineId ?? null,
      userId: input.actorId,
      action: "UPDATED",
      bookingId: booking.id,
      changes: { fromSlotId: booking.slotId.toString(), toSlotId: target.id.toString() },
    })
  })
}

/** Admin marks a past interview as a no-show; the candidate may book again until the cap in booking-rules. */
export async function markNoShow(input: { bookingId: bigint; actorId: bigint }): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const booking = await tx.slotBooking.findUnique({
      where: { id: input.bookingId },
      select: { id: true, status: true, slot: { select: { startsAt: true } }, pipelineStep: { select: { pipelineId: true } } },
    })
    if (!booking) throw new BookingError("NOT_FOUND", "Booking not found", 404)
    if (booking.status !== "RESERVED") throw new BookingError("INVALID_STATE", "This booking is no longer active.")
    if (booking.slot.startsAt > new Date()) throw new BookingError("INVALID_STATE", "The interview has not happened yet.")

    await tx.slotBooking.update({ where: { id: booking.id }, data: { status: "NO_SHOW", activeKey: null, updatedAt: nowSeconds() } })
    await audit(tx, {
      pipelineId: booking.pipelineStep?.pipelineId ?? null,
      userId: input.actorId,
      action: "UPDATED",
      bookingId: booking.id,
      changes: { status: "NO_SHOW" },
    })
  })
}
