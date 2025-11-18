import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { ensureJobStatusCurrent } from "@/lib/middleware/job-status-check"

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
    const updated = await ensureJobStatusCurrent(jobId)

    return NextResponse.json({
      success: true,
      updated,
      message: updated ? "Job status updated" : "Job status is already current"
    })
  } catch (error: any) {
    console.error("Error checking job status:", error)
    return NextResponse.json(
      { error: error.message || "Failed to check job status" },
      { status: 500 }
    )
  }
}

