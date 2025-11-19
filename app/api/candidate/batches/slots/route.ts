import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireCandidate } from "@/lib/rbac"

/**
 * Get available slots for a candidate in bulk hiring based on their batch status
 * This endpoint is for bulk hiring jobs where candidates don't have pipelines
 */
export async function GET(req: NextRequest) {
  const user = await requireCandidate()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get("jobId")
    const stepId = searchParams.get("stepId")

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 })
    }

    const candidateId = BigInt(user.id)
    const jobIdBig = BigInt(jobId)

    // Find the candidate's batch for this job and step
    const batchCandidate = await (prisma as any).batchCandidate.findFirst({
      where: {
        candidateId,
        batch: {
          jobId: jobIdBig,
          ...(stepId ? { workflowStepId: BigInt(stepId) } : {}),
          status: { in: ["IN_PROGRESS", "PENDING_ADMIN"] }
        },
        currentStatus: "SELECTED" // Only show slots if candidate is SELECTED
      },
      include: {
        batch: {
          include: {
            workflowStep: {
              select: {
                id: true,
                stepName: true,
                stepOrder: true
              }
            }
          }
        }
      },
      orderBy: {
        batch: {
          createdAt: "desc"
        }
      }
    })

    if (!batchCandidate) {
      return NextResponse.json({ 
        error: "No active batch found for this candidate",
        slots: [],
        step: null
      })
    }

    const step = batchCandidate.batch.workflowStep
    const stepIdToUse = stepId ? BigInt(stepId) : step.id

    // Get available slots for this step
    const slots = await (prisma as any).interviewSlot.findMany({
      where: { 
        stepId: stepIdToUse, 
        isBlocked: false, 
        startsAt: { gt: new Date() } 
      },
      include: { _count: { select: { bookings: true } } },
      orderBy: { startsAt: 'asc' }
    })

    const availableSlots = (slots as any[]).filter((s: any) => s._count.bookings < s.capacity)
      .map((s: any) => ({
        id: s.id.toString(),
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        capacity: s.capacity,
        booked: s._count.bookings
      }))

    return NextResponse.json({ 
      step: { 
        id: step.id.toString(), 
        stepName: step.stepName, 
        stepOrder: step.stepOrder 
      }, 
      slots: availableSlots,
      batchId: batchCandidate.batch.id.toString()
    })
  } catch (e: any) {
    console.error("Error fetching batch slots:", e)
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}

