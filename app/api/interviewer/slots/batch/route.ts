import { NextRequest, NextResponse } from "next/server"
import { requireInterviewer } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

interface SlotInput {
  startsAt: string // ISO string
  endsAt: string // ISO string
  capacity?: number
}

interface BatchSlotRequest {
  stepId: string
  slots: SlotInput[]
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireInterviewer()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: BatchSlotRequest = await req.json()
    const { stepId, slots } = body

    if (!stepId || !slots || slots.length === 0) {
      return NextResponse.json(
        { error: "stepId and slots array are required" },
        { status: 400 }
      )
    }

    const stepIdBig = BigInt(stepId)
    const interviewerId = BigInt(user.id)
    const now = BigInt(Math.floor(Date.now() / 1000))

    // Verify step exists and interviewer has permission
    const step = await prisma.workflowStep.findUnique({
      where: { id: stepIdBig },
      include: {
        workflow: {
          include: {
            job: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      }
    })

    if (!step) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 })
    }

    // Verify interviewer is assigned to this step or can create slots
    if (step.interviewerId && step.interviewerId !== interviewerId) {
      // Check if interviewer is in interviewerIds array from stepMetadata
      const metadata = (step.stepMetadata as any) || {}
      const interviewerIds = metadata.interviewerIds || []
      if (!interviewerIds.includes(user.id)) {
        return NextResponse.json({ error: "Not authorized for this step" }, { status: 403 })
      }
    }

    // Validate and create slots
    const createdSlots = await prisma.$transaction(async (tx) => {
      const validSlots: any[] = []

      for (const slotInput of slots) {
        const startsAt = new Date(slotInput.startsAt)
        const endsAt = new Date(slotInput.endsAt)

        // Validation
        if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
          continue // Skip invalid slots
        }

        if (endsAt <= startsAt) {
          continue // Skip invalid time ranges
        }

        if (startsAt < new Date()) {
          continue // Skip past slots
        }

        // Check for overlaps with existing slots
        const existingSlots = await (tx as any).interviewSlot.findMany({
          where: {
            stepId: stepIdBig,
            interviewerId: interviewerId,
            OR: [
              {
                startsAt: { lt: endsAt },
                endsAt: { gt: startsAt }
              }
            ]
          }
        })

        if (existingSlots.length > 0) {
          continue // Skip overlapping slots
        }

        // Create slot
        const slot = await (tx as any).interviewSlot.create({
          data: {
            stepId: stepIdBig,
            interviewerId: interviewerId,
            startsAt: startsAt,
            endsAt: endsAt,
            capacity: slotInput.capacity && slotInput.capacity > 0 ? slotInput.capacity : 1,
            isBlocked: false,
            createdAt: now,
            updatedAt: now
          }
        })

        validSlots.push(slot)
      }

      return validSlots
    })

    // Notify candidates with pending step for this workflow step
    if (createdSlots.length > 0) {
      try {
        // Find all pipelines with pending step for this workflow step
        const pendingPipelines = await prisma.candidatePipeline.findMany({
          where: {
            jobId: step.workflow.job.id,
            overallStatus: "IN_PROGRESS",
            steps: {
              some: {
                workflowStepId: stepIdBig,
                status: "PENDING"
              }
            }
          },
          include: {
            candidate: {
              select: {
                id: true,
                firstname: true,
                lastname: true
              }
            },
            job: {
              select: {
                title: true
              }
            }
          }
        })

        // Notify each candidate
        for (const pipeline of pendingPipelines) {
          await createNotification({
            userId: pipeline.candidateId,
            title: "Interview Slots Available",
            message: `Interview slots are now available for "${step.stepName}" stage for job "${pipeline.job.title}". Please book your preferred time.`,
            type: "ASSIGNMENT",
            entityType: "slot_booking",
            entityId: createdSlots[0].id
          })
        }
      } catch (notificationError) {
        console.error("Error sending notifications:", notificationError)
        // Don't fail the request if notifications fail
      }
    }

    return NextResponse.json({
      success: true,
      created: createdSlots.length,
      slots: createdSlots.map(s => ({
        id: s.id.toString(),
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        capacity: s.capacity
      }))
    })
  } catch (error: any) {
    console.error("Error creating batch slots:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create slots" },
      { status: 500 }
    )
  }
}

