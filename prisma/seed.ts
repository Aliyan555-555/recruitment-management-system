import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const GLOBAL_SKILL_CONFIG = "__GLOBAL__"

async function main() {
  const now = BigInt(Math.floor(Date.now() / 1000))

  await prisma.skillAssessmentConfig.upsert({
    where: { skillName: GLOBAL_SKILL_CONFIG },
    update: {
      questionCount: 10,
      minPassPoints: 60,
      maxPoints: 100,
      levelThresholds: {
        beginner: 0,
        intermediate: 40,
        professional: 70,
        expert: 90,
      },
      maxAttempts: 3,
      cooldownHours: 24,
      attemptTimeoutMinutes: 60,
      isActive: true,
      updatedAt: now,
    },
    create: {
      skillName: GLOBAL_SKILL_CONFIG,
      questionCount: 10,
      minPassPoints: 60,
      maxPoints: 100,
      levelThresholds: {
        beginner: 0,
        intermediate: 40,
        professional: 70,
        expert: 90,
      },
      maxAttempts: 3,
      cooldownHours: 24,
      attemptTimeoutMinutes: 60,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error("Seeding failed:", error)
    await prisma.$disconnect()
    process.exit(1)
  })
