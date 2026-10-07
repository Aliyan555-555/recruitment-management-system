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

export const quickTestConfigSchema = z.object({
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
