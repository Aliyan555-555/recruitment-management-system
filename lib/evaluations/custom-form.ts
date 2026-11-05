import { z } from "zod"

/**
 * Interviewer rating forms for organization-defined (custom) rounds.
 *
 * The form definition lives on the round template and is snapshotted onto `WorkflowStep.evaluationSchema`.
 * A submitted scorecard is stored as
 *   { custom: { [fieldKey]: value }, customScore: { total, max }, recommendedToHire?, comments? }
 * so scoring/aggregation never needs the definition again.
 */

export const CUSTOM_FORM_LIMITS = {
  maxFields: 30,
  labelMax: 120,
  maxRating: 100,
  maxOptions: 12,
  optionMax: 80,
} as const

export const CUSTOM_FIELD_TYPES = ["RATING", "NUMBER", "TEXT", "SELECT", "BOOLEAN"] as const
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number]

const fieldKey = z
  .string()
  .trim()
  .min(1, "Every field needs a key")
  .max(40)
  .regex(/^[A-Za-z][A-Za-z0-9_]*$/, "Field keys must start with a letter and use letters, numbers or _")

export const customFormFieldSchema = z
  .object({
    key: fieldKey,
    label: z.string().trim().min(1, "Every field needs a label").max(CUSTOM_FORM_LIMITS.labelMax),
    type: z.enum(CUSTOM_FIELD_TYPES),
    required: z.boolean().default(true),
    /** RATING: highest allowed rating (lowest is 1). NUMBER: highest allowed value (lowest is 0). */
    max: z.number().int().min(1).max(CUSTOM_FORM_LIMITS.maxRating).optional(),
    /** Multiplies RATING/NUMBER values in the total score. */
    weight: z.number().min(0).max(100).default(1),
    options: z.array(z.string().trim().min(1).max(CUSTOM_FORM_LIMITS.optionMax)).max(CUSTOM_FORM_LIMITS.maxOptions).optional(),
  })
  .superRefine((field, ctx) => {
    if ((field.type === "RATING" || field.type === "NUMBER") && field.max === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `"${field.label}" needs a maximum value`, path: ["max"] })
    }
    if (field.type === "SELECT") {
      const options = field.options ?? []
      if (options.length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `"${field.label}" needs at least 2 options`, path: ["options"] })
      } else if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `"${field.label}" has duplicate options`, path: ["options"] })
      }
    }
  })

export const customFormSchema = z
  .object({
    fields: z.array(customFormFieldSchema).max(CUSTOM_FORM_LIMITS.maxFields, `At most ${CUSTOM_FORM_LIMITS.maxFields} fields`),
    recommendationEnabled: z.boolean().default(true),
  })
  .superRefine((form, ctx) => {
    const seen = new Set<string>()
    form.fields.forEach((field, index) => {
      const key = field.key.toLowerCase()
      if (seen.has(key)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate field key "${field.key}"`, path: ["fields", index, "key"] })
      }
      seen.add(key)
    })
    if (form.fields.length === 0 && !form.recommendationEnabled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one field or enable the hire recommendation",
        path: ["fields"],
      })
    }
  })

export type CustomFormField = z.infer<typeof customFormFieldSchema>
export type CustomFormSchema = z.infer<typeof customFormSchema>

/** Reads a stored definition; null when absent or malformed (callers fall back to a recommendation-only form). */
export function parseCustomFormSchema(raw: unknown): CustomFormSchema | null {
  const parsed = customFormSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export const DEFAULT_CUSTOM_FORM: CustomFormSchema = { fields: [], recommendationEnabled: true }

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "")
}

/** Returns the first problem with a submitted scorecard, or null when it is complete and in range. */
export function validateCustomForm(form: CustomFormSchema, formData: any): string | null {
  if (!formData || typeof formData !== "object") return "Form data is required"
  const values: Record<string, unknown> = formData.custom && typeof formData.custom === "object" ? formData.custom : {}

  for (const field of form.fields) {
    const value = values[field.key]
    if (isBlank(value)) {
      if (field.required) return `"${field.label}" is required`
      continue
    }
    switch (field.type) {
      case "RATING": {
        const n = Number(value)
        if (!Number.isInteger(n) || n < 1 || n > field.max!) return `"${field.label}" must be a rating from 1 to ${field.max}`
        break
      }
      case "NUMBER": {
        const n = Number(value)
        if (!Number.isFinite(n) || n < 0 || n > field.max!) return `"${field.label}" must be between 0 and ${field.max}`
        break
      }
      case "SELECT":
        if (typeof value !== "string" || !field.options!.includes(value)) return `"${field.label}" has an invalid choice`
        break
      case "BOOLEAN":
        if (typeof value !== "boolean") return `"${field.label}" must be yes or no`
        break
      case "TEXT":
        if (typeof value !== "string") return `"${field.label}" must be text`
        if (value.length > 2000) return `"${field.label}" is too long (2000 characters max)`
        break
    }
  }

  if (form.recommendationEnabled && isBlank(formData.recommendedToHire)) return "Recommendation is required"
  return null
}

export interface CustomScore {
  total: number
  max: number
}

/** Weighted total of the RATING/NUMBER fields that were answered. Unanswered optional fields do not count against the max. */
export function scoreCustomForm(form: CustomFormSchema, formData: any): CustomScore {
  const values: Record<string, unknown> = formData?.custom && typeof formData.custom === "object" ? formData.custom : {}
  let total = 0
  let max = 0
  for (const field of form.fields) {
    if (field.type !== "RATING" && field.type !== "NUMBER") continue
    const value = values[field.key]
    if (isBlank(value)) continue
    total += Number(value) * field.weight
    max += field.max! * field.weight
  }
  return { total: Math.round(total * 100) / 100, max: Math.round(max * 100) / 100 }
}

/** Copies only declared fields into the stored scorecard (drops anything the client invented) and records the score. */
export function normalizeCustomFormData(form: CustomFormSchema, formData: any) {
  const input: Record<string, unknown> = formData?.custom && typeof formData.custom === "object" ? formData.custom : {}
  const custom: Record<string, unknown> = {}
  for (const field of form.fields) {
    const value = input[field.key]
    if (isBlank(value)) continue
    custom[field.key] = field.type === "RATING" || field.type === "NUMBER" ? Number(value) : value
  }
  const score = scoreCustomForm(form, { custom })
  return {
    custom,
    customScore: score,
    ...(form.recommendationEnabled ? { recommendedToHire: formData.recommendedToHire } : {}),
    ...(typeof formData?.comments === "string" && formData.comments.trim() ? { comments: formData.comments.trim().slice(0, 4000) } : {}),
  }
}
