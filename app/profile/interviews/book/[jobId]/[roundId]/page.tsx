"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"

interface Slot {
    id: string
    startsAt: string
    endsAt: string
    capacity: number
    interviewer: {
        name: string
    }
    bookings: any[]
    isBookedByMe?: boolean
}

export default function CandidateBookingPage() {
    const params = useParams()
    const [slots, setSlots] = useState<Slot[]>([])
    const [loading, setLoading] = useState(true)
    const [bookingInProgress, setBookingInProgress] = useState(false)
    const [myBooking, setMyBooking] = useState<string | null>(null)

    // Mock application ID - in real app, fetch from context or URL
    const applicationId = "1"

    useEffect(() => {
        fetchSlots()
    }, [])

    const fetchSlots = async () => {
        try {
            // Re-using the admin list endpoint for now, but filtering in UI
            // In production, should have a dedicated public/candidate endpoint
            const res = await fetch(`/api/admin/jobs/${params.jobId}/rounds/${params.roundId}/slots`)
            if (res.ok) {
                const data = await res.json()
                setSlots(data.slots || [])

                // Check if I have a booking
                // This logic would typically be server-side
                // For now, we'll just manage local state after booking
            }
        } catch (error) {
            console.error("Error fetching slots:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleBookSlot = async (slotId: string) => {
        if (bookingInProgress) return
        setBookingInProgress(true)

        try {
            const res = await fetch(`/api/slots/${slotId}/book`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ applicationId })
            })

            if (res.ok) {
                setMyBooking(slotId)
                alert("Slot booked successfully! Check your email for confirmation.")
                fetchSlots()
            } else {
                const err = await res.json()
                alert(`Booking failed: ${err.error}`)
            }
        } catch (error) {
            console.error("Error booking slot:", error)
            alert("An error occurred while booking")
        } finally {
            setBookingInProgress(false)
        }
    }

    const handleCancelBooking = async (slotId: string) => {
        if (!confirm("Are you sure you want to cancel this booking?")) return
        setBookingInProgress(true)

        try {
            const res = await fetch(`/api/slots/${slotId}/book`, {
                method: "DELETE"
            })

            if (res.ok) {
                setMyBooking(null)
                alert("Booking cancelled.")
                fetchSlots()
            }
        } catch (error) {
            console.error("Error cancelling booking:", error)
        } finally {
            setBookingInProgress(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading available slots...</div>

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Book Your Interview</h1>
                <p className="text-gray-600 mt-2">Select a time slot that works best for you.</p>
            </div>

            {myBooking && (
                <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold text-green-800">Interview Confirmed!</h3>
                        <p className="text-green-700 text-sm">You have a booking. You can reschedule if needed.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slots.map(slot => {
                    const isFull = slot.bookings.length >= slot.capacity
                    const isMySlot = myBooking === slot.id
                    const date = new Date(slot.startsAt)

                    return (
                        <Card key={slot.id} className={`p-4 border-2 ${isMySlot ? 'border-green-500 bg-green-50' : 'border-transparent hover:border-gray-200'}`}>
                            <div className="flex flex-col h-full justify-between">
                                <div>
                                    <div className="font-bold text-lg text-gray-900">
                                        {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </div>
                                    <div className="text-gray-600 mt-1">
                                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                        {new Date(slot.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-2">
                                        Interviewer: {slot.interviewer.name}
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    {isMySlot ? (
                                        <button
                                            onClick={() => handleCancelBooking(slot.id)}
                                            disabled={bookingInProgress}
                                            className="w-full py-2 px-4 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium transition-colors"
                                        >
                                            Cancel Booking
                                        </button>
                                    ) : isFull ? (
                                        <button disabled className="w-full py-2 px-4 bg-gray-100 text-gray-400 rounded cursor-not-allowed font-medium">
                                            Slot Full
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleBookSlot(slot.id)}
                                            disabled={bookingInProgress || !!myBooking}
                                            className={`w-full py-2 px-4 rounded font-medium transition-colors ${myBooking
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                        >
                                            Book Slot
                                        </button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
