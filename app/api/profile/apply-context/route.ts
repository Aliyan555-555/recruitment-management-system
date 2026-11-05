import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

/**
 * Context for the pre-apply profile review: when the profile last changed and whether the candidate
 * was rejected before. Lets the review page warn "nothing changed since your last rejection".
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = BigInt(session.user.id)

    let jobId: bigint | null = null
    const rawJobId = req.nextUrl.searchParams.get("jobId")
    if (rawJobId) {
      try {
        jobId = BigInt(rawJobId)
      } catch {
        return NextResponse.json({ error: "Invalid job id" }, { status: 400 })
      }
    }

    const [user, job, lastRejected] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          updatedAt: true,
          profileDetails: { select: { updatedAt: true } },
          jobPreference: { select: { updatedAt: true } },
          educations: { select: { updatedAt: true } },
          experiences: { select: { updatedAt: true } },
          skills: { select: { updatedAt: true } },
        },
      }),
      jobId ? prisma.job.findUnique({ where: { id: jobId }, select: { title: true, company: true } }) : null,
      prisma.jobsApplied.findFirst({
        where: { userId, status: "REMOVED", pipeline: { lockState: "LOCKED_REJECTED" } },
        orderBy: { statusUpdatedAt: "desc" },
        select: {
          statusUpdatedAt: true,
          job: { select: { title: true, company: true } },
          pipeline: { select: { completedAt: true } },
        },
      }),
    ])

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const stamps = [
      user.updatedAt,
      user.profileDetails?.updatedAt,
      user.jobPreference?.updatedAt,
      ...user.educations.map((item) => item.updatedAt),
      ...user.experiences.map((item) => item.updatedAt),
      ...user.skills.map((item) => item.updatedAt),
    ].filter((value): value is bigint => value != null)
    const profileUpdatedAt = stamps.reduce((max, value) => (value > max ? value : max), BigInt(0))

    const rejectedAt = lastRejected ? (lastRejected.pipeline?.completedAt ?? lastRejected.statusUpdatedAt) : null

    return NextResponse.json({
      job: job ? { title: job.title, company: job.company } : null,
      profileUpdatedAt: profileUpdatedAt.toString(),
      lastRejection:
        lastRejected && rejectedAt
          ? {
              jobTitle: lastRejected.job.title,
              company: lastRejected.job.company,
              rejectedAt: rejectedAt.toString(),
            }
          : null,
      profileChangedSinceRejection: rejectedAt ? profileUpdatedAt > rejectedAt : null,
    })
  } catch (error) {
    console.error("[Profile] apply-context failed:", error)
    return NextResponse.json({ error: "Failed to load application context" }, { status: 500 })
  }
}
