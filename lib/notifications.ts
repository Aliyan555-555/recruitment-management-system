import { prisma } from "@/lib/prisma"

export type NotificationType = 
  | "ASSIGNMENT"
  | "COMPLETION"
  | "REJECTION"
  | "REMINDER"
  | "SYSTEM"

interface CreateNotificationParams {
  userId: bigint
  title: string
  message: string
  type: NotificationType
  entityType?: string
  entityId?: bigint
}

/**
 * Create a notification
 */
export async function createNotification(params: CreateNotificationParams) {
  const now = BigInt(Math.floor(Date.now() / 1000))

  return await prisma.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      entityType: params.entityType,
      entityId: params.entityId,
      isRead: false,
      createdAt: now,
    },
  })
}

/**
 * Notify interviewer when assigned to a step
 */
export async function notifyInterviewerAssignment(
  interviewerId: bigint,
  candidateName: string,
  stepName: string,
  jobTitle: string
) {
  return await createNotification({
    userId: interviewerId,
    title: "New Interview Assignment",
    message: `You have been assigned to conduct "${stepName}" for ${candidateName} applying to ${jobTitle}`,
    type: "ASSIGNMENT",
    entityType: "pipeline",
  })
}

/**
 * Notify admin when a new application is received
 */
export async function notifyAdminNewApplication(
  adminId: bigint,
  candidateName: string,
  jobTitle: string
) {
  return await createNotification({
    userId: adminId,
    title: "New Job Application",
    message: `${candidateName} has applied for ${jobTitle}`,
    type: "ASSIGNMENT",
    entityType: "application",
  })
}

/**
 * Notify admin when a step is completed
 */
export async function notifyStepCompletion(
  adminId: bigint,
  candidateName: string,
  stepName: string
) {
  return await createNotification({
    userId: adminId,
    title: "Interview Step Completed",
    message: `${stepName} has been completed for ${candidateName}`,
    type: "COMPLETION",
    entityType: "pipeline",
  })
}

/**
 * Notify candidate when their application status changes
 */
export async function notifyCandidateStatusChange(
  candidateId: bigint,
  status: string,
  jobTitle: string
) {
  return await createNotification({
    userId: candidateId,
    title: "Application Status Update",
    message: `Your application for ${jobTitle} is now ${status}`,
    type: "SYSTEM",
    entityType: "pipeline",
  })
}

/**
 * Notify when pipeline is completed or rejected
 */
export async function notifyPipelineCompletion(
  candidateId: bigint,
  jobTitle: string,
  status: "COMPLETED" | "REJECTED"
) {
  const title = status === "COMPLETED" 
    ? "Congratulations!" 
    : "Application Update"

  const message = status === "COMPLETED"
    ? `Your application for ${jobTitle} has been successfully completed. You will be contacted soon!`
    : `Your application for ${jobTitle} has been ${status.toLowerCase()}`

  return await createNotification({
    userId: candidateId,
    title,
    message,
    type: status === "COMPLETED" ? "COMPLETION" : "REJECTION",
    entityType: "pipeline",
  })
}

/**
 * Notify interviewer when a batch is created and ready for evaluation
 */
export async function notifyInterviewerBatchCreated(
  interviewerId: bigint,
  batchName: string,
  stepName: string,
  jobTitle: string,
  candidateCount: number,
  batchId: bigint
) {
  return await createNotification({
    userId: interviewerId,
    title: "New Batch Ready for Evaluation",
    message: `Batch "${batchName}" for ${stepName} in ${jobTitle} is ready. ${candidateCount} candidate(s) need evaluation. Please create interview slots.`,
    type: "ASSIGNMENT",
    entityType: "batch",
    entityId: batchId,
  })
}

/**
 * Notify candidate when interview slots become available
 */
export async function notifyCandidateSlotsAvailable(
  candidateId: bigint,
  jobTitle: string,
  stepName: string,
  slotCount: number
) {
  return await createNotification({
    userId: candidateId,
    title: "Interview Slots Available",
    message: `${slotCount} interview slot(s) are now available for ${stepName} in ${jobTitle}. Please book your preferred slot.`,
    type: "ASSIGNMENT",
    entityType: "slot",
  })
}

/**
 * Notify candidate when a skill assessment result is available
 */
export async function notifySkillAssessmentResult(
  candidateId: bigint,
  skillName: string,
  passed: boolean,
  scorePercentage: number | null,
  assessmentId: bigint
) {
  const title = passed ? "Skill Assessment Complete" : "Skill Assessment Update"
  const percentageLabel =
    scorePercentage != null ? `${scorePercentage}%` : "Not assessed"
  const message = passed
    ? `Your ${skillName} assessment is complete. You scored ${percentageLabel}.`
    : `Your ${skillName} assessment is complete. You scored ${percentageLabel}. Review your result and re-attempt when eligible.`

  return await createNotification({
    userId: candidateId,
    title,
    message,
    type: passed ? "COMPLETION" : "SYSTEM",
    entityType: "skill_assessment",
    entityId: assessmentId,
  })
}

/**
 * Notify admin when an AI shortlisting evaluation run completes
 */
export async function notifyAiShortlistComplete(
  adminId: bigint,
  jobTitle: string,
  runSummary: string,
  jobId: bigint
) {
  return await createNotification({
    userId: adminId,
    title: "AI Shortlisting Complete",
    message: `AI shortlisting evaluation completed for ${jobTitle} (${runSummary}).`,
    type: "SYSTEM",
    entityType: "job",
    entityId: jobId,
  })
}


