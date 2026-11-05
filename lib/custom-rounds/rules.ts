import { z } from "zod"
import { customFormSchema } from "@/lib/evaluations/custom-form"

/** Validation + serialization for organization-defined round templates (Settings > Custom job rounds). */

export const CUSTOM_ROUND_LIMITS = {
  nameMin: 2,
  nameMax: 120,
  descriptionMax: 500,
  instructionsMax: 4000,
  duration: { min: 5, max: 480, default: 30 },
  panelSize: { min: 1, max: 10 },
  buffer: { min: 0, max: 120 },
  group: { min: 1, max: 50 },
} as const

export const customRoundTemplateInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(CUSTOM_ROUND_LIMITS.nameMin, `Name must be at least ${CUSTOM_ROUND_LIMITS.nameMin} characters`)
      .max(CUSTOM_ROUND_LIMITS.nameMax, `Name can be at most ${CUSTOM_ROUND_LIMITS.nameMax} characters`),
    description: z.string().trim().max(CUSTOM_ROUND_LIMITS.descriptionMax).optional().nullable(),
    candidateInstructions: z.string().trim().max(CUSTOM_ROUND_LIMITS.instructionsMax).optional().nullable(),
    /** Scheduled like an interview (slots, bookings, interviewer pool). Off => admin decides manually. */
    isInterview: z.boolean().default(true),
    interviewMode: z.enum(["REMOTE", "ONSITE"]).optional().nullable(),
    durationMins: z
      .number()
      .int("Duration must be a whole number of minutes")
      .min(CUSTOM_ROUND_LIMITS.duration.min, `Duration must be at least ${CUSTOM_ROUND_LIMITS.duration.min} minutes`)
      .max(CUSTOM_ROUND_LIMITS.duration.max, `Duration can be at most ${CUSTOM_ROUND_LIMITS.duration.max} minutes`)
      .optional()
      .nullable(),
    panelSize: z.number().int().min(CUSTOM_ROUND_LIMITS.panelSize.min).max(CUSTOM_ROUND_LIMITS.panelSize.max).default(1),
    bufferMins: z.number().int().min(CUSTOM_ROUND_LIMITS.buffer.min).max(CUSTOM_ROUND_LIMITS.buffer.max).default(0),
    capacityPerSlot: z.number().int().min(CUSTOM_ROUND_LIMITS.group.min).max(CUSTOM_ROUND_LIMITS.group.max).default(1),
    evaluation: customFormSchema,
    isActive: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.isInterview && (value.durationMins === undefined || value.durationMins === null)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Interview rounds need a duration", path: ["durationMins"] })
    }
  })

export type CustomRoundTemplateInput = z.infer<typeof customRoundTemplateInputSchema>

export type CustomRoundParseResult =
  | { ok: true; value: CustomRoundTemplateInput }
  | { ok: false; error: string }

export function parseCustomRoundTemplateInput(raw: unknown): CustomRoundParseResult {
  const parsed = customRoundTemplateInputSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.errors[0]
    const where = issue?.path.length ? `${issue.path.join(".")}: ` : ""
    return { ok: false, error: `${where}${issue?.message ?? "Invalid round"}` }
  }
  const value = parsed.data
  // A non-scheduled round carries no scheduling settings at all.
  if (!value.isInterview) {
    return { ok: true, value: { ...value, interviewMode: null, durationMins: null, panelSize: 1, bufferMins: 0, capacityPerSlot: 1 } }
  }
  return { ok: true, value }
}

export function serializeCustomRoundTemplate(row: {
  id: bigint
  name: string
  description: string | null
  candidateInstructions: string | null
  isInterview: boolean
  interviewMode: string | null
  durationMins: number | null
  panelSize: number
  bufferMins: number
  capacityPerSlot: number
  evaluationSchema: unknown
  isActive: boolean
  createdAt: bigint
  updatedAt: bigint
}) {
  const schema = (row.evaluationSchema ?? {}) as { fields?: unknown[]; recommendationEnabled?: boolean }
  return {
    id: row.id.toString(),
    name: row.name,
    description: row.description,
    candidateInstructions: row.candidateInstructions,
    isInterview: row.isInterview,
    interviewMode: row.interviewMode as "REMOTE" | "ONSITE" | null,
    durationMins: row.durationMins,
    panelSize: row.panelSize,
    bufferMins: row.bufferMins,
    capacityPerSlot: row.capacityPerSlot,
    evaluation: {
      fields: Array.isArray(schema.fields) ? schema.fields : [],
      recommendationEnabled: schema.recommendationEnabled !== false,
    },
    isActive: row.isActive,
    createdAt: row.createdAt.toString(),
    updatedAt: row.updatedAt.toString(),
  }
}
