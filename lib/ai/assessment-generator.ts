import ModelClient, { isUnexpected } from "@azure-rest/ai-inference"
import { AzureKeyCredential } from "@azure/core-auth"
import { z } from "zod"

const generatedQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correct: z.string().min(1),
  points: z.number().int().positive(),
})

const generatedQuestionsSchema = z.array(generatedQuestionSchema).min(1)

export type GeneratedAssessmentQuestion = z.infer<typeof generatedQuestionSchema>

export class AssessmentGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AssessmentGenerationError"
  }
}

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

function normalizePoints(
  questions: GeneratedAssessmentQuestion[],
  maxPoints: number
): GeneratedAssessmentQuestion[] {
  const rawTotal = questions.reduce((sum, question) => sum + question.points, 0)
  if (rawTotal <= 0) {
    throw new AssessmentGenerationError("Generated questions have invalid point totals")
  }

  const scaled = questions.map((question) => ({
    ...question,
    points: Math.max(1, Math.round((question.points / rawTotal) * maxPoints)),
  }))

  const scaledTotal = scaled.reduce((sum, question) => sum + question.points, 0)
  const delta = maxPoints - scaledTotal

  if (delta !== 0) {
    scaled[scaled.length - 1] = {
      ...scaled[scaled.length - 1],
      points: Math.max(1, scaled[scaled.length - 1].points + delta),
    }
  }

  return scaled
}

function validateGeneratedQuestions(
  questions: GeneratedAssessmentQuestion[],
  count: number,
  maxPoints: number
): GeneratedAssessmentQuestion[] {
  const parsed = generatedQuestionsSchema.parse(questions)

  if (parsed.length !== count) {
    throw new AssessmentGenerationError(
      `Expected ${count} questions but received ${parsed.length}`
    )
  }

  for (const question of parsed) {
    if (!question.options.includes(question.correct)) {
      throw new AssessmentGenerationError(
        "Generated question correct answer must match one of the provided options"
      )
    }
  }

  return normalizePoints(parsed, maxPoints)
}

async function requestQuestions(
  skill: string,
  count: number,
  strict: boolean
): Promise<string> {
  const token = process.env.AI_INFERENCE_TOKEN ?? process.env.GITHUB_TOKEN
  if (!token) {
    throw new AssessmentGenerationError("AI inference token is not configured")
  }

  const endpoint = process.env.AI_INFERENCE_ENDPOINT ?? "https://openrouter.ai/api/v1"
  const model = process.env.AI_INFERENCE_MODEL ?? "openai/gpt-oss-20b:free"
  const client = ModelClient(endpoint, new AzureKeyCredential(token))

  const systemPrompt = strict
    ? "You are a technical assessment generator. Return ONLY valid JSON array syntax with no markdown fences, no commentary, and no trailing text."
    : "You are a technical assessment generator. Return ONLY valid JSON, no markdown fences, no commentary."

  const response = await client.path("/chat/completions").post({
    body: {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate ${count} multiple choice questions to assess practical, real-world proficiency in "${skill}". Mix difficulty from foundational to advanced. Return a JSON array of objects: { "question": string, "options": string[4], "correct": string (must exactly match one option), "points": number }.`,
        },
      ],
    },
  })

  if (isUnexpected(response)) {
    const errorBody = response.body as { error?: { message?: string } }
    throw new AssessmentGenerationError(
      errorBody?.error?.message ?? "AI question generation failed"
    )
  }

  const raw = response.body.choices?.[0]?.message?.content
  if (!raw || typeof raw !== "string") {
    throw new AssessmentGenerationError("AI returned an empty response")
  }

  return raw
}

function parseAndValidateQuestions(
  raw: string,
  count: number,
  maxPoints: number
): GeneratedAssessmentQuestion[] {
  const cleaned = stripCodeFences(raw)
  let parsed: unknown

  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new AssessmentGenerationError("AI response was not valid JSON")
  }

  return validateGeneratedQuestions(parsed as GeneratedAssessmentQuestion[], count, maxPoints)
}

export async function generateSkillQuestions(
  skill: string,
  count: number,
  maxPoints: number
): Promise<GeneratedAssessmentQuestion[]> {
  try {
    const raw = await requestQuestions(skill, count, false)
    return parseAndValidateQuestions(raw, count, maxPoints)
  } catch (firstError) {
    try {
      const raw = await requestQuestions(skill, count, true)
      return parseAndValidateQuestions(raw, count, maxPoints)
    } catch {
      if (firstError instanceof AssessmentGenerationError) {
        throw firstError
      }
      throw new AssessmentGenerationError("AI question generation failed validation")
    }
  }
}
