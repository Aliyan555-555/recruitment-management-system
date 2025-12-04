"use client"
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
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
  const [bookedSlot, setBookedSlot] = useState<any>(null)

  useEffect(() => {
    fetchAssignment(params.id)
      .then((data) => {
        setAssignment(data.assignment)
        setFeedback(data.assignment.feedback ?? "")
        fetchBookedSlot(data.assignment)
      })
      .catch((e) => setError(e.message))
  }, [params.id])

  const fetchBookedSlot = async (assignmentData?: any) => {
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
  const getSkillLevel = (level: number) => {
    const levels = ["Beginner", "Elementary", "Intermediate", "Advanced", "Expert"]
    return levels[level - 1] || "Unknown"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
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
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${assignment.status === "COMPLETED" ? "bg-green-100 text-green-800" :
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

        {/* Assessment Button */}
        <div className="mb-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-blue-600 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Professional Assessment Form</h3>
                  <p className="text-sm text-gray-600">
                    {assignment.status === "COMPLETED"
                      ? "Assessment completed. Click to view details."
                      : "Complete the 2-step evaluation for this candidate"}
                  </p>
                </div>
              </div>
              <a
                href={`/admin/jobs/${assignment.pipeline.job.id}/rounds/${assignment.workflowStep.id}/candidates/${assignment.pipeline.candidate.id}/assessment`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              >
                {assignment.status === "COMPLETED" ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Assessment
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Complete Assessment
                  </>
                )}
              </a>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Basic Info & Links */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Information */}
            <Card className="p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Contact Info</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</label>
                  <p className="mt-1 text-sm text-gray-900 font-medium">{candidate.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</label>
                  <p className="mt-1">
                    <a href={`mailto:${candidate.email}`} className="text-sm text-blue-600 hover:underline">{candidate.email}</a>
                  </p>
                </div>
                {candidate.phone1 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</label>
                    <p className="mt-1">
                      <a href={`tel:${candidate.phone1}`} className="text-sm text-gray-900">{candidate.phone1}</a>
                    </p>
                  </div>
                )}
                {candidate.phone2 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone 2</label>
                    <p className="mt-1">
                      <a href={`tel:${candidate.phone2}`} className="text-sm text-gray-900">{candidate.phone2}</a>
                    </p>
                  </div>
                )}
                {candidate.address && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Address</label>
                    <p className="mt-1 text-sm text-gray-700">{candidate.address}</p>
                  </div>
                )}
                {(candidate.city || candidate.country) && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Location</label>
                    <p className="mt-1 text-sm text-gray-700">
                      {[candidate.city, candidate.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Professional Info */}
            {(candidate.institution || candidate.department) && (
              <Card className="p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Professional</h3>
                </div>
                <div className="space-y-3">
                  {candidate.institution && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</label>
                      <p className="mt-1 text-sm text-gray-900">{candidate.institution}</p>
                    </div>
                  )}
                  {candidate.department && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Department</label>
                      <p className="mt-1 text-sm text-gray-900">{candidate.department}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Personal Details */}
            {candidate.profileDetails && (
              <Card className="p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Personal Details</h3>
                </div>
                <div className="space-y-3">
                  {candidate.profileDetails.dateOfBirth && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</label>
                      <p className="mt-1 text-sm text-gray-900">{candidate.profileDetails.dateOfBirth}</p>
                    </div>
                  )}
                  {candidate.profileDetails.gender && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</label>
                      <p className="mt-1 text-sm text-gray-900">{candidate.profileDetails.gender}</p>
                    </div>
                  )}
                  {candidate.profileDetails.nationality && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nationality</label>
                      <p className="mt-1 text-sm text-gray-900">{candidate.profileDetails.nationality}</p>
                    </div>
                  )}
                  {candidate.profileDetails.maritalStatus && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Marital Status</label>
                      <p className="mt-1 text-sm text-gray-900">{candidate.profileDetails.maritalStatus}</p>
                    </div>
                  )}
                  {candidate.profileDetails.professionalGrade && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Professional Grade</label>
                      <p className="mt-1 text-sm text-gray-900">{candidate.profileDetails.professionalGrade}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Social Links */}
            {candidate.profileDetails && (
              candidate.profileDetails.linkedinUrl ||
              candidate.profileDetails.portfolioUrl ||
              candidate.profileDetails.githubUrl ||
              candidate.profileDetails.websiteUrl
            ) && (
                <Card className="p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Social Links</h3>
                  </div>
                  <div className="space-y-2">
                    {candidate.profileDetails.linkedinUrl && (
                      <a href={candidate.profileDetails.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                        </svg>
                        LinkedIn
                      </a>
                    )}
                    {candidate.profileDetails.githubUrl && (
                      <a href={candidate.profileDetails.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-gray-900 text-sm">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        GitHub
                      </a>
                    )}
                    {candidate.profileDetails.portfolioUrl && (
                      <a href={candidate.profileDetails.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-600 hover:text-purple-800 text-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Portfolio
                      </a>
                    )}
                    {candidate.profileDetails.websiteUrl && (
                      <a href={candidate.profileDetails.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:text-green-800 text-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        Website
                      </a>
                    )}
                  </div>
                </Card>
              )}

            {/* Career Preferences */}
            {candidate.profileDetails && (
              candidate.profileDetails.expectedSalary ||
              candidate.profileDetails.noticePeriod ||
              candidate.profileDetails.availability
            ) && (
                <Card className="p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                    <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Career Preferences</h3>
                  </div>
                  <div className="space-y-3">
                    {candidate.profileDetails.expectedSalary && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Salary</label>
                        <p className="mt-1 text-sm text-gray-900">{candidate.profileDetails.expectedSalary}</p>
                      </div>
                    )}
                    {candidate.profileDetails.noticePeriod && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notice Period</label>
                        <p className="mt-1 text-sm text-gray-900">{candidate.profileDetails.noticePeriod}</p>
                      </div>
                    )}
                    {candidate.profileDetails.availability && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Availability</label>
                        <p className="mt-1 text-sm text-gray-900">{candidate.profileDetails.availability}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

            {/* CV/Resume */}
            {assignment.pipeline.application?.cv && (
              <Card className="p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Resume/CV</h3>
                </div>
                <a
                  href={`/api/profile/cv/${assignment.pipeline.application.cv.filepath}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium w-full justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {assignment.pipeline.application.cv.filename}
                </a>
              </Card>
            )}
          </div>

          {/* Right Column - Professional Experience */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            {candidate.profileDetails?.bio && (
              <Card className="p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Professional Summary</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{candidate.profileDetails.bio}</p>
              </Card>
            )}

            {/* Work Experience */}
            {candidate.experiences && candidate.experiences.length > 0 && (
              <Card className="p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Work Experience</h3>
                </div>
                <div className="space-y-4">
                  {candidate.experiences.map((exp: any, idx: number) => (
                    <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                      <h4 className="font-semibold text-gray-900">{exp.jobTitle}</h4>
                      {exp.company && <p className="text-sm text-gray-600 mt-1">{exp.company}</p>}
                      {exp.location && <p className="text-sm text-gray-500 mt-1">{exp.location}</p>}
                      <p className="text-xs text-gray-500 mt-2">
                        {exp.startDate || 'N/A'} - {exp.isCurrent ? 'Present' : (exp.endDate || 'N/A')}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Education */}
            {candidate.educations && candidate.educations.length > 0 && (
              <Card className="p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Education</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {candidate.educations.map((edu: any, idx: number) => (
                    <div key={idx} className="border-l-4 border-purple-500 pl-4 py-2">
                      <h4 className="font-semibold text-gray-900">{edu.degreeTitle}</h4>
                      <p className="text-sm text-gray-600 mt-1">{edu.educationLevel}</p>
                      {edu.institute && <p className="text-sm text-gray-600 mt-1">{edu.institute}</p>}
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                        {edu.majorSubject && <span>Major: {edu.majorSubject}</span>}
                        {edu.grade && <span>• Grade: {edu.grade}</span>}
                        {edu.passingYear && <span>• Year: {edu.passingYear}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Skills */}
            {candidate.skills && candidate.skills.length > 0 && (
              <Card className="p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Skills & Expertise</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill: any, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-800 rounded-full text-sm font-medium border border-green-200"
                    >
                      {skill.skillName}
                      {skill.level && (
                        <span className="text-xs bg-green-200 px-2 py-0.5 rounded-full">
                          {getSkillLevel(skill.level)}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Job Preferences */}
            {candidate.jobPreference && (
              <Card className="p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Job Preferences</h3>
                </div>
                <div className="space-y-3">
                  {candidate.jobPreference.firstPriority && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">1st Priority</label>
                      <p className="mt-1 text-sm text-gray-900">{candidate.jobPreference.firstPriority}</p>
                    </div>
                  )}
                  {candidate.jobPreference.secondPriority && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">2nd Priority</label>
                      <p className="mt-1 text-sm text-gray-900">{candidate.jobPreference.secondPriority}</p>
                    </div>
                  )}
                  {candidate.jobPreference.thirdPriority && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">3rd Priority</label>
                      <p className="mt-1 text-sm text-gray-900">{candidate.jobPreference.thirdPriority}</p>
                    </div>
                  )}
                  {candidate.jobPreference.summary && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</label>
                      <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{candidate.jobPreference.summary}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

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

            {/* Evaluation Criteria */}
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

            {/* Step Actions & Feedback */}
            <Card className="p-6 shadow-lg border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Interview Evaluation</h3>
              </div>

              <div className="space-y-6">
                {/* Action Buttons */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Quick Actions</label>
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
                      Start Interview
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
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Feedback
                  </label>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="min-h-[140px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none resize-none"
                    placeholder="Enter your detailed feedback about the candidate..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <p className="text-xs text-gray-500">Rate the candidate's performance</p>
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
          </div>
        </div>

      </div>
    </div>
  )
}

