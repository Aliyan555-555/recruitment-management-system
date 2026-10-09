import { Prisma } from "@prisma/client"
import { INTERVIEW_STEP_TYPES, isInterviewStepType, parseStepMetadata, validateStepConfig } from "./step-config"

/**
 * Shared server-side handling of workflow step payloads (job create + job update).
 * The job builder UI sends `WorkflowStepPayload`; this module validates it, maps it onto
 * WorkflowStep columns / stepMetadata and keeps the StepInterviewer pool in sync.
 */

export const STEP_TYPES = ["TEST", "SCREENING_INTERVIEW", "FOCUS_GROUP", "FINAL_INTERVIEW", "OFFER"] as const
export type StepTypeValue = (typeof STEP_TYPES)[number]

const STEP_NAMES: Record<StepTypeValue, string> = {
  TEST: "Test",
  SCREENING_INTERVIEW: "Screening Interview",
  FOCUS_GROUP: "Focus Group",
  FINAL_INTERVIEW: "Final Interview",
  OFFER: "Offer",
}

export interface WorkflowStepPayload {
  /** existing WorkflowStep id when editing; absent for new steps */
  id?: string
  stepType: string
  stepOrder: number
  isRequired?: boolean
  interviewMode?: string | null
  durationMins?: number | null
  panelSize?: number | null
  /** candidates per slot (focus group); stored in capacityPerSlot */
  groupSize?: number | null
  bufferMins?: number | null
  meetingLink?: string | null
  location?: string | null
  candidateInstructions?: string | null
  interviewerInstructions?: string | null
  weightage?: number | null
  scoreThreshold?: number | null
  skipReason?: string | null
  routeVisibility?: string[]
  evaluationCriteria?: string[]
  attachments?: Array<{ id: string; fileName: string; fileSize: number; fileType: string; access: string[] }>
  interviewerIds?: string[]
}

export interface NormalizedStep extends WorkflowStepPayload {
  stepType: StepTypeValue
  isRequired: boolean
  interviewMode: "REMOTE" | "ONSITE" | null
  panelSize: number
  groupSize: number
  bufferMins: number
  interviewerIds: string[]
}

export function isStepType(value: unknown): value is StepTypeValue {
  return typeof value === "string" && (STEP_TYPES as readonly string[]).includes(value)
}

function cleanString(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null
}

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

/** Normalizes loose UI input ("Remote", "30", missing flags) into a canonical step. */
export function normalizeStep(raw: WorkflowStepPayload): NormalizedStep {
  const stepType = raw.stepType as StepTypeValue
  const interview = isInterviewStepType(stepType)
  const modeRaw = typeof raw.interviewMode === "string" ? raw.interviewMode.toUpperCase() : ""
  const mode = interview && (modeRaw === "REMOTE" || modeRaw === "ONSITE") ? modeRaw : null

  const defaultPanel = stepType === "FOCUS_GROUP" ? 2 : 1
  return {
    ...raw,
    stepType,
    // Offer is always mandatory; everything else can be made optional by the admin.
    isRequired: stepType === "OFFER" ? true : raw.isRequired !== false,
    interviewMode: mode,
    durationMins: interview ? toInt(raw.durationMins) : null,
    panelSize: interview ? toInt(raw.panelSize) ?? defaultPanel : 1,
    groupSize: interview ? toInt(raw.groupSize) ?? 1 : 1,
    bufferMins: interview ? toInt(raw.bufferMins) ?? 0 : 0,
    meetingLink: mode === "REMOTE" ? cleanString(raw.meetingLink) : null,
    location: mode === "ONSITE" ? cleanString(raw.location) : null,
    interviewerIds: interview ? Array.from(new Set((raw.interviewerIds ?? []).map(String).filter((id) => /^\d+$/.test(id)))) : [],
  }
}

