import { prisma } from "@/lib/prisma"
import { notifyInterviewerAssignment, notifyCandidateStatusChange, notifyPipelineCompletion, notifyStepCompletion } from "@/lib/notifications"
import { sendInterviewerAssignmentEmail, sendCandidateStepCompletionEmail, sendCandidateRejectionEmail, sendPipelineCompletionEmail } from "@/lib/email"

/**
 * Advance candidate to the next step in the pipeline
 * Only advances if current step is COMPLETED
 * Returns the created step or null if no next step
 */
export async function advanceToNextStep(
  pipelineId: bigint,
  currentStepOrder: number
): Promise<{ success: boolean; nextStepId?: bigint; error?: string }> {
  try {
    const pipeline = await prisma.candidatePipeline.findUnique({
      where: { id: pipelineId },
      include: {
        job: {
          include: {
            workflow: {
              include: {
                steps: {
                  orderBy: { stepOrder: 'asc' }
                }
              }
            }
          }
        },
        candidate: true,
        steps: {
          where: { stepOrder: currentStepOrder },
          include: {
            workflowStep: true
          }
        }
      }
    })

    if (!pipeline) {
      return { success: false, error: "Pipeline not found" }
    }

    // Check if current step is completed
    const currentStep = pipeline.steps[0]
    if (!currentStep || currentStep.status !== "COMPLETED") {
      return { success: false, error: "Current step must be completed before advancing" }
    }

    // Check if pipeline is locked (rejected)
    if (pipeline.lockState === "LOCKED_REJECTED") {
      return { success: false, error: "Pipeline is locked (rejected), cannot advance" }
    }

    // Find next step in workflow
    const nextStepOrder = currentStepOrder + 1
    const nextWorkflowStep = pipeline.job.workflow?.steps.find(
      step => step.stepOrder === nextStepOrder
    )

    if (!nextWorkflowStep) {
      // No more steps - mark pipeline as completed
      await prisma.candidatePipeline.update({
        where: { id: pipelineId },
        data: {
          overallStatus: "COMPLETED",
          completedAt: BigInt(Math.floor(Date.now() / 1000))
        }
      })

      const candidateName = `${pipeline.candidate.firstname} ${pipeline.candidate.lastname}`
      const jobTitle = pipeline.job.title
      const jobCompany = pipeline.job.company || "Company"

      // Notify candidate
      await notifyCandidateStatusChange(
        pipeline.candidateId,
        "COMPLETED",
        jobTitle
      )

      await notifyPipelineCompletion(
        pipeline.candidateId,
        jobTitle,
        "COMPLETED"
      )

      if (pipeline.candidate.email) {
        await sendPipelineCompletionEmail(
          pipeline.candidate.email,
          candidateName,
          jobTitle,
          jobCompany
        )
      }

      return { success: true }
    }

    // Check if next step already exists (shouldn't happen, but safety check)
    const existingNextStep = await prisma.candidatePipelineStep.findFirst({
      where: {
        pipelineId,
        stepOrder: nextStepOrder
      }
    })

    if (existingNextStep) {
      return { success: false, error: "Next step already exists" }
    }

    // Create next step
    const now = BigInt(Math.floor(Date.now() / 1000))
    const nextStep = await prisma.candidatePipelineStep.create({
      data: {
        pipelineId,
        workflowStepId: nextWorkflowStep.id,
        stepOrder: nextStepOrder,
        status: "PENDING",
        interviewerId: nextWorkflowStep.interviewerId,
        startedAt: now,
      }
    })

    // Update pipeline current step
    await prisma.candidatePipeline.update({
      where: { id: pipelineId },
      data: {
        currentStepOrder: nextStepOrder
      }
    })

    // Notify interviewer if assigned
    if (nextWorkflowStep.interviewerId) {
      const candidateName = `${pipeline.candidate.firstname} ${pipeline.candidate.lastname}`
      await notifyInterviewerAssignment(
        nextWorkflowStep.interviewerId,
        candidateName,
        nextWorkflowStep.stepName,
        pipeline.job.title
      )

      // Send email to interviewer
      const interviewer = await prisma.user.findUnique({
        where: { id: nextWorkflowStep.interviewerId },
        select: { email: true, firstname: true, lastname: true }
      })

      if (interviewer?.email) {
        await sendInterviewerAssignmentEmail(
          interviewer.email,
          `${interviewer.firstname} ${interviewer.lastname}`,
          candidateName,
          nextWorkflowStep.stepName,
          pipeline.job.title,
          pipeline.job.company || "Company"
        )
      }
    }

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true }
    })

    const candidateName = `${pipeline.candidate.firstname} ${pipeline.candidate.lastname}`
    await Promise.all(
      admins.map(admin =>
        notifyStepCompletion(
          admin.id,
          candidateName,
          nextWorkflowStep.stepName
        )
      )
    )

    // Notify candidate
    await notifyCandidateStatusChange(
      pipeline.candidateId,
      `Advanced to step ${nextStepOrder}: ${nextWorkflowStep.stepName}`,
      pipeline.job.title
    )

    // Send email to candidate
    if (pipeline.candidate.email) {
      const candidateName = `${pipeline.candidate.firstname} ${pipeline.candidate.lastname}`
      // Find next next step name for email
      const nextNextStep = pipeline.job.workflow?.steps.find(
        step => step.stepOrder === nextStepOrder + 1
      )
      await sendCandidateStepCompletionEmail(
        pipeline.candidate.email,
        candidateName,
        currentStep.workflowStep.stepName,
        pipeline.job.title,
        nextNextStep?.stepName
      )
    }

    return { success: true, nextStepId: nextStep.id }
  } catch (error: any) {
    console.error("Error advancing to next step:", error)
    return { success: false, error: error.message || "Failed to advance to next step" }
  }
}

/**
 * Handle step rejection - lock pipeline
 */
export async function handleStepRejection(
  pipelineId: bigint,
  stepOrder: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const pipeline = await prisma.candidatePipeline.findUnique({
      where: { id: pipelineId },
      include: {
        job: true,
        candidate: true
      }
    })

    if (!pipeline) {
      return { success: false, error: "Pipeline not found" }
    }

    // Lock pipeline
    await prisma.candidatePipeline.update({
      where: { id: pipelineId },
      data: {
        lockState: "LOCKED_REJECTED",
        overallStatus: "REJECTED"
      }
    })

    // Notify candidate
    await notifyCandidateStatusChange(
      pipeline.candidateId,
      "REJECTED",
      pipeline.job.title
    )

    await notifyPipelineCompletion(
      pipeline.candidateId,
      pipeline.job.title,
      "REJECTED"
    )

    // Send email to candidate
    if (pipeline.candidate.email) {
      const candidateName = `${pipeline.candidate.firstname} ${pipeline.candidate.lastname}`
      const rejectedStep = await prisma.candidatePipelineStep.findFirst({
        where: {
          pipelineId,
          stepOrder,
          status: "REJECTED"
        },
        include: {
          workflowStep: true
        }
      })
      await sendCandidateRejectionEmail(
        pipeline.candidate.email,
        candidateName,
        pipeline.job.title,
        rejectedStep?.workflowStep.stepName
      )
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error handling step rejection:", error)
    return { success: false, error: error.message || "Failed to handle rejection" }
  }
}

