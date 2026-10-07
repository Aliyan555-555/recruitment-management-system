import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/rbac"
import { getCurrentTimestamp } from "@/lib/utils"
import { encryptSecret, secretHint } from "@/lib/ai/secret-crypto"
import {
  getAiConfig,
  invalidateAiConfigCache,
  validateAiEndpoint,
  DEFAULT_AI_ENDPOINT,
  DEFAULT_AI_MODEL,
} from "@/lib/ai/ai-config"

const NO_STORE = { "Cache-Control": "no-store" }

/** Safe view of the config: the token itself is never included. */
async function buildView() {
  const row = await prisma.aiSettings.findFirst()
  const effective = await getAiConfig()
  return {
    endpoint: row?.endpoint ?? "",
    model: row?.model ?? "",
    fallbackModel: row?.fallbackModel ?? "",
    hasToken: Boolean(row?.encryptedToken),
    tokenHint: row?.tokenHint ?? null,
    updatedAt: row?.updatedAt?.toString() ?? null,
    effective: {
      endpoint: effective.endpoint,
      model: effective.model,
      fallbackModel: effective.fallbackModel,
      hasToken: Boolean(effective.token),
      source: effective.source,
    },
    defaults: { endpoint: DEFAULT_AI_ENDPOINT, model: DEFAULT_AI_MODEL },
  }
}

// GET /api/admin/ai-settings
export async function GET() {
  try {
    const user = await requireAdmin()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json(await buildView(), { headers: NO_STORE })
  } catch (error) {
    console.error("Error fetching AI settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/admin/ai-settings  { endpoint?, model?, fallbackModel?, token?, clearToken? }
// Omitted/empty token keeps the stored one. Empty endpoint/model resets to env/default.
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim().replace(/\/+$/, "") : ""
    const model = typeof body.model === "string" ? body.model.trim() : ""
    const fallbackModel = typeof body.fallbackModel === "string" ? body.fallbackModel.trim() : ""
    const token = typeof body.token === "string" ? body.token.trim() : ""
    const clearToken = body.clearToken === true

    if (endpoint) {
      if (endpoint.length > 500) return NextResponse.json({ error: "Endpoint is too long" }, { status: 400 })
      const endpointError = validateAiEndpoint(endpoint)
      if (endpointError) return NextResponse.json({ error: endpointError }, { status: 400 })
    }
    if (model.length > 200) return NextResponse.json({ error: "Model name is too long" }, { status: 400 })
    if (fallbackModel.length > 200) return NextResponse.json({ error: "Fallback model name is too long" }, { status: 400 })
    if (token && (token.length < 8 || token.length > 2000 || /\s/.test(token))) {
      return NextResponse.json({ error: "Token format looks invalid" }, { status: 400 })
    }

    let tokenFields: { encryptedToken?: string | null; tokenHint?: string | null } = {}
    if (token) {
      try {
        tokenFields = { encryptedToken: encryptSecret(token), tokenHint: secretHint(token) || null }
      } catch (err) {
        console.error("AI settings encryption failed:", (err as Error).message)
        return NextResponse.json(
          { error: "Server encryption key is not configured (set AI_SETTINGS_ENCRYPTION_KEY)." },
          { status: 500 }
        )
      }
    } else if (clearToken) {
      tokenFields = { encryptedToken: null, tokenHint: null }
    }

    const now = getCurrentTimestamp()
    const data = {
      endpoint: endpoint || null,
      model: model || null,
      fallbackModel: fallbackModel || null,
      ...tokenFields,
      updatedBy: BigInt(user.id),
      updatedAt: now,
    }

    const existing = await prisma.aiSettings.findFirst()
    if (existing) {
      await prisma.aiSettings.update({ where: { id: existing.id }, data })
    } else {
      await prisma.aiSettings.create({ data })
    }

    invalidateAiConfigCache()
    console.info(
      `[AI Settings] Updated by user ${user.id} (endpoint=${endpoint || "default"}, model=${model || "default"}, fallback=${fallbackModel || "none"}, tokenChanged=${Boolean(token) || clearToken})`
    )

    return NextResponse.json({ success: true, settings: await buildView() }, { headers: NO_STORE })
  } catch (error) {
    console.error("Error updating AI settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
