import { z } from "zod"
import type { QuickTestAttemptStatus } from "@prisma/client"

export const QUICK_TEST_LIMITS = {
  questionCount: { min: 5, max: 30, default: 10 },
  timeLimitMinutes: { min: 5, max: 90, default: 15 },
  maxPoints: 100,
  /** Seconds the server tolerates after `expiresAt` for network latency on submit. */
  graceSeconds: 15,
  startRateLimit: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
} as const

export const CUSTOM_QUESTION_LIMITS = {
  questionMax: 1000,
  optionMax: 500,
  optionCount: 4,
  /** Largest admin-authored bank for one job. */
  bankMax: 100,
} as const

export const customQuestionSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(10, "Each question must be at least 10 characters")
      .max(CUSTOM_QUESTION_LIMITS.questionMax, `Questions can be at most ${CUSTOM_QUESTION_LIMITS.questionMax} characters`),
    options: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Options cannot be empty")
          .max(CUSTOM_QUESTION_LIMITS.optionMax, `Options can be at most ${CUSTOM_QUESTION_LIMITS.optionMax} characters`)
      )
      .length(CUSTOM_QUESTION_LIMITS.optionCount, `Each question needs exactly ${CUSTOM_QUESTION_LIMITS.optionCount} options`),
    correct: z.string().trim().min(1, "Select the correct answer for every question"),
  })
  .superRefine((value, ctx) => {
    const lowered = value.options.map((option) => option.toLowerCase())
    if (new Set(lowered).size !== value.options.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Options must be different from each other", path: ["options"] })
    }
    if (!value.options.includes(value.correct)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "The correct answer must be one of the options", path: ["correct"] })
    }
  })

export type CustomQuickTestQuestion = z.infer<typeof customQuestionSchema>

export const quickTestConfigSchema = z
  .object({
    enabled: z.boolean(),
    questionCount: z
      .number()
      .int("Question count must be a whole number")
      .min(QUICK_TEST_LIMITS.questionCount.min, `Minimum ${QUICK_TEST_LIMITS.questionCount.min} questions`)
      .max(QUICK_TEST_LIMITS.questionCount.max, `Maximum ${QUICK_TEST_LIMITS.questionCount.max} questions`)
      .default(QUICK_TEST_LIMITS.questionCount.default),
    timeLimitMinutes: z
      .number()
      .int("Time limit must be a whole number of minutes")
      .min(QUICK_TEST_LIMITS.timeLimitMinutes.min, `Minimum ${QUICK_TEST_LIMITS.timeLimitMinutes.min} minutes`)
      .max(QUICK_TEST_LIMITS.timeLimitMinutes.max, `Maximum ${QUICK_TEST_LIMITS.timeLimitMinutes.max} minutes`)
      .default(QUICK_TEST_LIMITS.timeLimitMinutes.default),
    source: z.enum(["AI", "CUSTOM"]).default("AI"),
    questions: z
      .array(customQuestionSchema)
      .max(CUSTOM_QUESTION_LIMITS.bankMax, `Maximum ${CUSTOM_QUESTION_LIMITS.bankMax} custom questions`)
      .default([]),
  })
  .superRefine((value, ctx) => {
    if (value.source !== "CUSTOM" || !value.enabled) return
    const seen = new Set<string>()
    for (const [index, item] of value.questions.entries()) {
      const key = item.question.toLowerCase()
      if (seen.has(key)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Question ${index + 1} is a duplicate`, path: ["questions", index] })
      }
      seen.add(key)
    }
    // Candidates answer `questionCount` questions drawn from the bank, so the bank must cover it.
    if (value.questions.length < value.questionCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Add at least ${value.questionCount} custom questions (you have ${value.questions.length})`,
        path: ["questions"],
      })
    }
  })

export type QuickTestConfigInput = z.infer<typeof quickTestConfigSchema>

export type QuickTestCandidateState = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

export function computeExpiresAt(startedAtSeconds: number, timeLimitMinutes: number): number {
  return startedAtSeconds + timeLimitMinutes * 60
}

export function getRemainingSeconds(expiresAt: bigint | number, nowSec: number = nowSeconds()): number {
  return Math.max(0, Number(expiresAt) - nowSec)
}

/** True once the attempt can no longer accept answers or a submit (deadline + grace). */
export function isPastDeadline(
  expiresAt: bigint | number,
  nowSec: number = nowSeconds(),
  graceSeconds: number = QUICK_TEST_LIMITS.graceSeconds
): boolean {
  return nowSec > Number(expiresAt) + graceSeconds
}

export function isFinalStatus(status: QuickTestAttemptStatus): boolean {
  return status === "SUBMITTED" || status === "EXPIRED"
}

export function toCandidateState(status: QuickTestAttemptStatus | null | undefined): QuickTestCandidateState {
  if (!status) return "NOT_STARTED"
  return isFinalStatus(status) ? "COMPLETED" : "IN_PROGRESS"
}

export function calculatePercent(scoredPoints: number, maxPoints: number): number {
  if (maxPoints <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((scoredPoints / maxPoints) * 100)))
}

/**
 * Splits `total` questions across `buckets` as evenly as possible (earlier buckets get the remainder).
 * Used to spread a fallback question set across the job's top skills.
 */
export function distributeCount(total: number, buckets: number): number[] {
  if (buckets <= 0 || total <= 0) return []
  const base = Math.floor(total / buckets)
  const remainder = total % buckets
  return Array.from({ length: buckets }, (_, index) => base + (index < remainder ? 1 : 0)).filter(
    (count) => count > 0
  )
}

/** Equal points per question summing exactly to `maxPoints` (remainder goes to the first questions). */
export function equalPoints(count: number, maxPoints: number = QUICK_TEST_LIMITS.maxPoints): number[] {
  if (count <= 0) return []
  const base = Math.floor(maxPoints / count)
  const remainder = maxPoints - base * count
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0))
}
