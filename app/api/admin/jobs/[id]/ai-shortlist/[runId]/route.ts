import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { AI_SHORTLIST_STALE_RUN_SECONDS } from "@/lib/ai-shortlist/config"
import {
  serializeShortlistResult,
  serializeShortlistRun,
} from "@/lib/ai-shortlist/serializers"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const jobId = BigInt(params.id)
    const runId = BigInt(params.runId)

    const run = await prisma.aiShortlistRun.findUnique({
      where: { id: runId },
      include: {
        triggeredByUser: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    })

    if (!run || run.jobId !== jobId) {
      return NextResponse.json(
        { error: "Shortlisting run not found for this job" },
        { status: 404 }
      )
    }

    // Derived statistics via groupBy
    const grouped = await prisma.aiCandidateShortlistResult.groupBy({
      by: ["status", "recommendation"],
      where: { runId },
      _count: true,
    })

    let completedCount = 0
    let failedCount = 0
    let shortlistCount = 0
    let maybeCount = 0
    let rejectCount = 0

    for (const g of grouped) {
      if (g.status === "COMPLETED") {
        completedCount += g._count
      } else if (g.status === "FAILED") {
        failedCount += g._count
      }

      if (g.recommendation === "SHORTLIST") shortlistCount += g._count
      if (g.recommendation === "MAYBE") maybeCount += g._count
      if (g.recommendation === "REJECT") rejectCount += g._count
    }

    const nowSec = Math.floor(Date.now() / 1000)
    const isStale =
      run.status === "RUNNING" &&
      nowSec - Number(run.startedAt) >= AI_SHORTLIST_STALE_RUN_SECONDS

    const results = await prisma.aiCandidateShortlistResult.findMany({
      where: { runId },
      include: {
        candidate: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            avatar: true,
          },
        },
      },
    })

    // Sort results descending by overallScore, nulls last
    const sortedResults = results.sort((a, b) => {
      if (a.overallScore === null && b.overallScore === null) return 0
      if (a.overallScore === null) return 1
      if (b.overallScore === null) return -1
      return b.overallScore - a.overallScore
    })

    return NextResponse.json({
      run: {
        ...serializeShortlistRun(run),
        completedCount,
        failedCount,
        shortlistCount,
        maybeCount,
        rejectCount,
        isStale,
      },
      results: sortedResults.map(serializeShortlistResult),
    })
  } catch (error: any) {
    console.error("Error fetching AI shortlisting run detail:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch shortlisting run details" },
      { status: 500 }
    )
  }
}
