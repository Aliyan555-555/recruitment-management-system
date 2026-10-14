import { z } from "zod"
import { ShortlistAiPromptPayload } from "@/lib/ai-shortlist/deterministic"
import { callAiChat, AiClientError, AiQuotaExhaustedError } from "@/lib/ai/ai-client"

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

const score = z.coerce.number().transform((n) => Math.max(0, Math.min(100, Math.round(n))))
const shortList = (max: number) => z.array(z.string()).transform((a) => a.slice(0, max))

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

/**
 * What the model returns per candidate. Matched/missing requirements are not asked for (they come
 * from the deterministic match), and over-long lists are trimmed instead of failing validation,
 * because every rejected answer would cost another request.
 */
const aiItemSchema = z.object({
  id: z.string(),
  skillsScore: score,
  educationScore: score,
  experienceScore: score,
  successCriteriaScore: score,
  confidence: score,
  educationSatisfied: z.boolean().nullable().optional().transform((v) => v ?? null),
  mandatoryChecklist: z.array(mandatoryChecklistItemSchema).transform((a) => a.slice(0, 8)),
  strengths: shortList(3),
  concerns: shortList(3),
  reasoning: z.string().min(1).transform((s) => s.slice(0, 600)),
})

type AiItem = z.infer<typeof aiItemSchema>

/** Gemini responseSchema (OpenAPI subset) mirroring aiItemSchema; guarantees parseable JSON. */
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    results: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          skillsScore: { type: "INTEGER" },
          educationScore: { type: "INTEGER" },
          experienceScore: { type: "INTEGER" },
          successCriteriaScore: { type: "INTEGER" },
          confidence: { type: "INTEGER" },
          educationSatisfied: { type: "BOOLEAN", nullable: true },
          mandatoryChecklist: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                requirement: { type: "STRING" },
                priority: { type: "STRING", enum: ["REQUIRED", "PREFERRED"] },
                met: { type: "BOOLEAN" },
                note: { type: "STRING" },
              },
              required: ["requirement", "priority", "met", "note"],
            },
          },
          strengths: { type: "ARRAY", items: { type: "STRING" } },
          concerns: { type: "ARRAY", items: { type: "STRING" } },
          reasoning: { type: "STRING" },
        },
        required: [
          "id", "skillsScore", "educationScore", "experienceScore", "successCriteriaScore",
          "confidence", "educationSatisfied", "mandatoryChecklist", "strengths", "concerns", "reasoning",
        ],
        propertyOrdering: [
          "id", "skillsScore", "educationScore", "experienceScore", "successCriteriaScore",
          "confidence", "educationSatisfied", "mandatoryChecklist", "strengths", "concerns", "reasoning",
        ],
      },
    },
  },
  required: ["results"],
} as const

export interface BatchCandidateInput {
  /** Caller's key for this candidate (e.g. user id); never sent to the model. */
  key: string
  candidate: ShortlistAiPromptPayload["candidate"]
  deterministic: ShortlistAiPromptPayload["deterministic"]
  atsScore?: number | null
}

export type BatchEvaluationResult = Map<string, ShortlistEvaluation | ShortlistEvaluationError>

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

function systemPrompt(job: ShortlistAiPromptPayload["job"]): string {
  // The job block and rules are identical for every request in a run, so they form a stable prefix
  // (cacheable by the provider); the user prompt carries only the candidates.
  return `You are an expert technical recruiter. Each candidate below already passed ATS screening; judge how likely each is to succeed in this job.

JOB:
${JSON.stringify(job)}

RULES:
- You receive a JSON array of candidates, each with an "id". Return exactly one result per id.
- Score each candidate on an absolute 0-100 scale, but use the other candidates in the batch to keep scores consistent.
- Reason holistically from skills, experience titles and dates, education, bio and achievements (e.g. "Senior React & Node Developer" implies React/Node).
- "deterministic" holds keyword skill matching, assessment and quick test results computed by the system; trust them but you may credit skills evident from experience.
- Never invent facts. "Not Provided" means unknown; lower confidence instead of guessing.
- confidence: 0-100, how complete and specific the profile is.
- educationSatisfied: false only if the profile clearly fails the education requirement; null if unknown.
- mandatoryChecklist: one item per key requirement (required skills, education, minimum experience, success criteria), notes under 12 words.
- strengths and concerns: at most 3 short items each. reasoning: under 250 characters, focused on hireability.
- Return ONLY JSON: {"results":[{"id":s,"skillsScore":n,"educationScore":n,"experienceScore":n,"successCriteriaScore":n,"confidence":n,"educationSatisfied":bool|null,"mandatoryChecklist":[{"requirement":s,"priority":"REQUIRED"|"PREFERRED","met":bool,"note":s}],"strengths":[s],"concerns":[s],"reasoning":s}]}`
}

