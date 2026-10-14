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

/**
 * ATS-first funnel: every candidate that passes the hard filters gets a free deterministic ATS score;
 * only the best `AI_TOP_K` (with at least `AI_MIN_ATS_SCORE`) are sent to the AI, `AI_BATCH_SIZE` per
 * request. Everyone else keeps their ATS ranking and can be AI-scored on demand.
 */
export const AI_SHORTLIST_FUNNEL = {
  topK: 20,
  maxTopK: 100,
  minAtsScore: 40,
  batchSize: 5,
} as const

/** Weights of the deterministic ATS score (lib/ai-shortlist/ats-score.ts); renormalised over present data. */
export const ATS_WEIGHTS = {
  requiredSkills: 0.30,
  preferredSkills: 0.10,
  assessment: 0.15,
  quickTest: 0.10,
  experience: 0.15,
  education: 0.10,
  completeness: 0.10,
} as const

// Batches run one at a time; the AI client additionally paces every request (see AI_REQUESTS_PER_MINUTE).
export const AI_SHORTLIST_CONCURRENCY = 1

export const AI_SHORTLIST_RUN_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000,
} as const

export const AI_SHORTLIST_STALE_RUN_SECONDS = 15 * 60
