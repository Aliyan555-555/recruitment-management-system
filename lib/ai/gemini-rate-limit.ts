/**
 * Reads a Gemini 429 body: the RetryInfo delay ("37s") and whether a per-day quota was hit.
 */
export function parseGeminiRateLimit(errorText: string): { retryAfterMs: number | null; dailyQuota: boolean } {
  let retryAfterMs: number | null = null
  let dailyQuota = false
  try {
    const details: any[] = JSON.parse(errorText)?.error?.details ?? []
    for (const d of details) {
      const type = String(d?.["@type"] ?? "")
      if (type.endsWith("RetryInfo") && typeof d.retryDelay === "string") {
        const secs = parseFloat(d.retryDelay)
        if (Number.isFinite(secs)) retryAfterMs = Math.ceil(secs * 1000)
      }
      if (type.endsWith("QuotaFailure")) {
        for (const v of d.violations ?? []) {
          if (/per ?day|PerDay/i.test(`${v?.quotaId ?? ""} ${v?.quotaMetric ?? ""}`)) dailyQuota = true
        }
      }
    }
  } catch {
    // not JSON: fall through to text heuristics
  }
  if (!dailyQuota && /PerDay|per day/i.test(errorText)) dailyQuota = true
  return { retryAfterMs, dailyQuota }
}
