"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { InterviewTimer } from "@/components/InterviewTimer"
import { Navbar } from "@/components/Navbar"

interface PipelineDetail {
  id: string
  applicationId: string
  candidate: {
    name: string
    email: string
  }
  job: {
    title: string
    company: string
    description: string
  }
  status: string
  lockState?: string
  currentStep: number
  startedAt: string
  completedAt?: string
  totalSteps: number
  completedSteps: number
  progressPercent: number
  steps: Array<{
    id: string
    stepName: string
    stepOrder: number
    status: string
    isRequired: boolean
    isSkippable?: boolean
    feedback?: string
    startedAt?: string
    completedAt?: string
    stepType?: string
    durationMins?: number
    interviewMode?: string
    meetingLink?: string
    candidateInstructions?: string
    attachments?: Array<{
      id: string
      fileName: string
      fileSize: number
      fileType: string
      access: string[]
    }>
    interviews: Array<{
      rating?: number
      recommendation?: string
      submittedAt?: string
    }>
    lois?: Array<{
      id: string
      status: string
      sentAt?: string
    }>
    offerLetters?: Array<{
      id: string
      status: string
      sentAt?: string
    }>
  }>
}

export default function ApplicationDetailPage() {
  const params = useParams()
  const { data: session, status: authStatus } = useSession()
  const [pipeline, setPipeline] = useState<PipelineDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [bookingSlot, setBookingSlot] = useState<string | null>(null)
  const [bookedSlot, setBookedSlot] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchAvailableSlots = useCallback(async (pipelineId: string) => {
    setLoadingSlots(true)
    try {
      const res = await fetch(`/api/candidate/pipelines/${pipelineId}/pending-stage`)
      if (res.ok) {
        const data = await res.json()
        setAvailableSlots(data.slots || [])
      } else {
        setAvailableSlots([])
      }
    } catch (error) {
      console.error("Error fetching slots:", error)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [])

  const fetchBookedSlot = useCallback(async (pipelineId: string, pipelineData?: PipelineDetail | null) => {
    const pipelineToUse = pipelineData ?? pipeline
    if (!pipelineToUse) return

    try {
      const res = await fetch("/api/interviews/upcoming")
      if (res.ok) {
        const data = await res.json()
        const currentStep = pipelineToUse.steps.find(s => s.stepOrder === pipelineToUse.currentStep)
        if (currentStep) {
          const booking = data.upcoming?.find((u: any) => {
            return u.applicationId === pipelineToUse.applicationId || u.stepName === currentStep.stepName
          })
          if (booking) {
            setBookedSlot(booking)
            return
          }
        }
        setBookedSlot(null)
      } else {
        setBookedSlot(null)
      }
    } catch (error) {
      console.error("Error fetching booked slot:", error)
      setBookedSlot(null)
    }
  }, [pipeline])

  const hydrateSlots = useCallback((pipelineData: PipelineDetail | null) => {
    if (!pipelineData || pipelineData.status !== "IN_PROGRESS" || pipelineData.lockState === "LOCKED_REJECTED") {
      setAvailableSlots([])
      setBookedSlot(null)
      return
    }

    fetchAvailableSlots(pipelineData.id)
    fetchBookedSlot(pipelineData.id, pipelineData)
  }, [fetchAvailableSlots, fetchBookedSlot])

  useEffect(() => {
    if (authStatus !== "authenticated") return

    const loadPipeline = async () => {
      try {
        const res = await fetch(`/api/applications/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          setPipeline(data.pipeline)
          hydrateSlots(data.pipeline)
        } else {
          setPipeline(null)
          setAvailableSlots([])
          setBookedSlot(null)
        }
      } catch (error) {
        console.error("Error fetching pipeline:", error)
        setPipeline(null)
        setAvailableSlots([])
        setBookedSlot(null)
      } finally {
        setLoading(false)
      }
    }

    loadPipeline()
  }, [authStatus, params.id, hydrateSlots])

  const handleBookSlot = async (slotId: string) => {
    if (!pipeline) return

    setBookingSlot(slotId)
    try {
      // Find the application ID from the pipeline
      const res = await fetch(`/api/candidate/slots/${slotId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: pipeline.applicationId
        })
      })

      if (res.ok) {
        alert("Slot booked successfully!")
        // Refresh pipeline and slots
        const pipelineRes = await fetch(`/api/applications/${params.id}`)
        if (pipelineRes.ok) {
          const data = await pipelineRes.json()
          setPipeline(data.pipeline)
          hydrateSlots(data.pipeline)
        } else {
          hydrateSlots(pipeline)
        }
      } else {
        const data = await res.json()
        alert(data.error || "Failed to book slot")
      }
    } catch (error) {
      console.error("Error booking slot:", error)
      alert("Failed to book slot")
    } finally {
      setBookingSlot(null)
    }
  }

  const handleLOIAction = async (loiId: string, action: 'ACCEPTED' | 'REJECTED') => {
    if (!confirm(`Are you sure you want to ${action === 'ACCEPTED' ? 'accept' : 'reject'} this Letter of Intent?`)) return

    setActionLoading(`loi-${loiId}`)
    try {
      const res = await fetch(`/api/candidate/loi/${loiId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action })
      })

      if (res.ok) {
        alert(`Letter of Intent ${action === 'ACCEPTED' ? 'Accepted' : 'Rejected'} Successfully!`)
        // Refresh pipeline
        const pipelineRes = await fetch(`/api/applications/${params.id}`)
        if (pipelineRes.ok) {
          const data = await pipelineRes.json()
          setPipeline(data.pipeline)
        }
      } else {
        const data = await res.json()
        alert(data.error || "Failed to update action")
      }
    } catch (error) {
      console.error("Error updating LOI:", error)
      alert("Failed to update status")
    } finally {
      setActionLoading(null)
    }
  }

  const handleOfferAction = async (offerId: string, action: 'ACCEPTED' | 'REJECTED') => {
    if (!confirm(`Are you sure you want to ${action === 'ACCEPTED' ? 'accept' : 'reject'} this Offer Letter?`)) return

    setActionLoading(`offer-${offerId}`)
    try {
      const res = await fetch(`/api/candidate/offer/${offerId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action })
      })

      if (res.ok) {
        alert(`Offer Letter ${action === 'ACCEPTED' ? 'Accepted' : 'Rejected'} Successfully!`)
        // Refresh pipeline
        const pipelineRes = await fetch(`/api/applications/${params.id}`)
        if (pipelineRes.ok) {
          const data = await pipelineRes.json()
          setPipeline(data.pipeline)
        }
      } else {
        const data = await res.json()
        alert(data.error || "Failed to update action")
      }
    } catch (error) {
      console.error("Error updating Offer:", error)
      alert("Failed to update status")
    } finally {
      setActionLoading(null)
    }
  }

  if (authStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-700 font-medium">Loading application...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!pipeline) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-900 mb-2">Application not found</p>
          <p className="text-gray-600 mb-6">The application you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link
            href="/applications"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Applications
          </Link>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "text-green-600 bg-green-50"
      case "IN_PROGRESS":
        return "text-blue-600 bg-blue-50"
      case "PENDING":
        return "text-gray-600 bg-gray-50"
      case "SKIPPED":
        return "text-yellow-600 bg-yellow-50"
      case "REJECTED":
        return "text-red-600 bg-red-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const getBookedSlotForStep = (step: PipelineDetail["steps"][number]) => {
    if (!bookedSlot) return null

    if (bookedSlot.stepOrder === step.stepOrder) {
      return bookedSlot
    }

    if (bookedSlot.stepName && bookedSlot.stepName === step.stepName) {
      return bookedSlot
    }

    if (pipeline?.currentStep === step.stepOrder && bookedSlot.applicationId === pipeline.applicationId) {
      return bookedSlot
    }

    return null
  }

  console.log(pipeline)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Application Detail</h1>
              <p className="text-gray-600">Track your interview progress and upcoming actions</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Link
              href="/applications"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to applications
            </Link>
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900">{pipeline.job.title}</div>
              <div className="text-sm text-gray-600">{pipeline.job.company}</div>
            </div>
          </div>
        </div>

        {/* Overall Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Application Status</h2>
              <p className="text-sm text-gray-500 mt-1">
                Applied on {new Date(Number(pipeline.startedAt) * 1000).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full font-semibold ${getStatusColor(pipeline.status)}`}>
              {pipeline.status.replace(/_/g, " ")}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Overall Progress</span>
              <span>
                {pipeline.totalSteps > 0
                  ? `Step ${Math.min(pipeline.currentStep, pipeline.totalSteps)} of ${pipeline.totalSteps}`
                  : pipeline.status === "COMPLETED"
                    ? "Completed"
                    : "No steps"}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, pipeline.progressPercent))}%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Job Description */}
        {pipeline.job.description && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div
              className="prose-lg max-w-none"
              style={{
                listStyleType: "initial",
                paddingLeft: "1.5em",
              }}
              dangerouslySetInnerHTML={{ __html: pipeline.job.description }}
            />
          </div>
        )}

        {/* Interview Process */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Interview Process</h2>

          <div className="space-y-6">
            {pipeline.steps.map((step, index) => {
              const matchedSlot = getBookedSlotForStep(step)
              const shouldShowStartingDate = matchedSlot && step.status !== "COMPLETED" && step.status !== "REJECTED"

              const loi = step.lois?.[0]
              const offer = step.offerLetters?.[0]

              return (
                <div key={step.id} className="relative">
                  {/* Connector Line */}
                  {index < pipeline.steps.length - 1 && (
                    <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                  )}

                  <div className="flex">
                    {/* Step Indicator */}
                    <div className="flex-shrink-0 relative">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step.status === "COMPLETED"
                            ? "bg-green-500 text-white"
                            : step.status === "IN_PROGRESS"
                              ? "bg-blue-500 text-white"
                              : step.status === "REJECTED"
                                ? "bg-red-500 text-white"
                                : "bg-gray-300 text-gray-600"
                          }`}
                      >
                        {step.status === "COMPLETED" ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-sm">{step.stepOrder}</span>
                        )}
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="ml-4 flex-1 pb-8">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900">{step.stepName}</h3>
                            <div className="flex gap-2 mt-1">
                              {step.stepType && (
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                  {step.stepType}
                                </span>
                              )}
                              <p className="text-sm text-gray-500">
                                {step.isRequired ? "Required" : step.isSkippable ? "Skippable" : "Optional"}
                              </p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(step.status)}`}>
                            {step.status.replace(/_/g, " ")}
                          </span>
                        </div>

                        {/* LOI Section */}
                        {loi && ['SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'].includes(loi.status) && (
                          <div className="mt-4 p-4 bg-white border border-blue-100 rounded-lg shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-semibold text-blue-900">Letter of Intent / Job Offer</h4>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${loi.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                                  loi.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                    loi.status === 'EXPIRED' ? 'bg-orange-100 text-orange-800' :
                                      'bg-blue-100 text-blue-800'
                                }`}>
                                {loi.status}
                              </span>
                            </div>

                            <div className="flex gap-3">
                              <a
                                href={`/api/candidate/loi/${loi.id}/pdf`}
                                target="_blank"
                                className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                View PDF
                              </a>

                              {loi.status === 'SENT' && (
                                <>
                                  <button
                                    onClick={() => handleLOIAction(loi.id, 'ACCEPTED')}
                                    disabled={actionLoading === `loi-${loi.id}`}
                                    className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md text-sm font-medium transition-colors"
                                  >
                                    {actionLoading === `loi-${loi.id}` ? 'Processing...' : 'Accept Offer'}
                                  </button>
                                  <button
                                    onClick={() => handleLOIAction(loi.id, 'REJECTED')}
                                    disabled={actionLoading === `loi-${loi.id}`}
                                    className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md text-sm font-medium transition-colors"
                                  >
                                    Decline
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Offer Letter Section */}
                        {offer && ['SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'].includes(offer.status) && (
                          <div className="mt-4 p-4 bg-white border border-purple-100 rounded-lg shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-semibold text-purple-900">Official Offer Letter</h4>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${offer.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                                  offer.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                    offer.status === 'EXPIRED' ? 'bg-orange-100 text-orange-800' :
                                      'bg-purple-100 text-purple-800'
                                }`}>
                                {offer.status}
                              </span>
                            </div>

                            <div className="flex gap-3">
                              <a
                                href={`/api/candidate/offer/${offer.id}/pdf`}
                                target="_blank"
                                className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                View PDF
                              </a>

                              {offer.status === 'SENT' && (
                                <>
                                  <button
                                    onClick={() => handleOfferAction(offer.id, 'ACCEPTED')}
                                    disabled={actionLoading === `offer-${offer.id}`}
                                    className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md text-sm font-medium transition-colors"
                                  >
                                    {actionLoading === `offer-${offer.id}` ? 'Processing...' : 'Accept Final Offer'}
                                  </button>
                                  <button
                                    onClick={() => handleOfferAction(offer.id, 'REJECTED')}
                                    disabled={actionLoading === `offer-${offer.id}`}
                                    className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md text-sm font-medium transition-colors"
                                  >
                                    Decline
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Step Metadata */}
                        <div className="mt-4 space-y-2">
                          {step.durationMins && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Duration:</span> {step.durationMins} minutes
                            </p>
                          )}
                          {step.interviewMode && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Mode:</span> {step.interviewMode}
                            </p>
                          )}
                          {step.interviewMode === "Remote" && step.meetingLink && (
                            <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                              <p className="text-sm font-medium text-blue-900 mb-1">Meeting Link:</p>
                              <a
                                href={step.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline break-all"
                              >
                                {step.meetingLink}
                              </a>
                            </div>
                          )}
                          {step.candidateInstructions && (
                            <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">📋 Instructions for You:</h4>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{step.candidateInstructions}</p>
                            </div>
                          )}
                          {step.attachments && step.attachments.length > 0 && (
                            <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">📎 Attachments:</h4>
                              <div className="space-y-1">
                                {step.attachments.map((att) => (
                                  <div key={att.id} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">{att.fileName}</span>
                                    <span className="text-gray-500">{(att.fileSize / 1024).toFixed(2)} KB</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Dates */}
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          {shouldShowStartingDate && matchedSlot?.startsAt && (
                            <p className="text-sm text-gray-600">
                              Starting: {new Date(matchedSlot.startsAt).toLocaleString([], { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                          {step.completedAt && (
                            <p className="text-sm text-gray-600">
                              Completed: {new Date(Number(step.completedAt) * 1000).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        {/* Interview Results */}
                        {step.interviews.length > 0 && step.interviews[0].submittedAt && (
                          <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Interview Results</h4>
                            {step.interviews[0].rating && (
                              <p className="text-sm text-gray-700">
                                Rating: {step.interviews[0].rating}/5 ⭐
                              </p>
                            )}
                            {step.interviews[0].recommendation && (
                              <p className="text-sm text-gray-700 mt-1">
                                Recommendation: <span className="font-medium">{step.interviews[0].recommendation.replace(/_/g, " ")}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Timer for Booked Slot */}
        {bookedSlot && (
          <div className="mt-6">
            <InterviewTimer
              slotStartTime={bookedSlot.startsAt}
              slotEndTime={bookedSlot.endsAt}
              stepName={bookedSlot.stepName}
              interviewerName={bookedSlot.interviewerName}
              meetingLink={bookedSlot.meetingLink}
            />
          </div>
        )}

        {/* Slot Booking Section */}
        {pipeline.status === "IN_PROGRESS" && !bookedSlot && availableSlots.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              📅 Book Interview Slot
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Available time slots for: <span className="font-medium">{pipeline.steps.find(s => s.stepOrder === pipeline.currentStep)?.stepName}</span>
            </p>

            {loadingSlots ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableSlots.map((slot) => (
                  <div key={slot.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(slot.startsAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(slot.startsAt).toLocaleTimeString()} - {new Date(slot.endsAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                        {slot.capacity - slot.booked} available
                      </span>
                    </div>
                    <button
                      onClick={() => handleBookSlot(slot.id)}
                      disabled={bookingSlot === slot.id || slot.capacity - slot.booked === 0}
                      className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {bookingSlot === slot.id ? "Booking..." : "Book This Slot"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Next Steps Message */}
        {pipeline.status === "IN_PROGRESS" && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              <span className="font-semibold">Next:&nbsp;</span> We&apos;re currently reviewing your application at the &quot;{pipeline.steps.find(s => s.stepOrder === pipeline.currentStep)?.stepName}&quot; stage. You&apos;ll be notified of any updates.
            </p>
          </div>
        )}

        {pipeline.status === "COMPLETED" && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-semibold">
              🎉 Congratulations! Your application has been successfully completed. We&apos;ll be in touch soon!
            </p>
          </div>
        )}

        {pipeline.status === "REJECTED" && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              Thank you for your interest. Unfortunately, we&apos;ve decided to move forward with other candidates at this time.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

