import { prisma } from "@/lib/prisma"
import type { SkillAssessmentConfigValues } from "@/lib/assessments/config"
import type { SkillAssessment, SkillAssessmentStatus } from "@prisma/client"
import { formatCooldownRemaining } from "@/lib/assessments/level-display"

const TERMINAL_STATUSES: SkillAssessmentStatus[] = ["PASSED", "FAILED", "EXPIRED"]

export function isTerminalStatus(status: SkillAssessmentStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

export function isSkillImproved(level: string | null | undefined): boolean {
  return (
    level === "INTERMEDIATE" ||
    level === "PROFESSIONAL" ||
    level === "EXPERT"
  )
}

export function getAttemptsInCurrentCycle(
  completedAttempts: number,
  maxAttempts: number,
  cycleLocked: boolean
): number {
  if (completedAttempts === 0) {
    return 0
  }

  const remainder = completedAttempts % maxAttempts
  if (remainder === 0) {
    return cycleLocked ? maxAttempts : 0
  }

  return remainder
}

export function getCycleUnlocksAt(
  cycleEndTime: bigint,
  cycleResetDays: number
): bigint {
  return cycleEndTime + BigInt(cycleResetDays * 24 * 60 * 60)
}

export async function getCycleEndTime(
  userSkillId: bigint,
  completedAttempts: number,
  maxAttempts: number
): Promise<bigint | null> {
  if (completedAttempts === 0 || completedAttempts % maxAttempts !== 0) {
    return null
  }

  const attempts = await prisma.skillAssessment.findMany({
    where: {
      userSkillId,
      status: { in: TERMINAL_STATUSES },
    },
    orderBy: [{ submittedAt: "asc" }, { updatedAt: "asc" }, { id: "asc" }],
    take: completedAttempts,
    select: {
      submittedAt: true,
      updatedAt: true,
    },
  })

  if (attempts.length < completedAttempts) {
    return null
  }

  const cycleEndAttempt = attempts[completedAttempts - 1]
  return cycleEndAttempt.submittedAt ?? cycleEndAttempt.updatedAt ?? null
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
      status: { in: TERMINAL_STATUSES },
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
  attemptsInCurrentCycle: number
  latestAttempt: SkillAssessment | null
  cooldownActive: boolean
  cooldownEndsAt: bigint | null
  cycleLocked: boolean
  cycleUnlocksAt: bigint | null
  skillImproved: boolean
  canStart: boolean
  /** True when the current 3-attempt cycle is exhausted and waiting for weekly reset */
  maxAttemptsReached: boolean
  /** @deprecated Use skillImproved */
  alreadyVerified: boolean
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
  const cooldownActive = isCooldownActive(
    latestAttempt,
    config.cooldownHours,
    nowSeconds
  )
  const skillImproved = isSkillImproved(verifiedLevel)

  let cycleLocked = false
  let cycleUnlocksAt: bigint | null = null

  if (
    !skillImproved &&
    completedAttempts > 0 &&
    completedAttempts % config.maxAttempts === 0
  ) {
    const cycleEndTime = await getCycleEndTime(
      userSkillId,
      completedAttempts,
      config.maxAttempts
    )

    if (cycleEndTime) {
      const unlocksAt = getCycleUnlocksAt(cycleEndTime, config.cycleResetDays)
      if (nowSeconds < unlocksAt) {
        cycleLocked = true
        cycleUnlocksAt = unlocksAt
      }
    }
  }

  const attemptsInCurrentCycle = getAttemptsInCurrentCycle(
    completedAttempts,
    config.maxAttempts,
    cycleLocked
  )

  const attemptsRemainingInCycle =
    config.maxAttempts - attemptsInCurrentCycle

  const canStart =
    !inProgress &&
    !skillImproved &&
    !cycleLocked &&
    attemptsRemainingInCycle > 0 &&
    !cooldownActive

  return {
    inProgress,
    completedAttempts,
    attemptsInCurrentCycle,
    latestAttempt,
    cooldownActive,
    cooldownEndsAt,
    cycleLocked,
    cycleUnlocksAt,
    skillImproved,
    canStart,
    maxAttemptsReached: cycleLocked,
    alreadyVerified: skillImproved,
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

  if (state.skillImproved) {
    return {
      allowed: false,
      error: "This skill is already verified above Beginner",
      status: 403,
    }
  }

  if (state.cycleLocked) {
    const remaining = state.cycleUnlocksAt
      ? formatCooldownRemaining(Number(state.cycleUnlocksAt))
      : null

    return {
      allowed: false,
      error: remaining
        ? `You have used all ${config.maxAttempts} attempts. Learn and try again in ${remaining}`
        : `You have used all ${config.maxAttempts} attempts. Learn and try again after the cycle reset period`,
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

export function canReattemptAssessment(
  passed: boolean,
  verifiedLevel: string | null,
  state: AttemptEligibilityState
): boolean {
  if (passed && isSkillImproved(verifiedLevel)) {
    return false
  }

  return !isSkillImproved(verifiedLevel) && state.canStart
}
