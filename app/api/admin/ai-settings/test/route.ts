import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { checkRateLimit } from "@/lib/rate-limit"
import { callAiChat } from "@/lib/ai/ai-client"
import { getAiConfig, invalidateAiConfigCache } from "@/lib/ai/ai-config"

// POST /api/admin/ai-settings/test — send a tiny prompt using the saved configuration
export async function POST() {
  try {
    const user = await requireAdmin()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const limit = checkRateLimit(`ai-settings-test:${user.id}`, 10, 10 * 60 * 1000)
    if (limit.limited) {
      return NextResponse.json({ error: "Too many test requests. Try again shortly." }, { status: 429 })
    }

    invalidateAiConfigCache()
    const config = await getAiConfig()
    if (!config.token) {
      return NextResponse.json({ ok: false, error: "No AI token configured." }, { status: 200 })
    }

    const started = Date.now()
    try {
      await callAiChat({
        systemPrompt: "You are a connectivity check. Reply with the single word: ok",
        userPrompt: "ping",
      })
      return NextResponse.json({ ok: true, model: config.model, latencyMs: Date.now() - started })
    } catch (err) {
      // Provider errors may echo request details; make sure the secret never reaches the client.
      const message = String((err as Error)?.message ?? "Request failed").split(config.token).join("[redacted]")
      return NextResponse.json({ ok: false, error: message.slice(0, 400) })
    }
  } catch (error) {
    console.error("Error testing AI settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
