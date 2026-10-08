import { z } from "zod"
import { ShortlistAiPromptPayload } from "@/lib/ai-shortlist/deterministic"
import { callAiChat, AiClientError } from "@/lib/ai/ai-client"

export class ShortlistEvaluationError extends Error {
  /** True for transient failures (rate limits, upstream provider errors) worth retrying. */
  retryable: boolean

  constructor(message: string, retryable = false) {
    super(message)
    this.name = "ShortlistEvaluationError"
    this.retryable = retryable
  }
}

const mandatoryChecklistItemSchema = z.object({
  requirement: z.string().min(1),
  priority: z.enum(["REQUIRED", "PREFERRED"]),
  met: z.boolean(),
  note: z.string(),
})

const shortlistEvaluationSchema = z.object({
  skillsScore: z.number().min(0).max(100),
  educationScore: z.number().min(0).max(100),
  experienceScore: z.number().min(0).max(100),
  successCriteriaScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  educationSatisfied: z.boolean().nullable(),
  mandatoryChecklist: z.array(mandatoryChecklistItemSchema),
  matchedRequirements: z.array(z.string()).max(30),
  missingRequirements: z.array(z.string()).max(30),
  strengths: z.array(z.string()).max(10),
  concerns: z.array(z.string()).max(10),
  reasoning: z.string().min(1).max(2000),
})

export type ShortlistEvaluation = z.infer<typeof shortlistEvaluationSchema>

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith("```")) {
    const lines = trimmed.split("\n")
    if (lines.length >= 2 && lines[lines.length - 1]?.trim().endsWith("```")) {
      lines.shift()
      lines.pop()
      return lines.join("\n").trim()
    }
  }
  const jsonMatch = trimmed.match(/(\[\s*[\s\S]*\s*\]|\{\s*[\s\S]*\s*\})/)
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim()
  }
  return trimmed
}

async function requestEvaluation(
  payload: ShortlistAiPromptPayload,
  strict: boolean,
  omitResponseFormat = false
): Promise<string> {
  // The job block and schema are identical for every candidate in a run, so they live in the system
  // prompt (a stable prefix that providers can cache); the user prompt carries only the candidate.
  const systemInstruction = `You are an expert HR evaluation assistant. Score the candidate against the job below using the candidate JSON you receive.

JOB:
${JSON.stringify(payload.job)}

GUIDELINES:
- Reason holistically from skills, work experience titles, education, bio and achievements (e.g. a "Senior React & Node Developer" implies React/Node skills even if untagged).
- Never invent facts. "Not Provided"/empty means unknown.
- skillsScore, educationScore, experienceScore, successCriteriaScore: 0-100. confidence: 0-100 based on how complete the profile is.
- mandatoryChecklist: one item per key requirement (skills, education, minimum experience, success criteria).
- Be concise: notes under 15 words, at most 5 items in each list, reasoning under 400 characters.
- Return ONLY a JSON object ${strict ? "with no markdown fences, comments or extra text, " : ""}shaped exactly like:
{"skillsScore":n,"educationScore":n,"experienceScore":n,"successCriteriaScore":n,"confidence":n,"educationSatisfied":bool|null,"mandatoryChecklist":[{"requirement":s,"priority":"REQUIRED"|"PREFERRED","met":bool,"note":s}],"matchedRequirements":[s],"missingRequirements":[s],"strengths":[s],"concerns":[s],"reasoning":s}`

  const userPrompt = JSON.stringify({ candidate: payload.candidate, deterministic: payload.deterministic })

  try {
    return await callAiChat({
      systemPrompt: systemInstruction,
      userPrompt,
      jsonMode: !omitResponseFormat,
    })
  } catch (err: any) {
    const statusCode = err instanceof AiClientError ? err.statusCode : undefined
    const retryable = err instanceof AiClientError ? (err.retryable ?? false) : false
    console.error("[Shortlist Evaluator] AI call failed:", err?.message)
    throw new ShortlistEvaluationError(err?.message ?? "AI candidate evaluation failed", retryable)
  }
}

function parseAndValidateEvaluation(raw: string): ShortlistEvaluation {
  const cleaned = stripCodeFences(raw)
  let parsed: unknown

  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new ShortlistEvaluationError("AI response was not valid JSON")
  }

  try {
    return shortlistEvaluationSchema.parse(parsed)
  } catch (err: any) {
    throw new ShortlistEvaluationError(
      `AI response failed validation: ${err.message ?? "Invalid schema"}`
    )
  }
}

// callAiChat already retries 429/5xx with backoff and falls back to another model, so this only
// re-asks (once) when the model returned unparseable output; each retry re-sends the full prompt.
const MAX_EVALUATION_ATTEMPTS = 2

export async function evaluateCandidateForJob(
  payload: ShortlistAiPromptPayload
): Promise<ShortlistEvaluation> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_EVALUATION_ATTEMPTS; attempt++) {
    // From the 2nd attempt onward, drop response_format (in case a provider rejects it)
    // and ask the model more explicitly for bare JSON.
    const strict = attempt > 1
    const omitResponseFormat = attempt > 1

    try {
      const raw = await requestEvaluation(payload, strict, omitResponseFormat)
      return parseAndValidateEvaluation(raw)
    } catch (err) {
      lastError = err
      const retryable = err instanceof ShortlistEvaluationError ? err.retryable : true
      const isLastAttempt = attempt === MAX_EVALUATION_ATTEMPTS

      // Transient provider errors were already retried inside callAiChat; don't multiply them.
      if (isLastAttempt || retryable) break
    }
  }

  if (lastError instanceof ShortlistEvaluationError) {
    throw lastError
  }
  throw new ShortlistEvaluationError("AI shortlisting evaluation failed validation")
}
