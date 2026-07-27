import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { calculatePipelineMetrics } from "@/lib/pipeline-metrics"
import { buildSkillPercentageMap } from "@/lib/assessments/skill-percentage"

const VERIFIED_LEVEL_ORDER = ["BEGINNER", "INTERMEDIATE", "PROFESSIONAL", "EXPERT"] as const

function meetsMinVerifiedLevel(
  level: string,
  minLevel: string
): boolean {
  const levelIndex = VERIFIED_LEVEL_ORDER.indexOf(level as (typeof VERIFIED_LEVEL_ORDER)[number])
  const minIndex = VERIFIED_LEVEL_ORDER.indexOf(minLevel as (typeof VERIFIED_LEVEL_ORDER)[number])
  if (levelIndex === -1 || minIndex === -1) return false
  return levelIndex >= minIndex
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const jobId = searchParams.get("jobId")
    const verifiedSkill = searchParams.get("verifiedSkill")?.trim().toLowerCase()
    const minVerifiedLevel = searchParams.get("minVerifiedLevel")?.trim().toUpperCase()

    const where: any = {}
    
    if (status) {
      where.overallStatus = status
    }
    
    if (jobId) {
      where.jobId = BigInt(jobId)
    }

    const pipelines = await prisma.candidatePipeline.findMany({
      where,
      include: {
        candidate: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true
          }
        },
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            workflow: {
              select: {
                steps: {
                  select: {
                    id: true
                  }
                }
              }
            }
          }
        },
        application: {
          select: {
            id: true,
            status: true,
            appliedAt: true
          }
        },
        steps: {
          select: {
            status: true,
            stepOrder: true
          },
          orderBy: {
            stepOrder: 'asc'
          }
        }
      },
      orderBy: {
        startedAt: 'desc'
      }
    })

    const candidateIds = [...new Set(pipelines.map((p) => p.candidateId))]
    const verifiedSkillsByCandidate = new Map<
      string,
      Array<{ skillName: string; verifiedLevel: string; skillPercentage: number | null }>
    >()

    if (candidateIds.length > 0) {
      const verifiedSkills = await prisma.userSkills.findMany({
        where: {
          userId: { in: candidateIds },
          verifiedLevel: { not: null },
        },
        select: {
          userId: true,
          skillName: true,
          verifiedLevel: true,
          lastAssessmentId: true,
        },
        orderBy: { skillName: "asc" },
      })

      const lastAssessmentIds = verifiedSkills
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

      for (const skill of verifiedSkills) {
        if (!skill.verifiedLevel) continue
        const key = skill.userId.toString()
        const existing = verifiedSkillsByCandidate.get(key) ?? []
        existing.push({
          skillName: skill.skillName,
          verifiedLevel: skill.verifiedLevel,
          skillPercentage: skill.lastAssessmentId
            ? percentageByAssessmentId.get(skill.lastAssessmentId.toString()) ?? null
            : null,
        })
        verifiedSkillsByCandidate.set(key, existing)
      }
    }

    const mappedPipelines = pipelines.map(p => {
        const pipelineSteps = p.steps ?? []
        const totalWorkflowSteps = p.job.workflow?.steps.length ?? 0
        const metrics = calculatePipelineMetrics({
          totalWorkflowSteps,
          pipelineSteps,
          currentStepOrder: p.currentStepOrder,
          overallStatus: p.overallStatus,
        })

        return {
          id: p.id.toString(),
          candidateId: p.candidateId.toString(),
          jobId: p.jobId.toString(),
          applicationId: p.applicationId.toString(),
          candidateName: `${p.candidate.firstname} ${p.candidate.lastname}`,
          candidateEmail: p.candidate.email,
          jobTitle: p.job.title,
          jobCompany: p.job.company,
          status: p.overallStatus,
          currentStep: metrics.currentStep,
          totalSteps: metrics.totalSteps,
          completedSteps: metrics.completedSteps,
          progressPercent: metrics.progressPercent,
          startedAt: p.startedAt.toString(),
          appliedAt: p.application.appliedAt.toString(),
          applicationStatus: p.application.status,
          verifiedSkills: verifiedSkillsByCandidate.get(p.candidateId.toString()) ?? [],
        }
      })

    let filteredPipelines = mappedPipelines

    const hasMinLevelFilter =
      !!minVerifiedLevel &&
      VERIFIED_LEVEL_ORDER.includes(minVerifiedLevel as (typeof VERIFIED_LEVEL_ORDER)[number])

    if (verifiedSkill && hasMinLevelFilter) {
      filteredPipelines = filteredPipelines.filter((pipeline) =>
        pipeline.verifiedSkills.some(
          (skill) =>
            skill.skillName.toLowerCase().includes(verifiedSkill) &&
            meetsMinVerifiedLevel(skill.verifiedLevel, minVerifiedLevel)
        )
      )
    } else if (verifiedSkill) {
      filteredPipelines = filteredPipelines.filter((pipeline) =>
        pipeline.verifiedSkills.some((skill) =>
          skill.skillName.toLowerCase().includes(verifiedSkill)
        )
      )
    } else if (hasMinLevelFilter) {
      filteredPipelines = filteredPipelines.filter((pipeline) =>
        pipeline.verifiedSkills.some((skill) =>
          meetsMinVerifiedLevel(skill.verifiedLevel, minVerifiedLevel)
        )
      )
    }

    return NextResponse.json({
      pipelines: filteredPipelines,
    })
  } catch (error: any) {
    console.error("Error fetching pipelines:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch pipelines" },
      { status: 500 }
    )
  }
}

