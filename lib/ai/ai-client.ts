/**
 * Universal AI Completion Client
 * Supports Google Gemini (native generateContent and OpenAI-compatible),
 * OpenRouter, GitHub Models, Azure AI Inference, and standard OpenAI.
 * Provider credentials come from getAiConfig() (admin settings, env fallback).
 *
 * Built for free-tier quotas: every request goes through a per-process rate limiter,
 * 429s wait as long as the provider asks, and an exhausted daily quota fails fast
 * (AiQuotaExhaustedError) instead of being retried.
 */

import { getAiConfig } from "@/lib/ai/ai-config"
import { parseGeminiRateLimit } from "@/lib/ai/gemini-rate-limit"

export interface AiChatOptions {
  systemPrompt: string
  userPrompt: string
  jsonMode?: boolean
  /** Gemini response schema (OpenAPI subset). Forces valid JSON so no parse-retry requests are needed. */
  responseSchema?: Record<string, unknown>
  maxOutputTokens?: number
  /** Called once per HTTP request actually sent (retries included); used for quota accounting. */
  onRequest?: () => void
}

export class AiClientError extends Error {
  statusCode?: number
  retryable?: boolean
  /** Provider-requested wait before retrying (429 RetryInfo / Retry-After). */
  retryAfterMs?: number

  constructor(message: string, statusCode?: number, retryable = false, retryAfterMs?: number) {
    super(message)
    this.name = "AiClientError"
    this.statusCode = statusCode
    this.retryable = retryable
    this.retryAfterMs = retryAfterMs
  }
}

