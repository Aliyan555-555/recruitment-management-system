export const AI_SHORTLIST_WEIGHTS = {
  requiredSkills: 0.30,
  preferredSkills: 0.10,
  assessment: 0.20,
  education: 0.15,
  experience: 0.15,
  successCriteria: 0.10,
} as const

/**
 * Share of the overall score given to the pre-application quick test when the candidate has a score.
 * The other components are scaled to fill the remaining (1 - weight); jobs without a quick test, and
 * candidates without a score, use only the weights above.
 */
export const AI_SHORTLIST_QUICK_TEST_WEIGHT = 0.15

export const AI_SHORTLIST_THRESHOLDS = {
  shortlistMinScore: 50,
  maybeMinScore: 35,
  minConfidenceForShortlist: 45,
} as const

// Kept modest since free-tier LLM providers (e.g. OpenRouter's ":free" model
// pool) rate-limit bursts of concurrent requests and return transient errors.
export const AI_SHORTLIST_CONCURRENCY = 2

export const AI_SHORTLIST_RUN_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000,
} as const

export const AI_SHORTLIST_STALE_RUN_SECONDS = 15 * 60
