/**
 * Universal AI Completion Client
 * Supports Google Gemini (native generateContent and OpenAI-compatible),
 * OpenRouter, GitHub Models, Azure AI Inference, and standard OpenAI.
 * Provider credentials come from getAiConfig() (admin settings, env fallback).
 */

import { getAiConfig } from "@/lib/ai/ai-config"

export interface AiChatOptions {
  systemPrompt: string
  userPrompt: string
  jsonMode?: boolean
}

export class AiClientError extends Error {
  statusCode?: number
  retryable?: boolean

  constructor(message: string, statusCode?: number, retryable = false) {
    super(message)
    this.name = "AiClientError"
    this.statusCode = statusCode
    this.retryable = retryable
  }
}

function isGeminiEndpointOrKey(endpoint: string, token: string): boolean {
  return (
    endpoint.includes("generativelanguage.googleapis.com") ||
    token.startsWith("AQ.") ||
    token.startsWith("AIza")
  )
}

/**
 * Call Google Gemini native generateContent API
 */
async function callGeminiNative(
  model: string,
  token: string,
  options: AiChatOptions
): Promise<string> {
  const cleanModel = model.includes("/") ? model.split("/").pop()! : model
  // Only the admin-configured model is used; silently substituting other models
  // masked real misconfiguration and Google retires model names regularly.
  const candidateModels = [cleanModel]

  let lastError: Error | null = null

  for (const m of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(token)}`

    const body: Record<string, any> = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${options.systemPrompt}\n\n${options.userPrompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": token,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error(`[AI Client] Gemini native call for model '${m}' failed (${res.status}): ${errorText}`)
        if (res.status === 404 && candidateModels.indexOf(m) < candidateModels.length - 1) {
          continue
        }
        throw new AiClientError(`Google Gemini API error (${res.status}): ${errorText}`, res.status)
      }

      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text || typeof text !== "string") {
        throw new AiClientError("Google Gemini returned empty candidate text")
      }
      return text
    } catch (err: any) {
      lastError = err
      if (err instanceof AiClientError && err.statusCode === 404 && candidateModels.indexOf(m) < candidateModels.length - 1) {
        continue
      }
      throw err
    }
  }

  throw lastError ?? new AiClientError("All Gemini model attempts failed")
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
  }

  if (options.jsonMode) {
    payload.response_format = { type: "json_object" }
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error(`[AI Client] Request to ${url} failed (${res.status}): ${errorText}`)

    if (options.jsonMode && /response_format/i.test(errorText)) {
      console.warn("[AI Client] Retrying without response_format...")
      delete payload.response_format
      const retryRes = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      if (retryRes.ok) {
        const retryData = await retryRes.json()
        const retryText = retryData?.choices?.[0]?.message?.content
        if (retryText && typeof retryText === "string") return retryText
      }
    }

    const retryable = res.status === 429 || res.status >= 500
    throw new AiClientError(`AI request failed (${res.status}): ${errorText}`, res.status, retryable)
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

/** Retry transient failures (429/5xx) with backoff before giving up on a model. */
async function callModelWithRetry(
  endpoint: string,
  model: string,
  token: string,
  options: AiChatOptions
): Promise<string> {
  const delaysMs = [1000, 3000]
  for (let attempt = 0; ; attempt++) {
    try {
      return await callModelOnce(endpoint, model, token, options)
    } catch (err) {
      const s = err instanceof AiClientError ? err.statusCode : undefined
      const transient = s === 429 || (s !== undefined && s >= 500)
      if (!transient || attempt >= delaysMs.length) throw err
      console.warn(`[AI Client] '${model}' returned ${s}, retrying in ${delaysMs[attempt]}ms`)
      await new Promise((r) => setTimeout(r, delaysMs[attempt]))
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
      // 404 (bad/retired model) and 429/5xx (overload) would fail identically on the compat endpoint.
      if (geminiError instanceof AiClientError && isModelUnavailable(geminiError)) throw geminiError
      console.warn("[AI Client] Gemini native call failed, trying OpenAI compatibility fallback:", geminiError?.message)
      const openAiUrl = "https://generativelanguage.googleapis.com/v1beta/openai"
      return await callOpenAiCompatible(openAiUrl, model.includes("/") ? model.split("/").pop()! : model, token, options)
    }
  }

  return await callOpenAiCompatible(endpoint, model, token, options)
}
