import { NextResponse } from "next/server"
import { requireCandidate } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { getSkillAssessmentConfig } from "@/lib/assessments/config"
import { getAttemptEligibilityState } from "@/lib/assessments/attempt-rules"
import {
  assessmentConfigUnavailableResponse,
  isAssessmentConfigError,
} from "@/lib/assessments/api-errors"

export async function GET() {
  try {
    const user = await requireCandidate()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Candidate access required" },
        { status: 401 }
      )
    }

    const userId = BigInt(user.id)
    const now = BigInt(Math.floor(Date.now() / 1000))

    const skills = await prisma.userSkills.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })

    const statuses = await Promise.all(
      skills.map(async (skill) => {
        const config = await getSkillAssessmentConfig(skill.skillName)
        const state = await getAttemptEligibilityState(
          skill.id,
          config,
          now,
          skill.verifiedLevel
        )

        return {
          userSkillId: skill.id.toString(),
          skillName: skill.skillName,
          verifiedLevel: skill.verifiedLevel,
          verifiedAt: skill.verifiedAt?.toString() ?? null,
          inProgressAssessmentId: state.inProgress?.id.toString() ?? null,
          canStart: state.canStart,
          skillImproved: state.skillImproved,
          cycleLocked: state.cycleLocked,
          maxAttemptsReached: state.cycleLocked,
          attemptsUsed: state.attemptsInCurrentCycle,
          maxAttempts: config.maxAttempts,
          cooldownEndsAt: state.cooldownActive
            ? state.cooldownEndsAt?.toString() ?? null
            : null,
          cycleUnlocksAt: state.cycleLocked
            ? state.cycleUnlocksAt?.toString() ?? null
            : null,
          lastAssessmentId: skill.lastAssessmentId?.toString() ?? null,
        }
      })
    )

    return NextResponse.json({ skills: statuses })
  } catch (error) {
    if (isAssessmentConfigError(error)) {
      return assessmentConfigUnavailableResponse()
    }

    console.error("Get skill assessment status error:", error)
    return NextResponse.json(
      { error: "Failed to fetch skill assessment status" },
      { status: 500 }
    )
  }
}
