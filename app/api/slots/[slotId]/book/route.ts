import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireCandidate } from "@/lib/rbac"

// POST /api/slots/[slotId]/book - Book a slot
export async function POST(
  request: NextRequest,
  { params }: { params: { slotId: string } }
) {
  try {
    const user = await requireCandidate()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Candidate access required" },
        { status: 401 }
      )
    }

    const { applicationId } = await request.json()
    if (!applicationId) {
      return NextResponse.json({ error: "Missing application ID" }, { status: 400 })
    }

    // Check if slot exists and is available
    const slot = await prisma.interviewSlot.findUnique({
      where: { id: BigInt(params.slotId) },
      include: { bookings: true }
    })

    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 })
    }

    if (slot.isBlocked) {
      return NextResponse.json({ error: "Slot is blocked" }, { status: 400 })
    }

    if (slot.bookings.length >= slot.capacity) {
      return NextResponse.json({ error: "Slot is full" }, { status: 400 })
    }

    // Check if candidate already has a booking for this step
    // This requires a more complex query, skipping for now to keep it simple
    // In production, we should prevent double booking for the same round

    // Create booking
    const booking = await prisma.slotBooking.create({
      data: {
        slotId: BigInt(params.slotId),
        candidateId: BigInt(user.id),
        applicationId: BigInt(applicationId),
        status: "RESERVED",
        createdAt: BigInt(Math.floor(Date.now() / 1000)),
        updatedAt: BigInt(Math.floor(Date.now() / 1000))
      }
    })

    return NextResponse.json({ 
      success: true, 
      bookingId: booking.id.toString(),
      message: "Slot booked successfully"
    })

  } catch (error) {
    console.error("Error booking slot:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/slots/[slotId]/book - Cancel booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slotId: string } }
) {
  try {
    const user = await requireCandidate()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Candidate access required" },
        { status: 401 }
      )
    }

    // Find the booking for this slot and user
    const booking = await prisma.slotBooking.findFirst({
      where: {
        slotId: BigInt(params.slotId),
        candidateId: BigInt(user.id)
      }
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Delete booking
    await prisma.slotBooking.delete({
      where: { id: booking.id }
    })

    return NextResponse.json({ 
      success: true, 
      message: "Booking cancelled successfully"
    })

  } catch (error) {
    console.error("Error cancelling booking:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
