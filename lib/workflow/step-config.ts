import { z } from "zod"

/**
 * Typed view over a WorkflowStep.
 *
 * Scheduling-critical settings live in real columns (interviewMode, durationMins, panelSize,
 * bufferMins, capacityPerSlot). Everything else (instructions, default meeting link, ...) stays in the
 * untyped `stepMetadata` JSON; this module is the single place that reads it.
 */

export const INTERVIEW_STEP_TYPES = ["SCREENING_INTERVIEW", "FOCUS_GROUP", "FINAL_INTERVIEW"] as const
export type InterviewStepType = (typeof INTERVIEW_STEP_TYPES)[number]

export function isInterviewStepType(stepType: string | null | undefined): stepType is InterviewStepType {
  return !!stepType && (INTERVIEW_STEP_TYPES as readonly string[]).includes(stepType)
}

const optionalString = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().optional()
)

export const stepMetadataSchema = z
  .object({
    stepType: optionalString.catch(undefined),
    meetingLink: optionalString.catch(undefined),
    location: optionalString.catch(undefined),
    candidateInstructions: optionalString.catch(undefined),
    interviewerInstructions: optionalString.catch(undefined),
    weightage: z.coerce.number().min(0).max(100).optional().catch(undefined),
    scoreThreshold: z.coerce.number().min(0).max(100).optional().catch(undefined),
    skipReason: optionalString.catch(undefined),
  })
  .passthrough()

export type StepMetadata = z.infer<typeof stepMetadataSchema>

export function parseStepMetadata(raw: unknown): StepMetadata {
  const parsed = stepMetadataSchema.safeParse(raw && typeof raw === "object" ? raw : {})
  return parsed.success ? parsed.data : {}
}

export type InterviewModeValue = "REMOTE" | "ONSITE"

export interface StepConfigInput {
  stepType?: string | null
  isRequired: boolean
  interviewMode?: InterviewModeValue | null
  durationMins?: number | null
  panelSize?: number | null
  bufferMins?: number | null
  capacityPerSlot?: number | null
  stepMetadata?: unknown
}

export interface StepConfig {
  stepType: string | null
  isInterview: boolean
  isRequired: boolean
  interviewMode: InterviewModeValue | null
  durationMins: number
  panelSize: number
  bufferMins: number
  /** candidates per slot: 1 for 1:1 interviews, group size for a focus group */
  groupSize: number
  meetingLink: string | null
  location: string | null
  candidateInstructions: string | null
  interviewerInstructions: string | null
}

export const DEFAULT_INTERVIEW_DURATION_MINS = 30

function normalizeMode(value: unknown): InterviewModeValue | null {
  const v = typeof value === "string" ? value.toUpperCase() : ""
  return v === "REMOTE" || v === "ONSITE" ? v : null
}

export function readStepConfig(step: StepConfigInput): StepConfig {
  const meta = parseStepMetadata(step.stepMetadata)
  const stepType = (step.stepType as string | null | undefined) ?? meta.stepType ?? null
  const isInterview = isInterviewStepType(stepType)
  const panelSize = Math.max(1, step.panelSize ?? 1)
  const groupSize = isInterview ? Math.max(1, step.capacityPerSlot ?? 1) : 1
  const legacyDuration = Number((step.stepMetadata as any)?.durationMins)

  return {
    stepType,
    isInterview,
    isRequired: step.isRequired,
    interviewMode: step.interviewMode ?? normalizeMode((step.stepMetadata as any)?.interviewMode),
    durationMins:
      step.durationMins ??
      (Number.isFinite(legacyDuration) && legacyDuration > 0 ? legacyDuration : DEFAULT_INTERVIEW_DURATION_MINS),
    panelSize,
    bufferMins: Math.max(0, step.bufferMins ?? 0),
    groupSize,
    meetingLink: meta.meetingLink ?? null,
    location: meta.location ?? null,
    candidateInstructions: meta.candidateInstructions ?? null,
    interviewerInstructions: meta.interviewerInstructions ?? null,
  }
}

/** Fields safe to expose on public (unauthenticated) job pages: never links, interviewers or staff notes. */
export function toPublicStep(step: StepConfigInput) {
  const cfg = readStepConfig(step)
  return {
    stepType: cfg.stepType,
    isRequired: cfg.isRequired,
    interviewMode: cfg.isInterview ? cfg.interviewMode : null,
    durationMins: cfg.isInterview ? cfg.durationMins : null,
  }
}

/** Validation shared by the job builder API: returns a list of human readable problems. */
export function validateStepConfig(step: {
  stepType?: string | null
  interviewMode?: string | null
  durationMins?: number | null
  panelSize?: number | null
  groupSize?: number | null
  bufferMins?: number | null
  meetingLink?: string | null
  location?: string | null
  interviewerIds?: Array<string | number | bigint> | null
}): string[] {
  const errors: string[] = []
  if (!isInterviewStepType(step.stepType)) return errors

  if (step.interviewMode !== "REMOTE" && step.interviewMode !== "ONSITE") {
    errors.push("Interview mode (Remote or Onsite) is required")
  }
  const duration = step.durationMins ?? 0
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
    errors.push("Duration must be between 5 and 480 minutes")
  }
  const panel = step.panelSize ?? 1
  if (!Number.isInteger(panel) || panel < 1 || panel > 10) errors.push("Panel size must be between 1 and 10")
  if (step.stepType === "SCREENING_INTERVIEW" && panel !== 1) errors.push("Screening uses exactly one interviewer")
  if (step.stepType === "FOCUS_GROUP" && panel < 2) errors.push("Focus group needs at least 2 interviewers")
  const group = step.groupSize ?? 1
  if (!Number.isInteger(group) || group < 1 || group > 50) errors.push("Group size must be between 1 and 50")
  if (step.stepType !== "FOCUS_GROUP" && group !== 1) {
    errors.push("Only a focus group can have more than one candidate per slot")
  }
  const buffer = step.bufferMins ?? 0
  if (!Number.isInteger(buffer) || buffer < 0 || buffer > 120) errors.push("Buffer must be between 0 and 120 minutes")
  if (step.interviewMode === "REMOTE" && !step.meetingLink?.trim()) errors.push("Meeting link is required for remote interviews")
  if (step.interviewMode === "ONSITE" && !step.location?.trim()) errors.push("Location is required for onsite interviews")
  if (step.interviewMode === "REMOTE" && step.meetingLink) {
    try {
      const u = new URL(step.meetingLink)
      if (u.protocol !== "https:" && u.protocol !== "http:") errors.push("Meeting link must be an http(s) URL")
    } catch {
      errors.push("Meeting link must be a valid URL")
    }
  }
  const pool = new Set((step.interviewerIds ?? []).map(String))
  if (pool.size > 0 && pool.size < panel) {
    errors.push(`Interviewer pool (${pool.size}) is smaller than the panel size (${panel})`)
  }
  return errors
}
