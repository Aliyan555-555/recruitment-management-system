import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { startShortlistRun } from "@/lib/services/ai-shortlist-service"
import { serializeShortlistRun } from "@/lib/ai-shortlist/serializers"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
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
    const adminUserId = BigInt(user.id)

    const result = await startShortlistRun(jobId, adminUserId)

    if (!result.success) {
      let status = 400
      if (result.code === "JOB_NOT_FOUND") status = 404
      if (result.code === "RUN_IN_PROGRESS") status = 409
      if (result.code === "RATE_LIMITED") status = 429

      return NextResponse.json({ error: result.error, code: result.code }, { status })
    }

    return NextResponse.json(
      {
        success: true,
        run: serializeShortlistRun(result.run),
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error starting AI shortlisting run:", error)
    return NextResponse.json(
      { error: error.message || "Failed to start AI shortlisting run" },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    const runs = await prisma.aiShortlistRun.findMany({
      where: { jobId },
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
      orderBy: { startedAt: "desc" },
    })

    return NextResponse.json({
      runs: runs.map(serializeShortlistRun),
    })
  } catch (error: any) {
    console.error("Error fetching AI shortlisting runs:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch AI shortlisting runs" },
      { status: 500 }
    )
  }
}
