import { prisma } from "@/lib/prisma"
import { zonedDateKey } from "@/lib/timezone"
import { getOrgTimeZone } from "./org-settings"
import { validateAvailability, type OneOffWindowInput, type WeeklyWindowInput } from "./availability-rules"

export class SchedulingError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message)
  }
}

const nowSeconds = () => BigInt(Math.floor(Date.now() / 1000))

function dateOnlyToKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function getAvailability(interviewerId: bigint) {
  const [timeZone, rows, timeOff] = await Promise.all([
    getOrgTimeZone(),
    prisma.interviewerAvailability.findMany({
      where: { interviewerId, isActive: true },
      orderBy: [{ dayOfWeek: "asc" }, { date: "asc" }, { startMinute: "asc" }],
    }),
    prisma.interviewerTimeOff.findMany({
      where: { interviewerId, endsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
  ])
  const today = zonedDateKey(new Date(), timeZone)

  return {
    timeZone,
    weekly: rows
      .filter((r) => r.dayOfWeek !== null)
      .map((r) => ({ dayOfWeek: r.dayOfWeek as number, startMinute: r.startMinute, endMinute: r.endMinute })),
    oneOff: rows
      .filter((r) => r.date !== null)
      .map((r) => ({ date: dateOnlyToKey(r.date as Date), startMinute: r.startMinute, endMinute: r.endMinute }))
      .filter((r) => r.date >= today),
    timeOff: timeOff.map((t) => ({
      id: t.id.toString(),
      startsAt: t.startsAt.toISOString(),
      endsAt: t.endsAt.toISOString(),
      reason: t.reason,
    })),
  }
}

/**
 * Replaces the interviewer's availability. Already published slots are untouched: new availability only
 * affects slots generated from now on.
 */
export async function replaceAvailability(
  interviewerId: bigint,
  input: { weekly: WeeklyWindowInput[]; oneOff: OneOffWindowInput[] }
) {
  const timeZone = await getOrgTimeZone()
  const error = validateAvailability(input, zonedDateKey(new Date(), timeZone))
  if (error) throw new SchedulingError(error)

  const now = nowSeconds()
  await prisma.$transaction([
    prisma.interviewerAvailability.deleteMany({ where: { interviewerId } }),
    prisma.interviewerAvailability.createMany({
      data: [
        ...input.weekly.map((w) => ({
          interviewerId,
          dayOfWeek: w.dayOfWeek,
          startMinute: w.startMinute,
          endMinute: w.endMinute,
          createdAt: now,
        })),
        ...input.oneOff.map((w) => ({
          interviewerId,
          date: new Date(`${w.date}T00:00:00.000Z`),
          startMinute: w.startMinute,
          endMinute: w.endMinute,
          createdAt: now,
        })),
      ],
    }),
  ])
}

export async function addTimeOff(interviewerId: bigint, input: { startsAt: Date; endsAt: Date; reason?: string | null }) {
  if (Number.isNaN(input.startsAt.getTime()) || Number.isNaN(input.endsAt.getTime())) throw new SchedulingError("Invalid dates")
  if (input.endsAt <= input.startsAt) throw new SchedulingError("End must be after start")
  if (input.endsAt.getTime() - input.startsAt.getTime() > 90 * 24 * 3600 * 1000) {
    throw new SchedulingError("Time off cannot exceed 90 days")
  }
  if (input.endsAt <= new Date()) throw new SchedulingError("Time off must end in the future")

  const booked = await prisma.slotBooking.count({
    where: {
      status: "RESERVED",
      slot: { startsAt: { lt: input.endsAt }, endsAt: { gt: input.startsAt }, interviewers: { some: { interviewerId } } },
    },
  })
  if (booked > 0) {
    const noun = booked === 1 ? "interview" : "interviews"
    throw new SchedulingError(
      `You already have ${booked} booked ${noun} in this period. Ask an admin to reschedule first.`,
      409
    )
  }

  const row = await prisma.interviewerTimeOff.create({
    data: {
      interviewerId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      reason: input.reason?.trim() || null,
      createdAt: nowSeconds(),
    },
  })
  return { id: row.id.toString() }
}

export async function removeTimeOff(interviewerId: bigint, id: bigint) {
  const result = await prisma.interviewerTimeOff.deleteMany({ where: { id, interviewerId } })
  if (result.count === 0) throw new SchedulingError("Time off not found", 404)
}
