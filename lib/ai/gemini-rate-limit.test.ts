import test from "node:test"
import assert from "node:assert/strict"
import { parseGeminiRateLimit } from "./gemini-rate-limit"

const body = (violations: object[], retryDelay?: string) =>
  JSON.stringify({
    error: {
      code: 429,
      status: "RESOURCE_EXHAUSTED",
      details: [
        { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations },
        ...(retryDelay ? [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay }] : []),
      ],
    },
  })

test("per-minute limit returns the requested retry delay", () => {
  const r = parseGeminiRateLimit(
    body([{ quotaMetric: "generativelanguage.googleapis.com/generate_content_free_tier_requests", quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier" }], "37s")
  )
  assert.deepEqual(r, { retryAfterMs: 37000, dailyQuota: false })
})

test("per-day quota is detected", () => {
  const r = parseGeminiRateLimit(
    body([{ quotaMetric: "generativelanguage.googleapis.com/generate_content_free_tier_requests", quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }], "3s")
  )
  assert.equal(r.dailyQuota, true)
})

test("non-JSON bodies do not throw", () => {
  assert.deepEqual(parseGeminiRateLimit("Too Many Requests"), { retryAfterMs: null, dailyQuota: false })
})
