import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import {
  ensureAttemptCurrent,
  parseQuickTestConfigInput,
  upsertJobQuickTest,
} from "@/lib/services/quick-test-service"
import { serializeAdminAttemptRow, serializeQuickTestConfig } from "@/lib/quick-test/serializers"
import { isFinalStatus } from "@/lib/quick-test/rules"

export const runtime = "nodejs"

/** Quick test config, summary stats and every candidate attempt for a job. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    let jobId: bigint
    try {
      jobId = BigInt(params.id)
    } catch {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 })
    }

    const [job, config, rawAttempts] = await Promise.all([
      prisma.job.findUnique({ where: { id: jobId }, select: { id: true, title: true } }),
      prisma.jobQuickTest.findUnique({ where: { jobId } }),
      prisma.quickTestAttempt.findMany({
        where: { jobId },
        orderBy: { startedAt: "desc" },
        include: {
          user: { select: { id: true, firstname: true, lastname: true, email: true, avatar: true } },
        },
      }),
    ])

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Finalise abandoned attempts so admins never see a stale "in progress" row.
    const attempts = await Promise.all(
      rawAttempts.map(async (attempt) => ({ ...(await ensureAttemptCurrent(attempt)), user: attempt.user }))
    )

    const attemptIds = attempts.map((attempt) => attempt.id)
    const [correctCounts, applications] = await Promise.all([
      attemptIds.length
        ? prisma.quickTestAnswer.groupBy({
            by: ["attemptId"],
            where: { attemptId: { in: attemptIds }, isCorrect: true },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      attempts.length
        ? prisma.jobsApplied.findMany({
            where: { jobId, userId: { in: attempts.map((attempt) => attempt.userId) } },
            select: { userId: true },
          })
        : Promise.resolve([]),
    ])

    const correctByAttempt = new Map(correctCounts.map((row) => [row.attemptId.toString(), row._count._all]))
    const appliedUsers = new Set(applications.map((application) => application.userId.toString()))

    const rows = attempts.map((attempt) =>
      serializeAdminAttemptRow(
        {
          ...attempt,
          _correctCount: isFinalStatus(attempt.status)
            ? (correctByAttempt.get(attempt.id.toString()) ?? 0)
            : undefined,
        },
        appliedUsers.has(attempt.userId.toString())
      )
    )

    const completed = attempts.filter((attempt) => isFinalStatus(attempt.status))
    const scores = completed.map((attempt) => attempt.scorePercent ?? 0)

    return NextResponse.json({
      job: { id: job.id.toString(), title: job.title },
      config: config
        ? serializeQuickTestConfig(config)
        : { enabled: false, questionCount: 10, timeLimitMinutes: 15 },
      stats: {
        started: attempts.length,
        completed: completed.length,
        inProgress: attempts.length - completed.length,
        applied: rows.filter((row) => row.applied).length,
        averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
        highestScore: scores.length ? Math.max(...scores) : null,
        lowestScore: scores.length ? Math.min(...scores) : null,
      },
      attempts: rows,
    })
  } catch (error) {
    console.error("[Quick Test] Admin list failed:", error)
    return NextResponse.json({ error: "Failed to load quick test results" }, { status: 500 })
  }
}

/** Updates the quick test settings. Works at any time, including after applications have started. */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    let jobId: bigint
    try {
      jobId = BigInt(params.id)
    } catch {
      return NextResponse.json({ error: "Invalid job id" }, { status: 400 })
    }

    const body = await req.json().catch(() => null)
    const parsed = parseQuickTestConfigInput(body)
    if (!parsed.ok || !parsed.value) {
      return NextResponse.json(
        { error: parsed.ok ? "Quick test settings are required" : parsed.error },
        { status: 400 }
      )
    }

    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true } })
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    await prisma.$transaction((tx) => upsertJobQuickTest(tx, jobId, parsed.value!))

    const config = await prisma.jobQuickTest.findUnique({ where: { jobId } })
    return NextResponse.json({
      success: true,
      config: config
        ? serializeQuickTestConfig(config)
        : { enabled: false, questionCount: 10, timeLimitMinutes: 15 },
    })
  } catch (error) {
    console.error("[Quick Test] Admin update failed:", error)
    return NextResponse.json({ error: "Failed to update quick test settings" }, { status: 500 })
  }
}
