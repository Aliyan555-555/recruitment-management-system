export interface PipelineStepLike {
  status?: string | null
  stepOrder?: number | null
}

export interface PipelineMetricsInput {
  totalWorkflowSteps?: number | null
  pipelineSteps?: PipelineStepLike[] | null
  currentStepOrder?: number | null
  overallStatus?: string | null
}

export interface PipelineMetricsResult {
  totalSteps: number
  completedSteps: number
  progressPercent: number
  currentStep: number
}

const COMPLETED_STATUS = "COMPLETED"

export function calculatePipelineMetrics({
  totalWorkflowSteps,
  pipelineSteps,
  currentStepOrder,
  overallStatus,
}: PipelineMetricsInput): PipelineMetricsResult {
  const steps = pipelineSteps ?? []
  const workflowTotal = totalWorkflowSteps ?? 0
  const inferredTotal = workflowTotal > 0 ? workflowTotal : steps.length
  const totalSteps = inferredTotal > 0 ? inferredTotal : 0

  const completedStepsRaw = steps.reduce((count, step) => {
    return step?.status === COMPLETED_STATUS ? count + 1 : count
  }, 0)
  const completedSteps = totalSteps > 0 ? Math.min(completedStepsRaw, totalSteps) : completedStepsRaw
  
  // Check if there's any step IN_PROGRESS
  const hasInProgress = steps.some(step => step?.status === "IN_PROGRESS")
  
  // Calculate effective completed steps (IN_PROGRESS counts as 0.5)
  const effectiveCompleted = completedSteps + (hasInProgress ? 0.5 : 0)

  let progressPercent = 0
  if (totalSteps > 0) {
    progressPercent = Math.round((effectiveCompleted / totalSteps) * 100)
  } else if (overallStatus === COMPLETED_STATUS) {
    progressPercent = 100
  }

  progressPercent = Math.min(100, Math.max(0, progressPercent))

  const normalizedCurrentStep = (() => {
    if (totalSteps <= 0) {
      return overallStatus === COMPLETED_STATUS ? 0 : 0
    }

    if (overallStatus === COMPLETED_STATUS) {
      return totalSteps
    }

    const fallbackStep = Math.min(totalSteps, Math.max(1, completedSteps + 1))
    const providedStep = currentStepOrder ?? fallbackStep

    return Math.max(1, Math.min(providedStep, totalSteps))
  })()

  return {
    totalSteps,
    completedSteps,
    progressPercent,
    currentStep: normalizedCurrentStep,
  }
}


