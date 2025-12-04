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
}

export default function SlotManagementPage() {
    const params = useParams()
    const [slots, setSlots] = useState<Slot[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        date: "",
        startTime: "09:00",
        endTime: "17:00",
        duration: 30,
        capacity: 1,
        buffer: 15,
        interviewerIds: [] as string[]
    })

    // Mock interviewers for now (should fetch from API)
    const [interviewers, setInterviewers] = useState<any[]>([])

    useEffect(() => {
        fetchSlots()
        // Fetch interviewers (mock for now or implement API)
        // setInterviewers(...)
    }, [])

    const fetchSlots = async () => {
        try {
            const res = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/slots`)
            if (res.ok) {
                const data = await res.json()
                setSlots(data.slots || [])
            }
        } catch (error) {
            console.error("Error fetching slots:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateSlots = async () => {
        try {
            // For demo, just use current user ID if no interviewers selected
            // In real app, fetch available interviewers
            const payload = {
                ...formData,
                interviewerIds: ["1"] // Hardcoded for demo, replace with selection
            }

            const res = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/slots`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                setShowCreateModal(false)
                fetchSlots()
                alert("Slots created successfully!")
            }
        } catch (error) {
            console.error("Error creating slots:", error)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading slots...</div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Interview Slots</h2>
                    <p className="text-gray-500">Manage availability for this round</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Create Slots
                </button>
            </div>

            {/* Slots List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slots.map(slot => (
                    <Card key={slot.id} className="p-4 border-l-4 border-blue-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="font-semibold text-gray-900">
                                    {new Date(slot.startsAt).toLocaleDateString()}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {new Date(slot.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                    {new Date(slot.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Interviewer: {slot.interviewer.name}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`px-2 py-1 text-xs rounded-full ${slot.bookings.length >= slot.capacity ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                    }`}>
                                    {slot.bookings.length} / {slot.capacity} Booked
                                </span>
                            </div>
                        </div>
                    </Card>
                ))}
                {slots.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <p className="text-gray-500">No interview slots created yet.</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold mb-4">Create Interview Slots</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border rounded"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Start Time</label>
                                    <input
                                        type="time"
                                        className="w-full p-2 border rounded"
                                        value={formData.startTime}
                                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">End Time</label>
                                    <input
                                        type="time"
                                        className="w-full p-2 border rounded"
                                        value={formData.endTime}
                                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Duration (mins)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded"
                                        value={formData.duration}
                                        onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Buffer (mins)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded"
                                        value={formData.buffer}
                                        onChange={e => setFormData({ ...formData, buffer: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateSlots}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Generate Slots
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
