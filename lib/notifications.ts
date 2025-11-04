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

