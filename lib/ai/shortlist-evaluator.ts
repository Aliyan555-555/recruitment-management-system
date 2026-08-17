import ModelClient, { isUnexpected } from "@azure-rest/ai-inference"
import { AzureKeyCredential } from "@azure/core-auth"
import { z } from "zod"
import { ShortlistAiPromptPayload } from "@/lib/ai-shortlist/deterministic"

export class ShortlistEvaluationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ShortlistEvaluationError"
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
    if (lines.length >= 2 && lines[lines.length - 1].trim().endsWith("```")) {
      lines.shift()
      lines.pop()
      return lines.join("\n").trim()
    }
  }
  const jsonMatch = trimmed.match(/(\[\s*[\s\S]*\s*\]|\{\s*[\s\S]*\s*\})/)
  if (jsonMatch) {
    return jsonMatch[1].trim()
  }
  return trimmed
}

async function requestEvaluation(
  payload: ShortlistAiPromptPayload,
  strict: boolean
): Promise<string> {
  const token = process.env.AI_INFERENCE_TOKEN ?? process.env.GITHUB_TOKEN
  if (!token) {
    throw new ShortlistEvaluationError("AI inference token is not configured")
  }

  const endpoint = process.env.AI_INFERENCE_ENDPOINT ?? "https://openrouter.ai/api/v1"
  const model = process.env.AI_INFERENCE_MODEL ?? "openai/gpt-oss-20b:free"
  const client = ModelClient(endpoint, new AzureKeyCredential(token))

  const systemInstruction = `You are an expert HR evaluation assistant. Evaluate the candidate against the specified job requirements based ONLY on the provided JSON payload.

CRITICAL RULES:
1. Only reason about data explicitly provided in the payload. Any field marked "Not Provided" must be treated as unknown, never assumed present.
2. A job requirement with no corresponding candidate data must be marked as unmet (met: false).
3. Do not fabricate or assume company names, dates, or credentials.
4. Evaluate skills, education, experience, and success criteria on a scale of 0-100.
5. Provide confidence (0-100) in your evaluation based on how complete the candidate profile data is.
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

  const response = await client.path("/chat/completions").post({
    body: {
      model,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
    },
  })

  if (isUnexpected(response)) {
    const errorBody = response.body as { error?: { message?: string } }
    throw new ShortlistEvaluationError(
      errorBody?.error?.message ?? "AI candidate evaluation failed"
    )
  }

  const raw = response.body.choices?.[0]?.message?.content
  if (!raw || typeof raw !== "string") {
    throw new ShortlistEvaluationError("AI returned an empty response")
  }

  return raw
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

export async function evaluateCandidateForJob(
  payload: ShortlistAiPromptPayload
): Promise<ShortlistEvaluation> {
  try {
    const raw = await requestEvaluation(payload, false)
    return parseAndValidateEvaluation(raw)
  } catch (firstError) {
    try {
      const raw = await requestEvaluation(payload, true)
      return parseAndValidateEvaluation(raw)
    } catch {
      if (firstError instanceof ShortlistEvaluationError) {
        throw firstError
      }
      throw new ShortlistEvaluationError("AI shortlisting evaluation failed validation")
    }
  }
}
