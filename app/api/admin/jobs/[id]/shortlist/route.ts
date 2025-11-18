import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { shortlistCandidates } from "@/lib/services/bulk-hiring-service"
import { ensureJobStatusCurrent } from "@/lib/middleware/job-status-check"

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
    await ensureJobStatusCurrent(jobId)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") // "applied" | "shortlisted" | "rejected" | null (all)

    const where: any = {
      jobId,
      status: status === "applied" ? "APPLIED" :
              status === "shortlisted" ? "SHORTLISTED" :
              status === "rejected" ? "REMOVED" :
              undefined
    }

    // If no status filter, show all non-removed applications
    if (!status) {
      where.status = {
        in: ["APPLIED", "SHORTLISTED", "BATCH_ASSIGNED"]
      }
    }

    const applications = await prisma.jobsApplied.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
            phone1: true,
            city: true,
            country: true
          }
        },
        cv: {
          select: {
            id: true,
            filename: true,
            filepath: true
          }
        }
      },
      orderBy: {
        appliedAt: "desc"
      }
    })

    return NextResponse.json({
      applications: applications.map(app => ({
        id: app.id.toString(),
        candidateId: app.userId.toString(),
        candidate: {
          name: `${app.user.firstname} ${app.user.lastname}`,
          email: app.user.email,
          phone: app.user.phone1,
          location: `${app.user.city || ''}, ${app.user.country || ''}`.trim()
        },
        status: app.status,
        appliedAt: app.appliedAt.toString(),
        cv: {
          id: app.cv.id.toString(),
          filename: app.cv.filename,
          filepath: app.cv.filepath
        }
      }))
    })
  } catch (error: any) {
    console.error("Error fetching shortlist candidates:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch candidates" },
      { status: 500 }
    )
  }
}

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
    await ensureJobStatusCurrent(jobId)

    const body = await req.json()
    const { candidateIds, action } = body

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json(
        { error: "candidateIds array is required" },
        { status: 400 }
      )
    }

    if (action !== "select" && action !== "reject") {
      return NextResponse.json(
        { error: "action must be 'select' or 'reject'" },
        { status: 400 }
      )
    }

    const candidateIdsBig = candidateIds.map((id: string) => BigInt(id))

    await shortlistCandidates(jobId, candidateIdsBig, action)

    return NextResponse.json({
      success: true,
      message: `Candidates ${action === "select" ? "shortlisted" : "rejected"} successfully`
    })
  } catch (error: any) {
    console.error("Error shortlisting candidates:", error)
    return NextResponse.json(
      { error: error.message || "Failed to shortlist candidates" },
      { status: 500 }
    )
  }
}

