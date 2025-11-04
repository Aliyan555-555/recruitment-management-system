"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Slot {
  startsAt: Date
  endsAt: Date
  capacity: number
}

interface SlotCreatorProps {
  stepDurationMins: number // Duration of each interview slot
  onSubmit: (slots: Slot[]) => Promise<void>
  onCancel?: () => void
}

export function SlotCreator({ stepDurationMins, onSubmit, onCancel }: SlotCreatorProps) {
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [capacity, setCapacity] = useState(1)
  const [suggestedSlots, setSuggestedSlots] = useState<Slot[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate suggested slots based on time range and duration
  const calculateSlots = () => {
    if (!selectedDate || !startTime || !endTime) {
      setSuggestedSlots([])
      return
    }

    try {
      const start = new Date(`${selectedDate}T${startTime}`)
      const end = new Date(`${selectedDate}T${endTime}`)

      if (end <= start) {
        alert("End time must be after start time")
        return
      }

      const slots: Slot[] = []
      const slotDurationMs = stepDurationMins * 60 * 1000
      let currentStart = start

      while (currentStart.getTime() + slotDurationMs <= end.getTime()) {
        const slotEnd = new Date(currentStart.getTime() + slotDurationMs)
        slots.push({
          startsAt: new Date(currentStart),
          endsAt: new Date(slotEnd),
          capacity: capacity
        })
        currentStart = slotEnd
      }

      setSuggestedSlots(slots)
    } catch (error) {
      console.error("Error calculating slots:", error)
      alert("Invalid date/time format")
    }
  }

  const handleTimeRangeChange = () => {
    calculateSlots()
  }

  const removeSlot = (index: number) => {
    const updated = suggestedSlots.filter((_, i) => i !== index)
    setSuggestedSlots(updated)
  }

  const adjustSlotTime = (index: number, field: "startsAt" | "endsAt", newTime: string) => {
    const updated = [...suggestedSlots]
    const dateStr = selectedDate
    const dateTime = new Date(`${dateStr}T${newTime}`)
    
    if (field === "startsAt") {
      updated[index].startsAt = dateTime
      // Auto-adjust end time based on duration
      updated[index].endsAt = new Date(dateTime.getTime() + stepDurationMins * 60 * 1000)
    } else {
      updated[index].endsAt = dateTime
    }

    setSuggestedSlots(updated)
  }

  const handleSubmit = async () => {
    if (suggestedSlots.length === 0) {
      alert("Please generate slots first")
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(suggestedSlots)
    } catch (error) {
      console.error("Error creating slots:", error)
      alert("Failed to create slots")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Create Interview Slots</h3>
      
      <div className="space-y-4">
        {/* Date Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Date *
          </label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setTimeout(handleTimeRangeChange, 100)
            }}
            min={new Date().toISOString().split("T")[0]}
            className="w-full"
            required
          />
        </div>

        {/* Time Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time *
            </label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value)
                setTimeout(handleTimeRangeChange, 100)
              }}
              className="w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time *
            </label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value)
                setTimeout(handleTimeRangeChange, 100)
              }}
              className="w-full"
              required
            />
          </div>
        </div>

        {/* Capacity per slot */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Capacity per Slot (candidates per slot)
          </label>
          <Input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => {
              setCapacity(Number(e.target.value))
              // Update existing slots
              setSuggestedSlots(prev => prev.map(s => ({ ...s, capacity: Number(e.target.value) })))
            }}
            className="w-full"
          />
        </div>

        {/* Step Duration Info */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-900">
            <strong>Step Duration:</strong> {stepDurationMins} minutes
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Slots will be auto-generated based on this duration
          </p>
        </div>

        {/* Generate Slots Button */}
        <Button
          type="button"
          onClick={calculateSlots}
          disabled={!selectedDate || !startTime || !endTime}
          className="w-full"
        >
          Generate Slots
        </Button>

        {/* Suggested Slots Preview */}
        {suggestedSlots.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Suggested Slots ({suggestedSlots.length} slots)
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {suggestedSlots.map((slot, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <label className="text-xs text-gray-500">Start:</label>
                      <Input
                        type="time"
                        value={slot.startsAt.toTimeString().slice(0, 5)}
                        onChange={(e) => adjustSlotTime(index, "startsAt", e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">End:</label>
                      <Input
                        type="time"
                        value={slot.endsAt.toTimeString().slice(0, 5)}
                        onChange={(e) => adjustSlotTime(index, "endsAt", e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    {slot.startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {slot.endsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeSlot(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={suggestedSlots.length === 0 || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "Creating..." : `Create ${suggestedSlots.length} Slot(s)`}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

