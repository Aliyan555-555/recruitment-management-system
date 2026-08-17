import { prisma } from "@/lib/prisma"
import { getSkillAssessmentConfig } from "@/lib/assessments/config"
import {
  getAttemptEligibilityState,
  isSkillImproved,
} from "@/lib/assessments/attempt-rules"
import { buildSkillPercentageMap } from "@/lib/assessments/skill-percentage"

export type MandatorySkill = {
  userSkillId: string
  skillName: string
  inProgressAssessmentId: string | null
  completedAttempts: number
  attemptsUsed: number
  maxAttempts: number
  verifiedLevel: string | null
  skillPercentage: number | null
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

  const lastAssessmentIds = skills
    .map((skill) => skill.lastAssessmentId)
    .filter((id): id is bigint => id != null)

  const lastAssessments =
    lastAssessmentIds.length > 0
      ? await prisma.skillAssessment.findMany({
          where: { id: { in: lastAssessmentIds } },
          select: {
            id: true,
            scoredPoints: true,
            maxPoints: true,
          },
        })
      : []

  const percentageByAssessmentId = buildSkillPercentageMap(lastAssessments)

  if (skills.length === 0) {
    return {
      required: true,
      reason: "no_skills",
      pendingSkills: [],
      completedCount: 0,
      totalSkills: 0,
    }
  }

  let completedCount = 0

  // Filter out skills that are already verified/improved without fetching eligibility state
  const unverifiedSkills = skills.filter((skill) => {
    if (isSkillImproved(skill.verifiedLevel)) {
      completedCount += 1
      return false
    }
    return true
  })

  // Evaluate remaining skills in parallel
  const evalResults = await Promise.all(
    unverifiedSkills.map(async (skill) => {
      const config = await getSkillAssessmentConfig(skill.skillName)

      const state = await getAttemptEligibilityState(
        skill.id,
        config,
        now,
        skill.verifiedLevel
      )

      if (state.completedAttempts >= 1) {
        return { isCompleted: true, pendingSkill: null }
      }

      return {
        isCompleted: false,
        pendingSkill: {
          userSkillId: skill.id.toString(),
          skillName: skill.skillName,
          inProgressAssessmentId: state.inProgress?.id.toString() ?? null,
          completedAttempts: state.completedAttempts,
          attemptsUsed: state.attemptsInCurrentCycle,
          maxAttempts: config.maxAttempts,
          verifiedLevel: skill.verifiedLevel,
          skillPercentage: skill.lastAssessmentId
            ? percentageByAssessmentId.get(skill.lastAssessmentId.toString()) ?? null
            : null,
          canStart: state.canStart,
          cycleLocked: state.cycleLocked,
          cycleUnlocksAt: state.cycleUnlocksAt?.toString() ?? null,
        } as MandatorySkill,
      }
    })
  )

  const pendingSkills: MandatorySkill[] = []

  for (const res of evalResults) {
    if (res.isCompleted) {
      completedCount += 1
    } else if (res.pendingSkill) {
      pendingSkills.push(res.pendingSkill)
    }
  }

  return {
    required: pendingSkills.length > 0,
    reason: pendingSkills.length > 0 ? "pending_assessments" : "complete",
    pendingSkills,
    completedCount,
    totalSkills: skills.length,
  }
}
