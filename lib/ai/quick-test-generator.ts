import { z } from "zod"
import { callAiChat } from "@/lib/ai/ai-client"
import { getFallbackQuestions, stripCodeFences } from "@/lib/ai/assessment-generator"
import { QUICK_TEST_LIMITS, distributeCount, equalPoints } from "@/lib/quick-test/rules"

const MIN_VIABLE_QUESTIONS = QUICK_TEST_LIMITS.questionCount.min
const MAX_FALLBACK_SKILLS = 3

export type QuickTestJobContext = {
  title: string
  description?: string | null
  successCriteria?: string | null
  minimumExperience?: string | null
  skills: Array<{ name: string; priority: "REQUIRED" | "PREFERRED" }>
}

export type GeneratedQuickTestQuestion = {
  question: string
  options: string[]
  correct: string
  points: number
}

export type QuickTestGenerationResult = {
  questions: GeneratedQuickTestQuestion[]
  source: "ai" | "curated"
}

export class QuickTestGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "QuickTestGenerationError"
  }
}

const rawQuestionSchema = z.object({
  question: z.string().trim().min(10),
  options: z.array(z.string().trim().min(1)).length(4),
  correct: z.string().trim().min(1),
})

export function stripHtml(input: string | null | undefined, maxLength: number): string {
  if (!input) return ""
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
}

function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

/**
 * Validates a raw AI payload and normalises it into quick test questions:
 * exactly `count` unique questions, 4 distinct options, a correct answer that matches an option,
 * shuffled options (models bias the correct answer toward the first slot) and equal points.
 */
export function parseQuickTestQuestions(
  raw: string,
  count: number,
  random: () => number = Math.random
): GeneratedQuickTestQuestion[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(stripCodeFences(raw))
  } catch {
    throw new QuickTestGenerationError("AI response was not valid JSON")
  }

  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as any).questions)
      ? (parsed as any).questions
      : null
  if (!list) throw new QuickTestGenerationError("AI response did not contain a question list")

  const questions = z.array(rawQuestionSchema).parse(list)
  if (questions.length < count) {
    throw new QuickTestGenerationError(`Expected ${count} questions but received ${questions.length}`)
  }

  const seen = new Set<string>()
  const accepted: Array<z.infer<typeof rawQuestionSchema>> = []
  for (const question of questions) {
    const key = question.question.toLowerCase()
    if (seen.has(key)) continue
    if (new Set(question.options.map((option) => option.toLowerCase())).size !== 4) continue
    if (!question.options.includes(question.correct)) continue
    seen.add(key)
    accepted.push(question)
  }

  if (accepted.length < count) {
    throw new QuickTestGenerationError("AI response contained too few valid, unique questions")
  }

  const points = equalPoints(count)
  return accepted.slice(0, count).map((question, index) => ({
    question: question.question,
    options: shuffle(question.options, random),
    correct: question.correct,
    points: points[index]!,
  }))
}

function buildPrompts(job: QuickTestJobContext, count: number, strict: boolean) {
  const required = job.skills.filter((s) => s.priority === "REQUIRED").map((s) => s.name)
  const preferred = job.skills.filter((s) => s.priority === "PREFERRED").map((s) => s.name)

  const easy = Math.round(count * 0.3)
  const hard = Math.round(count * 0.2)
  const medium = Math.max(0, count - easy - hard)

  const systemPrompt = strict
    ? "You write pre-screening tests for recruiters. Return ONLY a valid JSON array with no markdown fences, no commentary and no trailing text."
    : "You write pre-screening tests for recruiters. Return ONLY valid JSON, no markdown fences, no commentary."

  const successCriteria = stripHtml(job.successCriteria, 600)
  const description = stripHtml(job.description, 1800)
  const context = [
    `Job title: ${job.title}`,
    required.length ? `Required skills: ${required.join(", ")}` : null,
    preferred.length ? `Preferred skills: ${preferred.join(", ")}` : null,
    job.minimumExperience ? `Minimum experience: ${job.minimumExperience}` : null,
    successCriteria ? `Success criteria: ${successCriteria}` : null,
    description ? `Job description: ${description}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const userPrompt = `${context}

Write exactly ${count} multiple choice questions that test the practical, job-relevant knowledge a strong candidate for this role should have. Cover the required skills first, then the preferred skills and the success criteria.
Difficulty mix: ${easy} easy, ${medium} medium, ${hard} hard.
Rules: each question must be answerable without outside context, have exactly 4 distinct options with exactly one correct answer, and must not be trivia about the company. Do not repeat questions.
Return a JSON array of ${count} objects: { "question": string, "options": string[4], "correct": string (must exactly match one option) }.`

  return { systemPrompt, userPrompt }
}

async function requestFromAi(job: QuickTestJobContext, count: number, strict: boolean): Promise<string> {
  const { systemPrompt, userPrompt } = buildPrompts(job, count, strict)
  return callAiChat({ systemPrompt, userPrompt, jsonMode: true })
}

function buildCuratedFallback(job: QuickTestJobContext, count: number): GeneratedQuickTestQuestion[] {
  const ranked = [...job.skills].sort((a, b) =>
    a.priority === b.priority ? 0 : a.priority === "REQUIRED" ? -1 : 1
  )
  const skillNames = ranked.slice(0, MAX_FALLBACK_SKILLS).map((skill) => skill.name)
  if (skillNames.length === 0) skillNames.push(job.title)

  const perSkill = distributeCount(count, skillNames.length)
  const collected: Array<{ question: string; options: string[]; correct: string }> = []
  const seen = new Set<string>()

  skillNames.forEach((skill, index) => {
    const wanted = perSkill[index] ?? 0
    if (wanted <= 0) return
    // getFallbackQuestions cycles its pool with a "(Qn)" suffix when asked for more than it has; skip repeats.
    for (const question of getFallbackQuestions(skill, wanted, QUICK_TEST_LIMITS.maxPoints)) {
      if (/\(Q\d+\)$/.test(question.question)) continue
      const key = question.question.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      collected.push(question)
    }
  })

  if (collected.length < MIN_VIABLE_QUESTIONS) {
    throw new QuickTestGenerationError("Not enough curated questions are available for this role")
  }

  const points = equalPoints(collected.length)
  return collected.map((question, index) => ({
    question: question.question,
    options: shuffle(question.options),
    correct: question.correct,
    points: points[index]!,
  }))
}

export async function generateQuickTestQuestions(
  job: QuickTestJobContext,
  count: number
): Promise<QuickTestGenerationResult> {
  for (const strict of [false, true]) {
    try {
      const raw = await requestFromAi(job, count, strict)
      return { questions: parseQuickTestQuestions(raw, count), source: "ai" }
    } catch (error: any) {
      console.warn(
        `[Quick Test Generator] AI attempt (${strict ? "strict" : "normal"}) failed: ${error?.message ?? error}`
      )
    }
  }

  console.warn("[Quick Test Generator] AI generation failed twice. Using curated questions.")
  return { questions: buildCuratedFallback(job, count), source: "curated" }
}
