import { NextRequest, NextResponse } from "next/server"
import { runInterviewReminders } from "@/lib/scheduling/reminders"

/**
 * Interview reminders (24h, 1h) and scorecard nudges. Call every ~15 minutes from an external scheduler.
 * Protected by CRON_SECRET (Authorization: Bearer <secret>) when that variable is set.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runInterviewReminders()
    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error("Interview reminder run failed:", error)
    return NextResponse.json({ success: false, error: "Reminder run failed" }, { status: 500 })
  }
}