/** The model's daily (or otherwise long-window) quota is used up; retrying today is pointless. */
export class AiQuotaExhaustedError extends AiClientError {
  constructor(message: string) {
    super(message, 429, false)
    this.name = "AiQuotaExhaustedError"
  }
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

/** Requests per minute across the whole process. Gemini free tier allows ~10 RPM on Flash models. */
export function aiRequestsPerMinute(): number {
  const n = Number(process.env.AI_REQUESTS_PER_MINUTE)
  return Number.isFinite(n) && n > 0 ? n : 8
}

const MAX_WAIT_MS = 65_000
const sentAt: number[] = []
let gate: Promise<void> = Promise.resolve()

/** Sliding one-minute window; callers queue in order so bursts never exceed the RPM limit. */
function acquireRequestSlot(): Promise<void> {
  const run = async () => {
    const limit = aiRequestsPerMinute()
    for (;;) {
      const now = Date.now()
      while (sentAt.length > 0 && now - sentAt[0] >= 60_000) sentAt.shift()
      if (sentAt.length < limit) {
        sentAt.push(now)
        return
      }
      await sleep(60_000 - (now - sentAt[0]) + 50)
    }
  }
  const next = gate.then(run)
  gate = next.catch(() => undefined)
  return next
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function parseRetryAfterHeader(value: string | null): number | undefined {
  if (!value) return undefined
  const secs = Number(value)
  return Number.isFinite(secs) ? secs * 1000 : undefined
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

function isGeminiEndpointOrKey(endpoint: string, token: string): boolean {
  return (
    endpoint.includes("generativelanguage.googleapis.com") ||
    token.startsWith("AQ.") ||
    token.startsWith("AIza")
  )
}

function cleanModelName(model: string): string {
  return model.includes("/") ? model.split("/").pop()! : model
}

/**
 * Call Google Gemini native generateContent API
 */
async function callGeminiNative(model: string, token: string, options: AiChatOptions): Promise<string> {
  const m = cleanModelName(model)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(token)}`

  const buildBody = (extras: boolean) => ({
    // A separate system instruction keeps the shared prefix stable, so Gemini's implicit caching can apply.
    systemInstruction: { parts: [{ text: options.systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: options.userPrompt }] }],
    generationConfig: {
      temperature: 0.2,
      ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
      ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
      ...(extras && options.jsonMode && options.responseSchema ? { responseSchema: options.responseSchema } : {}),
      // Thinking tokens are billed against the quota and add nothing to a structured scoring task.
      ...(extras && /flash/i.test(m) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  })

  const send = async (extras: boolean) => {
    await acquireRequestSlot()
    options.onRequest?.()
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": token },
      body: JSON.stringify(buildBody(extras)),
    })
  }

  let res = await send(true)
  if (res.status === 400) {
    const errorText = await res.text()
    // Older/newer models may reject thinkingConfig or responseSchema; retry once without them.
    if (/thinking|schema|response_?schema/i.test(errorText)) {
      console.warn(`[AI Client] Gemini '${m}' rejected thinking/schema config, retrying without it`)
      res = await send(false)
    } else {
      throw new AiClientError(`Google Gemini API error (400): ${errorText}`, 400)
    }
  }

  if (!res.ok) {
    const errorText = await res.text()
    console.error(`[AI Client] Gemini native call for model '${m}' failed (${res.status}): ${errorText.slice(0, 500)}`)
    if (res.status === 429) {
      const { retryAfterMs, dailyQuota } = parseGeminiRateLimit(errorText)
      if (dailyQuota) {
        throw new AiQuotaExhaustedError(`Gemini daily quota for '${m}' is used up. Try again tomorrow or switch model/key.`)
      }
      throw new AiClientError(`Google Gemini rate limit (429)`, 429, true, retryAfterMs ?? undefined)
    }
    throw new AiClientError(`Google Gemini API error (${res.status}): ${errorText}`, res.status, res.status >= 500)
  }

  const data = await res.json()
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? []
  const text = parts
    .filter((p) => !p?.thought && typeof p?.text === "string")
    .map((p) => p.text)
    .join("")
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason ?? data?.promptFeedback?.blockReason ?? "unknown"
    throw new AiClientError(`Google Gemini returned empty candidate text (finishReason: ${reason})`)
  }
  return text
}

/**
 * Call OpenAI-compatible chat completions endpoint (OpenRouter, Azure, GitHub Models, etc.)
 */
async function callOpenAiCompatible(
  endpoint: string,
  model: string,
  token: string,
  options: AiChatOptions
): Promise<string> {
  let url = endpoint
  if (!url.endsWith("/chat/completions")) {
    url = `${url}/chat/completions`
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "api-key": token,
  }

  const payload: Record<string, any> = {
    model,
    messages: [
      { role: "system", content: options.systemPrompt },
      { role: "user", content: options.userPrompt },
    ],
    ...(options.maxOutputTokens ? { max_tokens: options.maxOutputTokens } : {}),
  }

  if (options.jsonMode) {
    payload.response_format = { type: "json_object" }
  }

  const send = async () => {
    await acquireRequestSlot()
    options.onRequest?.()
    return fetch(url, { method: "POST", headers, body: JSON.stringify(payload) })
  }

  const res = await send()

  if (!res.ok) {
    const errorText = await res.text()
    console.error(`[AI Client] Request to ${url} failed (${res.status}): ${errorText.slice(0, 500)}`)

    if (options.jsonMode && /response_format/i.test(errorText)) {
      console.warn("[AI Client] Retrying without response_format...")
      delete payload.response_format
      const retryRes = await send()
      if (retryRes.ok) {
        const retryData = await retryRes.json()
        const retryText = retryData?.choices?.[0]?.message?.content
        if (retryText && typeof retryText === "string") return retryText
      }
    }

    if (res.status === 429 && isGeminiEndpointOrKey(endpoint, token)) {
      const { retryAfterMs, dailyQuota } = parseGeminiRateLimit(errorText)
      if (dailyQuota) throw new AiQuotaExhaustedError(`Gemini daily quota for '${model}' is used up.`)
      throw new AiClientError(`AI rate limit (429)`, 429, true, retryAfterMs ?? undefined)
    }

    const retryable = res.status === 429 || res.status >= 500
    throw new AiClientError(
      `AI request failed (${res.status}): ${errorText}`,
      res.status,
      retryable,
      res.status === 429 ? parseRetryAfterHeader(res.headers.get("retry-after")) : undefined
    )
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content || typeof content !== "string") {
    throw new AiClientError("AI provider returned empty response content")
  }

  return content
}

/**
 * Universal AI chat completion
 */
export async function callAiChat(options: AiChatOptions): Promise<string> {
  const { token, endpoint, model, fallbackModel } = await getAiConfig()
  if (!token) {
    throw new AiClientError("AI token is not configured. An admin can set it under Settings → AI Configuration.")
  }

  const models = fallbackModel && fallbackModel !== model ? [model, fallbackModel] : [model]
  let lastError: unknown

  for (const [index, m] of models.entries()) {
    try {
      return await callModelWithRetry(endpoint, m, token, options)
    } catch (err) {
      lastError = err
      // Quotas are per model, so an exhausted primary can still fall back to a different model.
      if (index < models.length - 1 && isModelUnavailable(err)) {
        console.warn(`[AI Client] Model '${m}' unavailable, switching to fallback model '${models[index + 1]}'`)
        continue
      }
      throw err
    }
  }
  throw lastError
}

/** Overloaded / rate limited / server error / model retired: worth trying another model. */
function isModelUnavailable(err: unknown): boolean {
  if (!(err instanceof AiClientError)) return false
  const s = err.statusCode
  return s === 404 || s === 429 || (s !== undefined && s >= 500)
}

/** Retry transient failures (429/5xx) before giving up on a model, waiting as long as the provider asks. */
async function callModelWithRetry(
  endpoint: string,
  model: string,
  token: string,
  options: AiChatOptions
): Promise<string> {
  const fallbackDelaysMs = [5_000, 20_000]
  for (let attempt = 0; ; attempt++) {
    try {
      return await callModelOnce(endpoint, model, token, options)
    } catch (err) {
      if (err instanceof AiQuotaExhaustedError) throw err
      const s = err instanceof AiClientError ? err.statusCode : undefined
      const transient = s === 429 || (s !== undefined && s >= 500)
      if (!transient || attempt >= fallbackDelaysMs.length) throw err
      const asked = err instanceof AiClientError ? err.retryAfterMs : undefined
      const delay = Math.min(MAX_WAIT_MS, asked ?? fallbackDelaysMs[attempt])
      console.warn(`[AI Client] '${model}' returned ${s}, retrying in ${delay}ms`)
      await sleep(delay)
    }
  }
}

async function callModelOnce(
  endpoint: string,
  model: string,
  token: string,
  options: AiChatOptions
): Promise<string> {
  if (isGeminiEndpointOrKey(endpoint, token)) {
    try {
      return await callGeminiNative(model, token, options)
    } catch (geminiError: any) {
      // Only an unusable *response* (no status code) is worth one try on the compat endpoint;
      // HTTP errors (auth, quota, bad model, overload) would fail identically there.
      if (!(geminiError instanceof AiClientError) || geminiError.statusCode !== undefined) throw geminiError
      console.warn("[AI Client] Gemini native response unusable, trying OpenAI compatibility endpoint:", geminiError.message)
      const openAiUrl = "https://generativelanguage.googleapis.com/v1beta/openai"
      return await callOpenAiCompatible(openAiUrl, cleanModelName(model), token, options)
    }
  }

  return await callOpenAiCompatible(endpoint, model, token, options)
}
