import { NextRequest, NextResponse } from "next/server"
import { runJobStatusCheck } from "@/lib/workers/job-status-worker"

/**
 * Cron endpoint for checking and updating job statuses
 * Should be called by external cron service or Vercel Cron
 * Protected by secret token in headers
 */
export async function GET(req: NextRequest) {
  try {
    // Check for secret token in headers (optional security)
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const result = await runJobStatusCheck()

    return NextResponse.json({
      success: result.success,
      updated: result.updated,
      errors: result.errors,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error("Error in cron job status check:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Failed to run job status check",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

