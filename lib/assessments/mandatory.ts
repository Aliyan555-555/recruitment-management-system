import { prisma } from "@/lib/prisma"
import { getSkillAssessmentConfig } from "@/lib/assessments/config"
import {
  expireStaleInProgressAttempts,
  getCompletedAttemptCount,
} from "@/lib/assessments/attempt-rules"

export type MandatorySkill = {
  userSkillId: string
  skillName: string
  inProgressAssessmentId: string | null
  completedAttempts: number
  maxAttempts: number
  verifiedLevel: string | null
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
  return Boolean(verifiedLevel) || completedAttempts >= 1
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

    await expireStaleInProgressAttempts(
      skill.id,
      config.attemptTimeoutMinutes,
      now
    )

    const completedAttempts = await getCompletedAttemptCount(skill.id)

    const inProgress = await prisma.skillAssessment.findFirst({
      where: {
        userSkillId: skill.id,
        status: "IN_PROGRESS",
      },
      orderBy: { startedAt: "desc" },
      select: { id: true },
    })

    if (isSkillAssessmentFulfilled(skill.verifiedLevel, completedAttempts)) {
      completedCount += 1
      continue
    }

    pendingSkills.push({
      userSkillId: skill.id.toString(),
      skillName: skill.skillName,
      inProgressAssessmentId: inProgress?.id.toString() ?? null,
      completedAttempts,
      maxAttempts: config.maxAttempts,
      verifiedLevel: skill.verifiedLevel,
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