/** Returns the first human-readable problem with the whole workflow, or null when valid. */
export function validateWorkflow(rawSteps: WorkflowStepPayload[]): string | null {
  if (!Array.isArray(rawSteps) || rawSteps.length === 0) return "Workflow must have at least one step"

  const orders = rawSteps.map((s) => s.stepOrder).sort((a, b) => a - b)
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i + 1) return "Step orders must be sequential starting from 1"
  }

  const sorted = [...rawSteps].sort((a, b) => a.stepOrder - b.stepOrder)
  for (const s of sorted) {
    if (!isStepType(s.stepType)) return `Step ${s.stepOrder}: Invalid step type. Must be one of: ${STEP_TYPES.join(", ")}`
  }
  const seen = new Set<string>()
  for (const s of sorted) {
    if (seen.has(s.stepType)) return `Step ${s.stepOrder}: ${STEP_NAMES[s.stepType as StepTypeValue]} can only be used once`
    seen.add(s.stepType)
  }

  const offerIndex = sorted.findIndex((s) => s.stepType === "OFFER")
  if (offerIndex === -1) return "Offer step is mandatory and must be the last step in the workflow"
  if (offerIndex !== sorted.length - 1) return `Step ${sorted[offerIndex].stepOrder}: Offer step must be the last step in the workflow`

  for (const s of sorted) {
    const n = normalizeStep(s)
    const problems = validateStepConfig({
      stepType: n.stepType,
      interviewMode: n.interviewMode,
      durationMins: n.durationMins,
      panelSize: n.panelSize,
      groupSize: n.groupSize,
      bufferMins: n.bufferMins,
      meetingLink: n.meetingLink,
      location: n.location,
      interviewerIds: n.interviewerIds,
    })
    if (problems.length > 0) return `Step ${s.stepOrder} (${STEP_NAMES[n.stepType]}): ${problems[0]}`
  }
  return null
}

/** Columns for WorkflowStep create/update. */
export function buildStepColumns(step: NormalizedStep) {
  const interview = isInterviewStepType(step.stepType)
  return {
    stepName: STEP_NAMES[step.stepType],
    stepType: step.stepType,
    stepOrder: step.stepOrder,
    isRequired: step.isRequired,
    // optional steps can be skipped by an admin for individual candidates
    isSkippable: !step.isRequired,
    interviewMode: step.interviewMode,
    durationMins: interview ? step.durationMins : null,
    panelSize: step.panelSize,
    bufferMins: step.bufferMins,
    capacityPerSlot: interview ? step.groupSize : null,
  }
}

/** Keys that moved to real columns / StepInterviewer and must not linger in stepMetadata. */
const LEGACY_METADATA_KEYS = ["durationMins", "interviewMode", "interviewerIds", "interviewerId", "stepType"]

export function buildStepMetadata(step: NormalizedStep, previous?: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  const meta: Record<string, unknown> = { ...parseStepMetadata(previous) }
  for (const key of LEGACY_METADATA_KEYS) delete meta[key]

  const assign = (key: string, value: unknown) => {
    if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) delete meta[key]
    else meta[key] = value
  }
  assign("meetingLink", step.meetingLink)
  assign("location", step.location)
  assign("candidateInstructions", cleanString(step.candidateInstructions))
  assign("interviewerInstructions", cleanString(step.interviewerInstructions))
  assign("weightage", step.weightage ?? undefined)
  assign("scoreThreshold", step.scoreThreshold ?? undefined)
  assign("skipReason", cleanString(step.skipReason))
  if (step.routeVisibility !== undefined) assign("routeVisibility", step.routeVisibility)
  if (step.evaluationCriteria !== undefined) assign("evaluationCriteria", step.evaluationCriteria)
  if (step.attachments !== undefined) {
    assign(
      "attachments",
      step.attachments.map((a) => ({ id: a.id, fileName: a.fileName, fileSize: a.fileSize, fileType: a.fileType, access: a.access }))
    )
  }

  return Object.keys(meta).length > 0 ? (meta as Prisma.InputJsonValue) : Prisma.DbNull
}

/**
 * Makes the StepInterviewer pool equal to `interviewerIds`. Only active INTERVIEWER users are accepted.
 * Throws a plain Error (message is user-presentable) on unknown ids.
 */
export async function syncStepInterviewers(
  tx: Prisma.TransactionClient,
  stepId: bigint,
  interviewerIds: string[],
  nowSeconds: bigint
): Promise<void> {
  const ids = interviewerIds.map((id) => BigInt(id))
  if (ids.length > 0) {
    const valid = await tx.user.findMany({
      where: { id: { in: ids }, role: "INTERVIEWER", suspended: false, deletedAt: null },
      select: { id: true },
    })
    if (valid.length !== ids.length) throw new Error("One or more selected interviewers are not available")
  }

  await tx.stepInterviewer.deleteMany({ where: { stepId, interviewerId: { notIn: ids } } })
  if (ids.length > 0) {
    await tx.stepInterviewer.createMany({
      data: ids.map((interviewerId) => ({ stepId, interviewerId, createdAt: nowSeconds })),
      skipDuplicates: true,
    })
  }
}

export { INTERVIEW_STEP_TYPES }
