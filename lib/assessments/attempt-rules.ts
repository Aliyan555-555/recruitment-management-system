import { prisma } from "@/lib/prisma"
import type { SkillAssessmentConfigValues } from "@/lib/assessments/config"
import type { SkillAssessment, SkillAssessmentStatus } from "@prisma/client"
import { formatCooldownRemaining } from "@/lib/assessments/level-display"

const TERMINAL_STATUSES: SkillAssessmentStatus[] = ["PASSED", "FAILED", "EXPIRED"]

export function isTerminalStatus(status: SkillAssessmentStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

export async function expireStaleInProgressAttempts(
  userSkillId: bigint,
  attemptTimeoutMinutes: number,
  nowSeconds: bigint
): Promise<void> {
  const cutoff = nowSeconds - BigInt(attemptTimeoutMinutes * 60)

  await prisma.skillAssessment.updateMany({
    where: {
      userSkillId,
      status: "IN_PROGRESS",
      startedAt: { lt: cutoff },
    },
    data: {
      status: "EXPIRED",
      updatedAt: nowSeconds,
    },
  })
}

export async function getCompletedAttemptCount(userSkillId: bigint): Promise<number> {
  return prisma.skillAssessment.count({
    where: {
      userSkillId,
      status: { in: ["PASSED", "FAILED", "EXPIRED"] },
    },
  })
}

export async function getLatestCompletedAttempt(
  userSkillId: bigint
): Promise<SkillAssessment | null> {
  return prisma.skillAssessment.findFirst({
    where: {
      userSkillId,
      status: { in: ["PASSED", "FAILED"] },
      submittedAt: { not: null },
    },
    orderBy: { submittedAt: "desc" },
  })
}

export function isCooldownActive(
  latestAttempt: SkillAssessment | null,
  cooldownHours: number,
  nowSeconds: bigint
): boolean {
  if (!latestAttempt?.submittedAt) {
    return false
  }

  const cooldownEndsAt =
    latestAttempt.submittedAt + BigInt(cooldownHours * 60 * 60)

  return nowSeconds < cooldownEndsAt
}

export function getCooldownEndsAt(
  latestAttempt: SkillAssessment | null,
  cooldownHours: number
): bigint | null {
  if (!latestAttempt?.submittedAt) {
    return null
  }

  return latestAttempt.submittedAt + BigInt(cooldownHours * 60 * 60)
}

export type AttemptEligibilityState = {
  inProgress: SkillAssessment | null
  completedAttempts: number
  latestAttempt: SkillAssessment | null
  cooldownActive: boolean
  cooldownEndsAt: bigint | null
  maxAttemptsReached: boolean
  alreadyVerified: boolean
  canStart: boolean
}

export async function getAttemptEligibilityState(
  userSkillId: bigint,
  config: SkillAssessmentConfigValues,
  nowSeconds: bigint,
  verifiedLevel: string | null
): Promise<AttemptEligibilityState> {
  await expireStaleInProgressAttempts(
    userSkillId,
    config.attemptTimeoutMinutes,
    nowSeconds
  )

  const inProgress = await prisma.skillAssessment.findFirst({
    where: {
      userSkillId,
      status: "IN_PROGRESS",
    },
    orderBy: { startedAt: "desc" },
  })

  const completedAttempts = await getCompletedAttemptCount(userSkillId)
  const latestAttempt = await getLatestCompletedAttempt(userSkillId)
  const cooldownEndsAt = getCooldownEndsAt(latestAttempt, config.cooldownHours)
  const cooldownActive = isCooldownActive(latestAttempt, config.cooldownHours, nowSeconds)
  const maxAttemptsReached = completedAttempts >= config.maxAttempts
  const alreadyVerified = Boolean(verifiedLevel)
  const canStart =
    !inProgress && !maxAttemptsReached && !alreadyVerified && !cooldownActive

  return {
    inProgress,
    completedAttempts,
    latestAttempt,
    cooldownActive,
    cooldownEndsAt,
    maxAttemptsReached,
    alreadyVerified,
    canStart,
  }
}

export async function validateAttemptEligibility(
  userSkillId: bigint,
  config: SkillAssessmentConfigValues,
  nowSeconds: bigint
): Promise<{ allowed: true } | { allowed: false; error: string; status: number }> {
  const userSkill = await prisma.userSkills.findUnique({
    where: { id: userSkillId },
    select: { verifiedLevel: true },
  })

  const state = await getAttemptEligibilityState(
    userSkillId,
    config,
    nowSeconds,
    userSkill?.verifiedLevel ?? null
  )

  if (state.inProgress) {
    return {
      allowed: false,
      error: "You already have an assessment in progress for this skill",
      status: 409,
    }
  }

  if (state.alreadyVerified) {
    return {
      allowed: false,
      error: "This skill is already verified",
      status: 403,
    }
  }

  if (state.maxAttemptsReached) {
    return {
      allowed: false,
      error: `You have used all ${config.maxAttempts} assessment attempts for this skill`,
      status: 403,
    }
  }

  if (state.cooldownActive) {
    const remaining = state.cooldownEndsAt
      ? formatCooldownRemaining(Number(state.cooldownEndsAt))
      : null

    return {
      allowed: false,
      error: remaining
        ? `Please wait ${remaining} before starting another attempt for this skill`
        : "Please wait before starting another attempt for this skill",
      status: 429,
    }
  }

  return { allowed: true }
}
