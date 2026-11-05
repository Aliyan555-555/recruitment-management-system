"use client"

import { Timer, ListChecks, Sparkles, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import {
  CUSTOM_QUESTION_LIMITS,
  QUICK_TEST_LIMITS,
  customQuestionSchema,
  quickTestConfigSchema,
} from "@/lib/quick-test/rules"

export type QuickTestSource = "AI" | "CUSTOM"

export interface CustomQuestionFormValue {
  question: string
  options: string[]
  /** Index into `options`; null until the admin picks the right answer. */
  correctIndex: number | null
}

export interface QuickTestFormValue {
  enabled: boolean
  questionCount: number | ""
  timeLimitMinutes: number | ""
  source: QuickTestSource
  questions: CustomQuestionFormValue[]
}

export const createEmptyCustomQuestion = (): CustomQuestionFormValue => ({
  question: "",
  options: Array.from({ length: CUSTOM_QUESTION_LIMITS.optionCount }, () => ""),
  correctIndex: null,
})

export const DEFAULT_QUICK_TEST_FORM: QuickTestFormValue = {
  enabled: false,
  questionCount: QUICK_TEST_LIMITS.questionCount.default,
  timeLimitMinutes: QUICK_TEST_LIMITS.timeLimitMinutes.default,
  source: "AI",
  questions: [],
}

/** Maps the quick test object returned by the admin job APIs into form state. */
export function quickTestFormFromApi(config?: {
  enabled?: boolean
  questionCount?: number
  timeLimitMinutes?: number
  source?: QuickTestSource
  questions?: Array<{ question: string; options: string[]; correct: string }>
} | null): QuickTestFormValue {
  if (!config) return { ...DEFAULT_QUICK_TEST_FORM }
  return {
    enabled: Boolean(config.enabled),
    questionCount: config.questionCount ?? DEFAULT_QUICK_TEST_FORM.questionCount,
    timeLimitMinutes: config.timeLimitMinutes ?? DEFAULT_QUICK_TEST_FORM.timeLimitMinutes,
    source: config.source === "CUSTOM" ? "CUSTOM" : "AI",
    questions: (config.questions ?? []).map((item) => {
      const index = item.options.indexOf(item.correct)
      return { question: item.question, options: [...item.options], correctIndex: index >= 0 ? index : null }
    }),
  }
}

const toCustomPayload = (item: CustomQuestionFormValue) => ({
  question: item.question.trim(),
  options: item.options.map((option) => option.trim()),
  correct: item.correctIndex === null ? "" : (item.options[item.correctIndex] ?? "").trim(),
})

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
  if (value.source === "CUSTOM") {
    for (const [index, item] of value.questions.entries()) {
      if (item.correctIndex === null) return `Question ${index + 1}: select the correct answer`
      const parsed = customQuestionSchema.safeParse(toCustomPayload(item))
      if (!parsed.success) return `Question ${index + 1}: ${parsed.error.errors[0]?.message ?? "invalid question"}`
    }
    // Catches duplicates and a bank smaller than the number of questions candidates answer.
    const parsed = quickTestConfigSchema.safeParse(toQuickTestPayload(value))
    if (!parsed.success) return parsed.error.errors[0]?.message ?? "Invalid custom questions"
  }
  return null
}

/** Payload for the admin job create/update APIs. */
export function toQuickTestPayload(value: QuickTestFormValue) {
  return {
    enabled: value.enabled,
    questionCount: Number(value.questionCount) || QUICK_TEST_LIMITS.questionCount.default,
    timeLimitMinutes: Number(value.timeLimitMinutes) || QUICK_TEST_LIMITS.timeLimitMinutes.default,
    source: value.source,
    questions: value.source === "CUSTOM" ? value.questions.map(toCustomPayload) : [],
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

  const updateQuestion = (index: number, patch: Partial<CustomQuestionFormValue>) =>
    onChange({
      ...value,
      questions: value.questions.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    })

  const updateOption = (index: number, optionIndex: number, text: string) => {
    const item = value.questions[index]!
    updateQuestion(index, { options: item.options.map((option, i) => (i === optionIndex ? text : option)) })
  }

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= value.questions.length) return
    const next = [...value.questions]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    onChange({ ...value, questions: next })
  }

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
            Candidates take a short, timed multiple choice test for this job before their application is
            submitted. Questions are either AI-generated from the job or written by you. They get one attempt,
            and the score is used in AI shortlisting (15% of the match score).
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
              {value.source === "CUSTOM" ? " drawn from your question bank" : ""}
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

          <div className="sm:col-span-2">
            <span className="block text-sm font-medium text-foreground mb-2">Question source</span>
            <div className="inline-flex rounded-md border border-input overflow-hidden" role="radiogroup">
              {(
                [
                  { id: "AI", label: "AI-generated" },
                  { id: "CUSTOM", label: "My own questions" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={value.source === option.id}
                  onClick={() => onChange({ ...value, source: option.id })}
                  className={`px-4 py-2 text-sm transition-colors ${
                    value.source === option.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {value.source === "AI"
                ? "Questions are generated from the job title, description and skills when each candidate starts."
                : "AI is not used. Every candidate gets questions from the bank below; if the bank is larger than the number of questions, a random selection is used."}
            </p>
          </div>
        </div>
      )}

      {value.enabled && value.source === "CUSTOM" && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              Question bank{" "}
              <span className="font-normal text-muted-foreground">
                ({value.questions.length} added, {value.questionCount || QUICK_TEST_LIMITS.questionCount.default} needed)
              </span>
            </h4>
            <button
              type="button"
              onClick={() => onChange({ ...value, questions: [...value.questions, createEmptyCustomQuestion()] })}
              disabled={value.questions.length >= CUSTOM_QUESTION_LIMITS.bankMax}
              className="inline-flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add question
            </button>
          </div>

          {value.questions.length === 0 && (
            <p className="rounded-md border border-dashed border-input p-4 text-sm text-muted-foreground">
              No questions yet. Add at least {value.questionCount || QUICK_TEST_LIMITS.questionCount.default}{" "}
              questions, each with {CUSTOM_QUESTION_LIMITS.optionCount} options and one correct answer.
            </p>
          )}

          {value.questions.map((item, index) => (
            <div key={index} className="rounded-md border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Question {index + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveQuestion(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move question ${index + 1} up`}
                    className="rounded p-1.5 hover:bg-muted disabled:opacity-40"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(index, 1)}
                    disabled={index === value.questions.length - 1}
                    aria-label={`Move question ${index + 1} down`}
                    className="rounded p-1.5 hover:bg-muted disabled:opacity-40"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ ...value, questions: value.questions.filter((_, i) => i !== index) })}
                    aria-label={`Remove question ${index + 1}`}
                    className="rounded p-1.5 text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <textarea
                value={item.question}
                onChange={(e) => updateQuestion(index, { question: e.target.value })}
                maxLength={CUSTOM_QUESTION_LIMITS.questionMax}
                rows={2}
                placeholder="Write the question (at least 10 characters)"
                className={inputClass}
              />

              <div className="space-y-2">
                {item.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${index}`}
                      checked={item.correctIndex === optionIndex}
                      onChange={() => updateQuestion(index, { correctIndex: optionIndex })}
                      aria-label={`Mark option ${optionIndex + 1} of question ${index + 1} as correct`}
                      className="h-4 w-4 shrink-0"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                      maxLength={CUSTOM_QUESTION_LIMITS.optionMax}
                      placeholder={`Option ${optionIndex + 1}`}
                      className={inputClass}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Select the radio next to the correct answer.</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
    </div>
  )
}