function toEvaluation(item: AiItem, input: BatchCandidateInput): ShortlistEvaluation {
  const det = input.deterministic
  const checklistMet = item.mandatoryChecklist.filter((c) => c.met).map((c) => c.requirement)
  const checklistMissing = item.mandatoryChecklist.filter((c) => !c.met).map((c) => c.requirement)
  const uniq = (a: string[]) => Array.from(new Set(a)).slice(0, 30)
  return {
    skillsScore: item.skillsScore,
    educationScore: item.educationScore,
    experienceScore: item.experienceScore,
    successCriteriaScore: item.successCriteriaScore,
    confidence: item.confidence,
    educationSatisfied: item.educationSatisfied,
    mandatoryChecklist: item.mandatoryChecklist,
    matchedRequirements: uniq([...det.matchedRequiredSkills, ...det.matchedPreferredSkills, ...checklistMet]),
    missingRequirements: uniq([...det.missingRequiredSkills, ...checklistMissing]),
    strengths: item.strengths,
    concerns: item.concerns,
    reasoning: item.reasoning,
  }
}

/** Parses a batch answer; returns the valid evaluations keyed by the short id ("c1", "c2", ...). */
export function parseBatchResponse(raw: string): Map<string, AiItem> {
  const out = new Map<string, AiItem>()
  let parsed: any
  try {
    parsed = JSON.parse(stripCodeFences(raw))
  } catch {
    return out
  }
  const results: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.results) ? parsed.results : []
  for (const r of results) {
    const item = aiItemSchema.safeParse(r)
    if (item.success && !out.has(item.data.id)) out.set(item.data.id, item.data)
  }
  return out
}

async function requestBatch(
  job: ShortlistAiPromptPayload["job"],
  items: BatchCandidateInput[],
  onRequest?: () => void
): Promise<Map<string, AiItem>> {
  const userPrompt = JSON.stringify(
    items.map((it, i) => ({
      id: `c${i + 1}`,
      // The name is left out: it adds tokens and can only bias the evaluation.
      candidate: { ...it.candidate, name: undefined },
      deterministic: it.deterministic,
      ...(it.atsScore != null ? { atsScore: it.atsScore } : {}),
    }))
  )
  const raw = await callAiChat({
    systemPrompt: systemPrompt(job),
    userPrompt,
    jsonMode: true,
    responseSchema: RESPONSE_SCHEMA,
    maxOutputTokens: 300 + 450 * items.length,
    onRequest,
  })
  const parsed = parseBatchResponse(raw)
  // Re-key from the short ids back to the caller's keys.
  const out = new Map<string, AiItem>()
  items.forEach((it, i) => {
    const r = parsed.get(`c${i + 1}`)
    if (r) out.set(it.key, r)
  })
  return out
}

/**
 * Evaluates several candidates for one job in a single AI request. Candidates the model skipped or
 * answered invalidly are re-asked once, together, in a smaller request; anything still missing is
 * returned as a ShortlistEvaluationError. AiQuotaExhaustedError propagates so the caller can stop.
 */
export async function evaluateCandidatesBatch(
  job: ShortlistAiPromptPayload["job"],
  items: BatchCandidateInput[],
  opts: { onRequest?: () => void } = {}
): Promise<BatchEvaluationResult> {
  const results: BatchEvaluationResult = new Map()
  if (items.length === 0) return results

  let pending = items
  let lastError: ShortlistEvaluationError = new ShortlistEvaluationError("AI response was missing or invalid for this candidate")
  for (let attempt = 1; attempt <= 2 && pending.length > 0; attempt++) {
    try {
      const answers = await requestBatch(job, pending, opts.onRequest)
      for (const it of pending) {
        const a = answers.get(it.key)
        if (a) results.set(it.key, toEvaluation(a, it))
      }
      pending = pending.filter((it) => !results.has(it.key))
    } catch (err: any) {
      if (err instanceof AiQuotaExhaustedError) throw err
      console.error("[Shortlist Evaluator] AI call failed:", err?.message)
      const retryable = err instanceof AiClientError ? (err.retryable ?? false) : false
      lastError = new ShortlistEvaluationError(err?.message ?? "AI candidate evaluation failed", retryable)
      // Transient errors were already retried inside callAiChat; don't multiply them.
      break
    }
  }
  for (const it of pending) results.set(it.key, lastError)
  return results
}

/** Single-candidate evaluation (a batch of one); throws on failure. */
export async function evaluateCandidateForJob(
  payload: ShortlistAiPromptPayload,
  opts: { onRequest?: () => void } = {}
): Promise<ShortlistEvaluation> {
  const results = await evaluateCandidatesBatch(
    payload.job,
    [{ key: "single", candidate: payload.candidate, deterministic: payload.deterministic }],
    opts
  )
  const r = results.get("single")
  if (!r || r instanceof ShortlistEvaluationError) {
    throw r ?? new ShortlistEvaluationError("AI shortlisting evaluation failed validation")
  }
  return r
}
