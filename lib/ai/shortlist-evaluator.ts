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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
  const systemInstruction = `You are an expert HR evaluation assistant. Evaluate the candidate against the specified job requirements based on the provided JSON payload.

CRITICAL EVALUATION GUIDELINES:
1. Reason holistically about candidate qualifications from their explicit skills, work experience titles/descriptions, education degrees/majors, bio, and achievements.
2. In evaluating skillsScore (0-100), consider both explicit skill matches AND practical skills demonstrated across their work experience history and bio. For example, if a candidate has worked as a "Senior React & Node Developer", recognize their React and Node competencies even if not separately tagged in their skills list.
3. Do not fabricate facts or assume qualifications not supported by the candidate profile. Any field marked "Not Provided" or empty must be treated as unknown.
4. Evaluate skillsScore, educationScore, experienceScore, and successCriteriaScore on a scale of 0-100.
5. Provide confidence (0-100) based on how complete and detailed the candidate profile data is.
6. Provide a mandatoryChecklist item for each key requirement (skills, education, minimum experience, success criteria).
7. Return ONLY valid JSON format. ${strict ? "Do NOT include markdown fences, comments, or extra text." : ""}`

  const userPrompt = `Job & Candidate Evaluation Payload:
${JSON.stringify(payload, null, 2)}

Return a JSON object adhering to this exact schema:
{
  "skillsScore": number (0-100),
  "educationScore": number (0-100),
  "experienceScore": number (0-100),
  "successCriteriaScore": number (0-100),
  "confidence": number (0-100),
  "educationSatisfied": boolean | null,
  "mandatoryChecklist": [
    { "requirement": string, "priority": "REQUIRED" | "PREFERRED", "met": boolean, "note": string }
  ],
  "matchedRequirements": string[],
  "missingRequirements": string[],
  "strengths": string[],
  "concerns": string[],
  "reasoning": string (max 2000 chars)
}`

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

const MAX_EVALUATION_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 1000

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

      if (isLastAttempt) break

      // Only back off for transient provider/rate-limit errors; retry parse/validation
      // failures immediately since the model may simply produce different output.
      if (retryable) {
        await sleep(RETRY_BASE_DELAY_MS * attempt)
      }
    }
  }

  if (lastError instanceof ShortlistEvaluationError) {
    throw lastError
  }
  throw new ShortlistEvaluationError("AI shortlisting evaluation failed validation")
}
