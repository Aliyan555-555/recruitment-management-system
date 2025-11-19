import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireInterviewer } from "@/lib/rbac"
import { notifyCandidateSlotsAvailable } from "@/lib/notifications"
import { sendCandidateSlotsAvailableEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  const user = await requireInterviewer()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { stepId, startsAt, endsAt, capacity } = body || {}
    if (!stepId || !startsAt || !endsAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const starts = new Date(startsAt)
    const ends = new Date(endsAt)
    if (!(starts instanceof Date) || !(ends instanceof Date) || isNaN(starts.getTime()) || isNaN(ends.getTime()) || ends <= starts) {
      return NextResponse.json({ error: "Invalid time range" }, { status: 400 })
    }

    // Validate: Slot cannot be in the past
    if (starts < new Date()) {
      return NextResponse.json({ error: "Slot start time cannot be in the past" }, { status: 400 })
    }

    // Get workflow step to find job
    const step = await prisma.workflowStep.findUnique({
      where: { id: BigInt(stepId) },
      include: {
        workflow: {
          include: {
            job: {
              select: {
                id: true,
                title: true,
                company: true
              }
            }
          }
        }
      }
    })

    if (!step) {
      return NextResponse.json({ error: "Workflow step not found" }, { status: 404 })
    }

    // CRITICAL: Validate slot time conflicts for the same interviewer
    // Check if this interviewer has any existing slots that overlap with the new slot time
    const existingSlots = await (prisma as any).interviewSlot.findMany({
      where: {
        interviewerId: BigInt(user.id),
        isBlocked: false, // Only check non-blocked slots
        // Check for time overlap: new slot overlaps if:
        // - new startsAt is between existing startsAt and endsAt, OR
        // - new endsAt is between existing startsAt and endsAt, OR
        // - new slot completely contains existing slot, OR
        // - existing slot completely contains new slot
        OR: [
          {
            // Case 1: New slot starts during existing slot
            startsAt: { lte: ends },
            endsAt: { gte: starts }
          }
        ]
      }
    })

    // Check for actual time overlap
    const hasConflict = existingSlots.some((existingSlot: any) => {
      const existingStarts = new Date(existingSlot.startsAt)
      const existingEnds = new Date(existingSlot.endsAt)
      
      // Two slots overlap if:
      // - New slot starts before existing ends AND new slot ends after existing starts
      return starts < existingEnds && ends > existingStarts
    })

    if (hasConflict) {
      return NextResponse.json({ 
        error: "Time conflict: You already have a slot scheduled during this time. Please choose a different time slot.",
        conflictDetails: "This slot overlaps with an existing slot in your schedule."
      }, { status: 409 }) // 409 Conflict
    }

    const now = BigInt(Math.floor(Date.now() / 1000))
    const slot = await (prisma as any).interviewSlot.create({
      data: {
        stepId: BigInt(stepId),
        interviewerId: BigInt(user.id),
        startsAt: starts,
        endsAt: ends,
        capacity: typeof capacity === "number" && capacity > 0 ? capacity : 1,
        createdAt: now,
        updatedAt: now,
      }
    })

    // After slot creation, notify eligible candidates for this step
    // This works for both BULK jobs (batches) and NORMAL jobs (pipelines)
    try {
      const selectedCandidates = new Map<bigint, {
        id: bigint
        email: string | null
        firstname: string
        lastname: string
      }>()

      // 1. For BULK jobs: Find candidates from batches
      const batches = await (prisma as any).batch.findMany({
        where: {
          workflowStepId: BigInt(stepId),
          status: "IN_PROGRESS"
        },
        include: {
          batchCandidates: {
            where: {
              currentStatus: "SELECTED" // Only notify selected candidates
            },
            include: {
              candidate: {
                select: {
                  id: true,
                  email: true,
                  firstname: true,
                  lastname: true
                }
              }
            }
          }
        }
      })

      batches.forEach((batch: any) => {
        batch.batchCandidates.forEach((bc: any) => {
          if (bc.candidate && !selectedCandidates.has(bc.candidate.id)) {
            selectedCandidates.set(bc.candidate.id, bc.candidate)
          }
        })
      })

      // 2. For NORMAL jobs: Find candidates from pipelines at this step
      const pipelineSteps = await prisma.candidatePipelineStep.findMany({
        where: {
          workflowStepId: BigInt(stepId),
          status: { in: ["PENDING", "IN_PROGRESS"] }, // Candidates waiting for or in this step
          pipeline: {
            overallStatus: { not: "REJECTED" }, // Exclude rejected pipelines
            lockState: { not: "LOCKED_REJECTED" }
          }
        },
        include: {
          pipeline: {
            include: {
              candidate: {
                select: {
                  id: true,
                  email: true,
                  firstname: true,
                  lastname: true
                }
              }
            }
          }
        }
      })

      pipelineSteps.forEach((ps: any) => {
        if (ps.pipeline.candidate && !selectedCandidates.has(ps.pipeline.candidate.id)) {
          selectedCandidates.set(ps.pipeline.candidate.id, ps.pipeline.candidate)
        }
      })

      // Count available slots for this step
      const availableSlots = await (prisma as any).interviewSlot.findMany({
        where: {
          stepId: BigInt(stepId),
          isBlocked: false,
          startsAt: { gte: new Date() }
        }
      })

      const slotCount = availableSlots.length

      // Notify each eligible candidate (from both bulk and normal jobs)
      for (const candidate of selectedCandidates.values()) {
        await notifyCandidateSlotsAvailable(
          candidate.id,
          step.workflow.job.title,
          step.stepName,
          slotCount
        )

        if (candidate.email) {
          await sendCandidateSlotsAvailableEmail(
            candidate.email,
            `${candidate.firstname} ${candidate.lastname}`,
            step.workflow.job.title,
            step.stepName,
            slotCount,
            step.workflow.job.id.toString()
          )
        }
      }
    } catch (notifyError) {
      console.error("Error notifying candidates about slots:", notifyError)
      // Don't fail slot creation if notification fails
    }

    return NextResponse.json({ id: slot.id.toString(), status: "OK" })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create slot" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const user = await requireInterviewer()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const stepId = searchParams.get("stepId")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const where: any = { interviewerId: BigInt(user.id) }
    if (stepId) where.stepId = BigInt(stepId)
    if (from || to) where.startsAt = {}
    if (from) where.startsAt.gte = new Date(from)
    if (to) where.startsAt.lte = new Date(to)

    const slots = await (prisma as any).interviewSlot.findMany({
      where,
      include: { _count: { select: { bookings: true } } },
      orderBy: { startsAt: "asc" }
    })

    return NextResponse.json({
      slots: (slots as any[]).map((s: any) => ({
        id: s.id.toString(),
        stepId: s.stepId.toString(),
        interviewerId: s.interviewerId.toString(),
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        capacity: s.capacity,
        isBlocked: s.isBlocked,
        booked: s._count.bookings,
      }))
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to list slots" }, { status: 500 })
  }
}


