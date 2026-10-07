import { prisma } from "@/lib/prisma"
import { decryptSecret } from "@/lib/ai/secret-crypto"

export const DEFAULT_AI_ENDPOINT = "https://openrouter.ai/api/v1"
export const DEFAULT_AI_MODEL = "openai/gpt-oss-20b:free"

export interface ResolvedAiConfig {
  token: string
  endpoint: string
  model: string
  /** Optional lighter model used when the primary is overloaded/unavailable. */
  fallbackModel: string
  source: { token: "database" | "env" | "none"; endpoint: "database" | "env" | "default"; model: "database" | "env" | "default" }
}

const CACHE_TTL_MS = 30_000
let cache: { value: ResolvedAiConfig; expires: number } | null = null

export function invalidateAiConfigCache() {
  cache = null
}

/**
 * Validate an admin-supplied endpoint. Returns an error string or null.
 * Requires https (http only for localhost) and rejects link-local / cloud-metadata hosts
 * so the setting cannot be used to make the server probe internal metadata services.
 */
export function validateAiEndpoint(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return "Endpoint must be a valid URL"
  }
  const host = url.hostname.toLowerCase()
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "[::1]"
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) {
    return "Endpoint must use https (http is only allowed for localhost)"
  }
  if (url.username || url.password) return "Endpoint must not contain credentials"
  if (host.startsWith("169.254.") || host === "metadata.google.internal" || host.startsWith("[fe80") || host === "0.0.0.0") {
    return "Endpoint host is not allowed"
  }
  return null
}

/**
 * Resolve the effective AI config: admin-saved (DB) values win, env vars are the fallback.
 * Decrypted token lives only in server memory.
 */
export async function getAiConfig(): Promise<ResolvedAiConfig> {
  if (cache && cache.expires > Date.now()) return cache.value

  let row: Awaited<ReturnType<typeof prisma.aiSettings.findFirst>> = null
  try {
    row = await prisma.aiSettings.findFirst()
  } catch (err) {
    console.error("[AI Config] Failed to read ai_settings, falling back to env:", (err as Error)?.message)
  }

  let dbToken = ""
  if (row?.encryptedToken) {
    try {
      dbToken = decryptSecret(row.encryptedToken).trim()
    } catch {
      console.error("[AI Config] Stored AI token could not be decrypted (encryption key changed?). Re-enter it in Settings.")
    }
  }

  const envToken = (process.env.AI_INFERENCE_TOKEN ?? process.env.GITHUB_TOKEN ?? "").trim()
  const dbEndpoint = row?.endpoint?.trim()
  const envEndpoint = process.env.AI_INFERENCE_ENDPOINT?.trim()
  const dbModel = row?.model?.trim()
  const envModel = process.env.AI_INFERENCE_MODEL?.trim()
  const dbFallback = row?.fallbackModel?.trim()
  const envFallback = process.env.AI_INFERENCE_FALLBACK_MODEL?.trim()

  const value: ResolvedAiConfig = {
    token: dbToken || envToken,
    endpoint: (dbEndpoint || envEndpoint || DEFAULT_AI_ENDPOINT).replace(/\/+$/, ""),
    model: dbModel || envModel || DEFAULT_AI_MODEL,
    fallbackModel: dbFallback || envFallback || "",
    source: {
      token: dbToken ? "database" : envToken ? "env" : "none",
      endpoint: dbEndpoint ? "database" : envEndpoint ? "env" : "default",
      model: dbModel ? "database" : envModel ? "env" : "default",
    },
  }

  cache = { value, expires: Date.now() + CACHE_TTL_MS }
  return value
}

export async function getAiModelName(): Promise<string> {
  return (await getAiConfig()).model
}
