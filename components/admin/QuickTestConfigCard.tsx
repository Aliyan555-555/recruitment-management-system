"use client"

import { Timer, ListChecks, Sparkles } from "lucide-react"
import { QUICK_TEST_LIMITS } from "@/lib/quick-test/rules"

export interface QuickTestFormValue {
  enabled: boolean
  questionCount: number | ""
  timeLimitMinutes: number | ""
}

export const DEFAULT_QUICK_TEST_FORM: QuickTestFormValue = {
  enabled: false,
  questionCount: QUICK_TEST_LIMITS.questionCount.default,
  timeLimitMinutes: QUICK_TEST_LIMITS.timeLimitMinutes.default,
}

/** Returns an error message, or null when the (enabled) quick test settings are valid. */
export function validateQuickTestForm(value: QuickTestFormValue): string | null {
  if (!value.enabled) return null
  const { questionCount: q, timeLimitMinutes: t } = QUICK_TEST_LIMITS
  if (!Number.isInteger(value.questionCount) || (value.questionCount as number) < q.min || (value.questionCount as number) > q.max) {
    return `Number of questions must be between ${q.min} and ${q.max}`
  }
  if (!Number.isInteger(value.timeLimitMinutes) || (value.timeLimitMinutes as number) < t.min || (value.timeLimitMinutes as number) > t.max) {
    return `Time limit must be between ${t.min} and ${t.max} minutes`
  }
  return null
}

/** Payload for the admin job create/update APIs. */
export function toQuickTestPayload(value: QuickTestFormValue) {
  return {
    enabled: value.enabled,
    questionCount: Number(value.questionCount) || QUICK_TEST_LIMITS.questionCount.default,
    timeLimitMinutes: Number(value.timeLimitMinutes) || QUICK_TEST_LIMITS.timeLimitMinutes.default,
  }
}

interface QuickTestConfigCardProps {
  value: QuickTestFormValue
  onChange: (value: QuickTestFormValue) => void
  error?: string | null
}

const inputClass =
  "w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"

export function QuickTestConfigCard({ value, onChange, error }: QuickTestConfigCardProps) {
  const parse = (raw: string): number | "" => (raw === "" ? "" : Number(raw))

  return (
    <div
      className="bg-card rounded-lg shadow p-6 border border-border"
      data-error={error ? "true" : "false"}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Quick Test <span className="text-xs font-normal text-muted-foreground">(before applying)</span>
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Candidates take a short, timed, AI-generated test based on this job before their application is
            submitted. They get one attempt, and the score is used in AI shortlisting (15% of the match score).
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={value.enabled}
          aria-label="Require a quick test before applying"
          onClick={() => onChange({ ...value, enabled: !value.enabled })}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            value.enabled ? "bg-primary" : "bg-muted-foreground/30"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              value.enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {value.enabled && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              Number of questions
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={QUICK_TEST_LIMITS.questionCount.min}
              max={QUICK_TEST_LIMITS.questionCount.max}
              value={value.questionCount}
              onChange={(e) => onChange({ ...value, questionCount: parse(e.target.value) })}
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {QUICK_TEST_LIMITS.questionCount.min}-{QUICK_TEST_LIMITS.questionCount.max} multiple choice questions
            </p>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1">
              <Timer className="h-4 w-4 text-muted-foreground" />
              Time limit (minutes)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={QUICK_TEST_LIMITS.timeLimitMinutes.min}
              max={QUICK_TEST_LIMITS.timeLimitMinutes.max}
              value={value.timeLimitMinutes}
              onChange={(e) => onChange({ ...value, timeLimitMinutes: parse(e.target.value) })}
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {QUICK_TEST_LIMITS.timeLimitMinutes.min}-{QUICK_TEST_LIMITS.timeLimitMinutes.max} minutes. The timer starts
              when the candidate begins.
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
    </div>
  )
}
