/**
 * Universal AI Completion Client
 * Supports Google Gemini (native generateContent and OpenAI-compatible),
 * OpenRouter, GitHub Models, Azure AI Inference, and standard OpenAI.
 */

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

function cleanEndpoint(rawEndpoint?: string): string {
  if (!rawEndpoint) return "https://openrouter.ai/api/v1"
  return rawEndpoint.trim().replace(/\/+$/, "")
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
  const candidateModels = [
    cleanModel,
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
  ].filter((m, i, arr) => arr.indexOf(m) === i)

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
  const token = (process.env.AI_INFERENCE_TOKEN ?? process.env.GITHUB_TOKEN ?? "").trim()
  if (!token) {
    throw new AiClientError("AI inference token is not configured (AI_INFERENCE_TOKEN or GITHUB_TOKEN)")
  }

  const endpoint = cleanEndpoint(process.env.AI_INFERENCE_ENDPOINT)
  const model = (process.env.AI_INFERENCE_MODEL ?? "openai/gpt-oss-20b:free").trim()

  if (isGeminiEndpointOrKey(endpoint, token)) {
    try {
      return await callGeminiNative(model, token, options)
    } catch (geminiError: any) {
      console.warn("[AI Client] Gemini native call failed, trying OpenAI compatibility fallback:", geminiError?.message)
      const openAiUrl = "https://generativelanguage.googleapis.com/v1beta/openai"
      return await callOpenAiCompatible(openAiUrl, model.includes("/") ? model.split("/").pop()! : model, token, options)
    }
  }

  return await callOpenAiCompatible(endpoint, model, token, options)
}
