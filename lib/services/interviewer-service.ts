import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { appUrl, renderEmailLayout } from "@/lib/scheduling/email-layout"

const INVITE_TTL_MS = 72 * 60 * 60 * 1000

export class InterviewerServiceError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message)
  }
}

export interface CreateInterviewerInput {
  firstname: string
  lastname: string
  email: string
  phone?: string | null
  department?: string | null
}

function nowSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000))
}

async function uniqueUsername(email: string): Promise<string> {
  const base = (email.split("@")[0] || "interviewer").toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 80) || "interviewer"
  let candidate = base
  for (let i = 0; i < 20; i++) {
    const exists = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })
    if (!exists) return candidate
    candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`
  }
  return `${base}${Date.now()}`
}

/** Issues a fresh "set your password" token (reuses the reset-password flow) and emails it. */
export async function sendInterviewerInvite(userId: bigint): Promise<{ emailed: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstname: true, lastname: true, role: true },
  })
  if (!user || user.role !== "INTERVIEWER") throw new InterviewerServiceError("Interviewer not found", 404)

  const token = crypto.randomBytes(32).toString("hex")
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: BigInt(Date.now() + INVITE_TTL_MS), createdAt: BigInt(Date.now()) },
    }),
  ])

  const link = appUrl(`/reset-password/${token}`)
  const result = await sendEmail({
    to: user.email,
    subject: "You have been added as an interviewer",
    html: renderEmailLayout({
      heading: `Welcome, ${user.firstname}`,
      intro:
        "An interviewer account has been created for you. Set your password to sign in, add your availability and start receiving interviews.",
      cta: { label: "Set your password", url: link },
      bodyHtml: `<p style="margin:16px 0 0;font-size:12px;color:#6b7280;">This link is valid for 72 hours. If it expires, ask an admin to resend the invitation.</p>`,
    }),
  })
  return { emailed: result.success }
}

export async function createInterviewer(input: CreateInterviewerInput) {
  const email = input.email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) throw new InterviewerServiceError("A user with this email already exists", 409)

  // Random, never-disclosed password: the interviewer sets their own via the invite link.
  const { hash } = await import("bcryptjs")
  const password = await hash(crypto.randomBytes(32).toString("hex"), 10)
  const now = nowSeconds()

  const user = await prisma.user.create({
    data: {
      role: "INTERVIEWER",
      userStatus: "ACTIVE",
      username: await uniqueUsername(email),
      password,
      firstname: input.firstname.trim(),
      lastname: input.lastname.trim(),
      email,
      phone1: input.phone?.trim() || null,
      department: input.department?.trim() || null,
      createdAt: now,
      updatedAt: now,
    },
    select: { id: true },
  })

  const invite = await sendInterviewerInvite(user.id)
  return { id: user.id, invited: invite.emailed }
}

export async function setInterviewerSuspended(userId: bigint, suspended: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!user || user.role !== "INTERVIEWER") throw new InterviewerServiceError("Interviewer not found", 404)

  if (suspended) {
    // Don't strand candidates: refuse while the interviewer still has upcoming booked interviews.
    const upcoming = await prisma.slotBooking.count({
      where: { status: "RESERVED", slot: { startsAt: { gt: new Date() }, interviewers: { some: { interviewerId: userId } } } },
    })
    if (upcoming > 0) {
      throw new InterviewerServiceError(
        `Cannot suspend: ${upcoming} upcoming interview${upcoming === 1 ? "" : "s"} still booked. Reschedule them first.`,
        409
      )
    }
  }
  await prisma.user.update({ where: { id: userId }, data: { suspended, updatedAt: nowSeconds() } })
}

export async function listInterviewers() {
  const now = new Date()
  const users = await prisma.user.findMany({
    where: { role: "INTERVIEWER", deletedAt: null },
    orderBy: [{ firstname: "asc" }, { lastname: "asc" }],
    select: {
      id: true,
      firstname: true,
      lastname: true,
      email: true,
      phone1: true,
      department: true,
      suspended: true,
      lastLogin: true,
      createdAt: true,
      _count: { select: { stepInterviewerAssignments: true } },
    },
  })

  const ids = users.map((u) => u.id)
  const upcoming = ids.length
    ? await prisma.slotInterviewer.groupBy({
        by: ["interviewerId"],
        where: { interviewerId: { in: ids }, slot: { startsAt: { gt: now }, bookings: { some: { status: "RESERVED" } } } },
        _count: { _all: true },
      })
    : []
  const upcomingBy = new Map(upcoming.map((r) => [r.interviewerId.toString(), r._count._all]))

  return users.map((u) => ({
    id: u.id.toString(),
    firstname: u.firstname,
    lastname: u.lastname,
    email: u.email,
    phone: u.phone1,
    department: u.department,
    suspended: u.suspended,
    hasLoggedIn: u.lastLogin !== null,
    createdAt: u.createdAt.toString(),
    stats: {
      assignedSteps: u._count.stepInterviewerAssignments,
      upcomingInterviews: upcomingBy.get(u.id.toString()) ?? 0,
    },
  }))
}
