"use client"
import { useEffect, useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { SlotCreator } from "@/components/SlotCreator"
import { InterviewTimer } from "@/components/InterviewTimer"

async function fetchAssignment(id: string) {
  const res = await fetch(`/api/interviewer/assignments/${id}`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load assignment")
  return res.json()
}

async function updateAssignment(id: string, data: any) {
  const res = await fetch(`/api/interviewer/assignments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Failed to update assignment")
  return res.json()
}

export default function Page({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [assignment, setAssignment] = useState<any>(null)
  const [feedback, setFeedback] = useState("")
  const [rating, setRating] = useState<number | "">("")
  const [recommendation, setRecommendation] = useState("")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showSlotCreator, setShowSlotCreator] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [bookedSlot, setBookedSlot] = useState<any>(null)

  useEffect(() => {
    fetchAssignment(params.id)
      .then((data) => {
        setAssignment(data.assignment)
        setFeedback(data.assignment.feedback ?? "")
        // Fetch slots for this step
        if (data.assignment?.workflowStep?.id) {
          fetchSlots(data.assignment.workflowStep.id)
          fetchBookedSlot(data.assignment)
        }
      })
      .catch((e) => setError(e.message))
  }, [params.id])

  const fetchBookedSlot = useCallback(async (assignmentData?: any) => {
    const assignmentToUse = assignmentData || assignment
    if (!assignmentToUse?.pipeline?.candidate?.email || !assignmentToUse?.workflowStep?.id) return
    
    try {
      const res = await fetch("/api/interviews/upcoming")
      if (res.ok) {
        const data = await res.json()
        const candidateEmail = assignmentToUse.pipeline.candidate.email
        const stepId = assignmentToUse.workflowStep.id
        const jobId = assignmentToUse.pipeline.job.id
        const upcomingSlots = Array.isArray(data.upcoming) ? data.upcoming : []
        
        const slotWithBooking = upcomingSlots.find((slot: any) => {
          const matchesStep =
            slot.stepId === stepId ||
            slot.workflowStepId === stepId ||
            slot.stepName === assignmentToUse.workflowStep.stepName ||
            slot.stepOrder === assignmentToUse.stepOrder
          const matchesJob =
            slot.jobId === jobId ||
            slot.jobTitle === assignmentToUse.pipeline.job.title
          const bookings = Array.isArray(slot.bookings) ? slot.bookings : []
          const matchesCandidate = bookings.some((b: any) => b.candidateEmail === candidateEmail)
          return matchesStep && matchesJob && matchesCandidate
        })
        
        if (slotWithBooking) {
          const booking = Array.isArray(slotWithBooking.bookings)
            ? slotWithBooking.bookings.find((b: any) => b.candidateEmail === candidateEmail)
            : null

          setBookedSlot({
            ...slotWithBooking,
            candidateName: booking?.candidateName ?? assignmentToUse.pipeline.candidate.name,
            bookingId: booking?.bookingId ?? slotWithBooking.bookingId,
            candidateEmail,
          })
          return
        }
        setBookedSlot(null)
      }
    } catch (error) {
      console.error("Error fetching booked slot:", error)
      setBookedSlot(null)
    }
  }, [assignment])

  const fetchSlots = async (stepId: string) => {
    try {
      const res = await fetch(`/api/interviewer/slots?stepId=${stepId}`)
      if (res.ok) {
        const data = await res.json()
        setAvailableSlots(data.slots || [])
      }
    } catch (error) {
      console.error("Error fetching slots:", error)
    }
  }

  const handleCreateSlots = async (slots: Array<{ startsAt: Date; endsAt: Date; capacity: number }>) => {
    if (!assignment?.workflowStep?.id) return

    try {
      const res = await fetch("/api/interviewer/slots/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId: assignment.workflowStep.id,
          slots: slots.map(slot => ({
            startsAt: slot.startsAt.toISOString(),
            endsAt: slot.endsAt.toISOString(),
            capacity: slot.capacity
          }))
        })
      })

      if (res.ok) {
        alert(`Successfully created ${slots.length} slot(s)!`)
        setShowSlotCreator(false)
        fetchSlots(assignment.workflowStep.id)
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to create slots")
      }
    } catch (error) {
      console.error("Error creating slots:", error)
      alert("Failed to create slots")
    }
  }

  if (error) return <div className="text-red-600">{error}</div>
  if (!assignment) return <div>Loading...</div>

  const onAction = (action: "start" | "complete" | "reject" | "skip" | "submit_feedback") => {
    setError(null)
    startTransition(() => {
      updateAssignment(assignment.id, {
        action,
        feedback: feedback || undefined,
        rating: typeof rating === "number" ? rating : undefined,
        recommendation: recommendation || undefined,
      })
        .then(() => {
          router.refresh()
          fetchAssignment(params.id).then((d) => setAssignment(d.assignment))
        })
        .catch((e) => setError(e.message))
    })
  }

  const metadata = assignment.workflowStep || {}
  const candidate = assignment.pipeline.candidate || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 md:p-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{assignment.pipeline.job.title}</h1>
                  <p className="text-sm text-gray-600 mt-1">{assignment.pipeline.job.company}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Step {assignment.stepOrder}: {assignment.workflowStep.stepName}
                </span>
                {metadata.stepType && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {metadata.stepType}
                  </span>
                )}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  assignment.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                  assignment.status === "IN_PROGRESS" ? "bg-yellow-100 text-yellow-800" :
                  assignment.status === "REJECTED" ? "bg-red-100 text-red-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {assignment.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Candidate Information Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Candidate Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Personal Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-gray-600 min-w-[100px]">Name:</span>
                    <span className="text-gray-900">{candidate.name}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-gray-600 min-w-[100px]">Email:</span>
                    <a href={`mailto:${candidate.email}`} className="text-blue-600 hover:underline">{candidate.email}</a>
                  </div>
                  {candidate.phone1 && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-gray-600 min-w-[100px]">Phone 1:</span>
                      <a href={`tel:${candidate.phone1}`} className="text-gray-900">{candidate.phone1}</a>
                    </div>
                  )}
                  {candidate.phone2 && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-gray-600 min-w-[100px]">Phone 2:</span>
                      <a href={`tel:${candidate.phone2}`} className="text-gray-900">{candidate.phone2}</a>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              {(candidate.address || candidate.city || candidate.country) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Address
                  </h3>
                  <div className="space-y-1 text-sm text-gray-700">
                    {candidate.address && <p>{candidate.address}</p>}
                    {(candidate.city || candidate.country) && (
                      <p>{[candidate.city, candidate.country].filter(Boolean).join(", ")}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Professional Info */}
            <div className="space-y-4">
              {(candidate.institution || candidate.department) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Professional
                  </h3>
                  <div className="space-y-2 text-sm">
                    {candidate.institution && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-gray-600 min-w-[100px]">Institution:</span>
                        <span className="text-gray-900">{candidate.institution}</span>
                      </div>
                    )}
                    {candidate.department && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-gray-600 min-w-[100px]">Department:</span>
                        <span className="text-gray-900">{candidate.department}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CV/Resume */}
              {assignment.pipeline.application?.cv && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Resume/CV
                  </h3>
                  <a
                    href={`/api/profile/cv/${assignment.pipeline.application.cv.filepath}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {assignment.pipeline.application.cv.filename}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Education Section */}
          {candidate.educations && candidate.educations.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v9M4.432 8.638a12.082 12.082 0 018.568 5.362M19.568 8.638a12.086 12.086 0 00-8.568 5.362M12 14l.01-.01" />
                </svg>
                Education
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidate.educations.map((edu: any, idx: number) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="font-semibold text-gray-900 mb-1">{edu.degreeTitle}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {edu.educationLevel && <p>Level: {edu.educationLevel}</p>}
                      {edu.institute && <p>Institute: {edu.institute}</p>}
                      {edu.majorSubject && <p>Major: {edu.majorSubject}</p>}
                      {edu.grade && <p>Grade: {edu.grade}</p>}
                      {edu.passingYear && <p>Year: {edu.passingYear}</p>}
                      {edu.country && <p>Country: {edu.country}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills Section */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill: any, idx: number) => (
                  <div key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">{skill.skillName}</span>
                    {skill.level && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                        Level {skill.level}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Interviewer Instructions */}
        {metadata.interviewerInstructions && (
          <Card className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Instructions for Interviewer</h3>
            </div>
            <div className="p-4 bg-white rounded-lg border border-yellow-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{metadata.interviewerInstructions}</p>
            </div>
          </Card>
        )}

        {/* Attachments */}
        {metadata.attachments && metadata.attachments.length > 0 && (
          <Card className="p-6 shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Attachments</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {metadata.attachments.map((att: any) => (
                <div key={att.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{att.fileName || "Attachment"}</p>
                      <p className="text-xs text-gray-500">
                        {typeof att.fileSize === "number" ? `${(att.fileSize / 1024).toFixed(2)} KB` : "--"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Timer for Booked Slot */}
        {bookedSlot && (
          <div className="mb-6">
            <InterviewTimer
              slotStartTime={bookedSlot.startsAt}
              slotEndTime={bookedSlot.endsAt}
              stepName={bookedSlot.stepName}
              candidateName={bookedSlot.candidateName}
              meetingLink={bookedSlot.meetingLink}
            />
          </div>
        )}

        {/* Slot Creation Section */}
        <Card className="p-6 shadow-lg border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Interview Slots</h3>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowSlotCreator(!showSlotCreator)}
              className="px-5 py-2.5 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 font-semibold"
            >
              {showSlotCreator ? (
                <>
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Slots
                </>
              )}
            </Button>
          </div>

          {showSlotCreator && assignment?.workflowStep?.id && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <SlotCreator
                stepDurationMins={metadata.durationMins || 60}
                onSubmit={handleCreateSlots}
                onCancel={() => setShowSlotCreator(false)}
              />
            </div>
          )}

          {/* Existing Slots */}
          {availableSlots.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700">Existing Slots</h4>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {availableSlots.length} slot{availableSlots.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {availableSlots.map((slot: any) => (
                  <div key={slot.id} className={`p-4 rounded-lg border-2 transition-all ${
                    slot.isBlocked 
                      ? "bg-red-50 border-red-200" 
                      : (slot.capacity || 1) - (slot.booked || 0) <= 0
                      ? "bg-gray-50 border-gray-200"
                      : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-md"
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-semibold text-gray-900 text-sm">
                            {new Date(slot.startsAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(slot.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {slot.isBlocked && (
                        <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                          Blocked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <span className="font-medium">Capacity:</span>
                        <span>{slot.capacity || 1}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <span className="font-medium">Booked:</span>
                        <span className={`font-semibold ${(slot.booked || 0) > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                          {slot.booked || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span className={`font-medium ${(slot.capacity || 1) - (slot.booked || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Available:
                        </span>
                        <span className={`font-semibold ${(slot.capacity || 1) - (slot.booked || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(slot.capacity || 1) - (slot.booked || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!showSlotCreator && availableSlots.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium text-gray-700 mb-1">No slots created yet</p>
              <p className="text-xs text-gray-500">Click &quot;Create Slots&quot; to add interview time slots for candidates to book.</p>
            </div>
          )}
        </Card>

        {/* Step Actions */}
        <Card className="p-6 shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Step Actions</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              onClick={() => onAction("start")} 
              disabled={isPending}
              className="px-6 py-2.5 border-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 font-semibold"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start
            </Button>
            <Button 
              variant="default" 
              onClick={() => onAction("complete")} 
              disabled={isPending}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Complete
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => onAction("reject")} 
              disabled={isPending}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject
            </Button>
            {assignment.workflowStep.isSkippable && (
              <Button 
                variant="secondary" 
                onClick={() => onAction("skip")} 
                disabled={isPending}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-all duration-200 font-semibold"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
                Skip
              </Button>
            )}
          </div>
        </Card>

        {/* Dynamic Evaluation Criteria */}
        {metadata.evaluationCriteria && metadata.evaluationCriteria.length > 0 && (
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Evaluation Criteria</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {metadata.evaluationCriteria.map((criteria: string, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">{criteria}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Evaluation Form */}
        <Card className="p-6 shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Evaluation Form</h3>
          </div>
        
          <div className="space-y-6">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-gray-700">Feedback</span>
              <Textarea 
                value={feedback} 
                onChange={(e) => setFeedback(e.target.value)} 
                className="min-h-[140px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none resize-none" 
                placeholder="Enter your detailed feedback about the candidate..."
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-gray-700">Rating (1-5)</span>
                <Input 
                  type="number" 
                  min={1} 
                  max={5} 
                  value={rating} 
                  onChange={(e) => setRating(e.target.value ? Number(e.target.value) : "")} 
                  placeholder="1-5"
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 mt-1">Rate the candidate&apos;s performance</p>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-gray-700">
                  Recommendation <span className="text-red-500">*</span>
                </span>
                <select 
                  value={recommendation} 
                  onChange={(e) => setRecommendation(e.target.value)} 
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none bg-white"
                  required
                >
                  <option value="">Select recommendation</option>
                  <option value="STRONG_HIRE">Strong Hire - Excellent candidate</option>
                  <option value="HIRE">Hire - Good candidate</option>
                  <option value="NO_HIRE">No Hire - Not suitable</option>
                  <option value="STRONG_NO_HIRE">Strong No Hire - Definite rejection</option>
                </select>
              </label>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button 
                onClick={() => onAction("submit_feedback")} 
                disabled={isPending || !recommendation}
                className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Feedback
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Previous Submissions */}
        <Card className="p-6 shadow-lg border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Previous Submissions</h3>
          </div>
          <div className="space-y-4">
            {assignment.interviews?.length ? assignment.interviews.map((iv: any) => (
              <Card key={iv.id} className="p-5 bg-gray-50 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submitted: {iv.submittedAt ? new Date(Number(iv.submittedAt) * 1000).toLocaleString() : "-"}
                  </div>
                  <div className="flex items-center gap-3">
                    {iv.rating && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        ⭐ {iv.rating}/5
                      </span>
                    )}
                    {iv.recommendation && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        iv.recommendation === "STRONG_HIRE" || iv.recommendation === "HIRE" ? "bg-green-100 text-green-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {iv.recommendation.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </div>
                {iv.feedback && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{iv.feedback}</p>
                  </div>
                )}
              </Card>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium">No submissions yet.</p>
                <p className="text-xs text-gray-400 mt-1">Submit your evaluation to see it here.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}


