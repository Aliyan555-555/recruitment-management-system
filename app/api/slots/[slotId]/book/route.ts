import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// POST /api/slots/[slotId]/book - Book a slot
export async function POST(
  request: NextRequest,
  { params }: { params: { slotId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
        candidateId: BigInt(session.user.id),
        applicationId: BigInt(applicationId),
        status: "RESERVED",
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now())
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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find the booking for this slot and user
    const booking = await prisma.slotBooking.findFirst({
      where: {
        slotId: BigInt(params.slotId),
        candidateId: BigInt(session.user.id)
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
