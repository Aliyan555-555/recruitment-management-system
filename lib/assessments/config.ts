import { prisma } from "@/lib/prisma"
import { GLOBAL_SKILL_CONFIG_KEY } from "@/lib/assessments/constants"

export class SkillAssessmentConfigError extends Error {
  constructor(
    message = "Skill assessment configuration is not available. Please contact support."
  ) {
    super(message)
    this.name = "SkillAssessmentConfigError"
  }
}

export type LevelThresholds = {
  beginner: number
  intermediate: number
  professional: number
  expert: number
}

export type SkillAssessmentConfigValues = {
  id: bigint
  skillName: string
  questionCount: number
  minPassPoints: number
  maxPoints: number
  levelThresholds: LevelThresholds
  maxAttempts: number
  cooldownHours: number
  cycleResetDays: number
  attemptTimeoutMinutes: number
  isActive: boolean
}

function parseLevelThresholds(value: unknown): LevelThresholds {
  const thresholds = value as Partial<LevelThresholds>
  return {
    beginner: Number(thresholds?.beginner ?? 0),
    intermediate: Number(thresholds?.intermediate ?? 40),
    professional: Number(thresholds?.professional ?? 70),
    expert: Number(thresholds?.expert ?? 90),
  }
}

export async function getSkillAssessmentConfig(
  skillName: string
): Promise<SkillAssessmentConfigValues> {
  const perSkill = await prisma.skillAssessmentConfig.findFirst({
    where: {
      skillName,
      isActive: true,
    },
  })

  const config =
    perSkill ??
    (await prisma.skillAssessmentConfig.findFirst({
      where: {
        skillName: GLOBAL_SKILL_CONFIG_KEY,
        isActive: true,
      },
    }))

  if (!config) {
    throw new SkillAssessmentConfigError()
  }

  return {
    id: config.id,
    skillName: config.skillName,
    questionCount: config.questionCount,
    minPassPoints: config.minPassPoints,
    maxPoints: config.maxPoints,
    levelThresholds: parseLevelThresholds(config.levelThresholds),
    maxAttempts: config.maxAttempts,
    cooldownHours: config.cooldownHours,
    cycleResetDays:
      "cycleResetDays" in config && typeof config.cycleResetDays === "number"
        ? config.cycleResetDays
        : 7,
    attemptTimeoutMinutes: config.attemptTimeoutMinutes,
    isActive: config.isActive,
  }
}
