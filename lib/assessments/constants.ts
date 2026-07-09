export const GLOBAL_SKILL_CONFIG_KEY = "__GLOBAL__"

/** Per-user limit on POST /api/assessments/start (AI generation cost control) */
export const ASSESSMENT_START_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000,
} as const
