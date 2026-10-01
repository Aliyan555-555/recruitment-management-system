export type ShortlistBlockedReason =
  | "HIRED"
  | "REJECTED"
  | "ON_HOLD"
  | "IN_LATER_ROUND"
  | "ALREADY_SHORTLISTED"

export class ShortlistIneligibleError extends Error {
  readonly ineligibleIds: string[]

  constructor(ineligibleIds: string[]) {
    super("Some candidates can no longer be shortlisted or rejected")
    this.name = "ShortlistIneligibleError"
    this.ineligibleIds = ineligibleIds
  }
}

export const SHORTLIST_PIPELINE_SELECT = {
  overallStatus: true,
  lockState: true,
  currentStepOrder: true,
  steps: {
    select: {
      stepOrder: true,
      status: true,
    },
  },
} as const

export type ShortlistQueueTab = "applied" | "shortlisted" | "rejected"

export type ShortlistPipelineInput = {
  overallStatus: string
  lockState: string
  currentStepOrder?: number | null
  currentStepStatus?: string | null
}

export type ShortlistEligibilityInput = {
  applicationStatus: string
  pipeline?: ShortlistPipelineInput | null
}

export type ShortlistEligibility = {
  actionable: boolean
  actionBlockedReason: ShortlistBlockedReason | null
  statusLabel: string
  queueTab: ShortlistQueueTab
}

const ACTIONABLE_APPLICATION_STATUSES = new Set(["APPLIED", "SUBMITTED"])
const SHORTLISTED_APPLICATION_STATUSES = new Set(["SHORTLISTED", "BATCH_ASSIGNED"])

function blocked(
  reason: ShortlistBlockedReason,
  statusLabel: string,
  queueTab: ShortlistQueueTab
): ShortlistEligibility {
  return {
    actionable: false,
    actionBlockedReason: reason,
    statusLabel,
    queueTab,
  }
}

function actionable(): ShortlistEligibility {
  return {
    actionable: true,
    actionBlockedReason: null,
    statusLabel: "Needs review",
    queueTab: "applied",
  }
}

export function formatShortlistBlockedReason(
  reason: ShortlistBlockedReason | null
): string | null {
  switch (reason) {
    case "HIRED":
      return "Hired"
    case "REJECTED":
      return "Rejected"
    case "ON_HOLD":
      return "On hold"
    case "IN_LATER_ROUND":
      return "In later round"
    case "ALREADY_SHORTLISTED":
      return "Already shortlisted"
    default:
      return null
  }
}

export function pickCurrentStepStatus(
  currentStepOrder: number | null | undefined,
  steps: Array<{ stepOrder: number; status: string }>
): string | null {
  if (!steps.length) return null
  const order = currentStepOrder ?? 1
  const current = steps.find((step) => step.stepOrder === order)
  return current?.status ?? null
}

/**
 * Job-level shortlist/reject is only allowed while the candidate is still
 * waiting at the shortlist gate. Hired, rejected, on-hold, and in-round
 * candidates must not be mutated from the shortlist screens.
 */
export function getShortlistEligibility(
  input: ShortlistEligibilityInput
): ShortlistEligibility {
  const { applicationStatus, pipeline } = input

  if (pipeline) {
    if (pipeline.overallStatus === "COMPLETED") {
      return blocked("HIRED", "Hired", "shortlisted")
    }
    if (
      pipeline.overallStatus === "REJECTED" ||
      pipeline.lockState === "LOCKED_REJECTED"
    ) {
      return blocked("REJECTED", "Rejected", "rejected")
    }
    if (pipeline.overallStatus === "ON_HOLD") {
      return blocked("ON_HOLD", "On hold", "shortlisted")
    }

    const order = pipeline.currentStepOrder ?? 1
    const stepStatus = pipeline.currentStepStatus
    const leftShortlistGate =
      order > 1 || (stepStatus != null && stepStatus !== "PENDING")
    if (leftShortlistGate) {
      return blocked("IN_LATER_ROUND", "In later round", "shortlisted")
    }
  }

  if (applicationStatus === "REMOVED") {
    return blocked("REJECTED", "Rejected", "rejected")
  }

  if (SHORTLISTED_APPLICATION_STATUSES.has(applicationStatus)) {
    return blocked("ALREADY_SHORTLISTED", "Already shortlisted", "shortlisted")
  }

  if (ACTIONABLE_APPLICATION_STATUSES.has(applicationStatus)) {
    if (!pipeline) return actionable()
    if (pipeline.overallStatus === "IN_PROGRESS" && pipeline.lockState === "NONE") {
      const stepStatus = pipeline.currentStepStatus ?? "PENDING"
      if (stepStatus === "PENDING" && (pipeline.currentStepOrder ?? 1) <= 1) {
        return actionable()
      }
    }
  }

  return blocked("REJECTED", "Rejected", "rejected")
}

export function isShortlistActionable(input: ShortlistEligibilityInput): boolean {
  return getShortlistEligibility(input).actionable
}

export function eligibilityFromApplication(app: {
  status: string
  pipeline?: {
    overallStatus: string
    lockState: string
    currentStepOrder?: number | null
    steps?: Array<{ stepOrder: number; status: string }>
  } | null
}): ShortlistEligibility {
  const pipeline = app.pipeline
    ? {
        overallStatus: app.pipeline.overallStatus,
        lockState: app.pipeline.lockState,
        currentStepOrder: app.pipeline.currentStepOrder,
        currentStepStatus: pickCurrentStepStatus(
          app.pipeline.currentStepOrder,
          app.pipeline.steps ?? []
        ),
      }
    : null

  return getShortlistEligibility({
    applicationStatus: app.status,
    pipeline,
  })
}
