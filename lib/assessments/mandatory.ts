import { prisma } from "@/lib/prisma"
import { getSkillAssessmentConfig } from "@/lib/assessments/config"
import {
  getAttemptEligibilityState,
  isSkillImproved,
} from "@/lib/assessments/attempt-rules"

export type MandatorySkill = {
  userSkillId: string
  skillName: string
  inProgressAssessmentId: string | null
  completedAttempts: number
  attemptsUsed: number
  maxAttempts: number
  verifiedLevel: string | null
  canStart: boolean
  cycleLocked: boolean
  cycleUnlocksAt: string | null
}

export type MandatoryAssessmentStatus = {
  required: boolean
  reason: "no_skills" | "pending_assessments" | "complete"
  pendingSkills: MandatorySkill[]
  completedCount: number
  totalSkills: number
}

function isSkillAssessmentFulfilled(
  verifiedLevel: string | null,
  completedAttempts: number
): boolean {
  return isSkillImproved(verifiedLevel) || completedAttempts >= 1
}

export async function getMandatoryAssessmentStatus(
  userId: bigint
): Promise<MandatoryAssessmentStatus> {
  const now = BigInt(Math.floor(Date.now() / 1000))

  const skills = await prisma.userSkills.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  })

  if (skills.length === 0) {
    return {
      required: true,
      reason: "no_skills",
      pendingSkills: [],
      completedCount: 0,
      totalSkills: 0,
    }
  }

  const pendingSkills: MandatorySkill[] = []
  let completedCount = 0

  for (const skill of skills) {
    const config = await getSkillAssessmentConfig(skill.skillName)

    const state = await getAttemptEligibilityState(
      skill.id,
      config,
      now,
      skill.verifiedLevel
    )

    if (isSkillAssessmentFulfilled(skill.verifiedLevel, state.completedAttempts)) {
      completedCount += 1
      continue
    }

    pendingSkills.push({
      userSkillId: skill.id.toString(),
      skillName: skill.skillName,
      inProgressAssessmentId: state.inProgress?.id.toString() ?? null,
      completedAttempts: state.completedAttempts,
      attemptsUsed: state.attemptsInCurrentCycle,
      maxAttempts: config.maxAttempts,
      verifiedLevel: skill.verifiedLevel,
      canStart: state.canStart,
      cycleLocked: state.cycleLocked,
      cycleUnlocksAt: state.cycleUnlocksAt?.toString() ?? null,
    })
  }

  return {
    required: pendingSkills.length > 0,
    reason:
      pendingSkills.length > 0 ? "pending_assessments" : "complete",
    pendingSkills,
    completedCount,
    totalSkills: skills.length,
  }
}
