"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { INTERNAL_BEHAVIORS, EXTERNAL_BEHAVIORS, RATING_SCALE } from "@/lib/constants/focus-group-behaviors"

type Mode = "internal" | "external"

interface BehaviorInput {
  name: string
  rating?: number
  feedback?: string
}

interface CandidateInfo {
  id: string
  name: string
  email: string
}

interface JobInfo {
  id: string
  title: string
  company: string
}

interface AssessorInfo {
  id: string
  name: string
}

export default function FocusGroupAssessmentPage() {
  const params = useParams()
  const router = useRouter()
  const mode = (params.mode as Mode) || "internal"

  const [candidate, setCandidate] = useState<CandidateInfo | null>(null)
  const [job, setJob] = useState<JobInfo | null>(null)
  const [assessor, setAssessor] = useState<AssessorInfo | null>(null)
  const [assessorName, setAssessorName] = useState("")
  const [date, setDate] = useState("")
  const [groupNumber, setGroupNumber] = useState("")
  const [behaviors, setBehaviors] = useState<BehaviorInput[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [score, setScore] = useState<number | null>(null)
  const [scorePercentage, setScorePercentage] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedBehaviorIndex, setSelectedBehaviorIndex] = useState<number | null>(null)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  const behaviorsList = mode === "internal" ? INTERNAL_BEHAVIORS : EXTERNAL_BEHAVIORS

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    // Initialize behaviors from schema if empty
    if (behaviors.length === 0 && behaviorsList.length > 0) {
      setBehaviors(behaviorsList.map(b => ({ name: b.name })))
    }
  }, [behaviorsList, behaviors.length])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(
        `/api/admin/jobs/${params.id}/rounds/${params.roundId}/candidates/${params.candidateId}/assessment/${mode}`
      )
      if (res.ok) {
        const data = await res.json()
        if (data.candidate) setCandidate(data.candidate)
        if (data.job) setJob(data.job)
        if (data.assessor) {
          setAssessor(data.assessor)
          setAssessorName(data.assessor.name)
        }

        // Initialize date to today
        const today = new Date()
        setDate(today.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }))

        // Initialize group number (you can customize this)
        setGroupNumber(`DEC/MT/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000)}`)

        if (data.data?.behaviors) {
          setBehaviors(data.data.behaviors)
        } else {
          setBehaviors(behaviorsList.map(b => ({ name: b.name })))
        }

        if (data.assessorName) setAssessorName(data.assessorName)
        if (data.date) setDate(data.date)
        if (data.groupNumber) setGroupNumber(data.groupNumber)

        setSubmittedAt(data.submittedAt || null)
        setScore(data.score ?? null)
        setScorePercentage(data.scorePercentage ?? null)
      } else {
        const err = await res.json().catch(() => ({}))
        setError(err?.error || "Failed to load assessment")
      }
    } catch (e) {
      setError("Failed to load assessment")
    } finally {
      setLoading(false)
    }
  }

  const updateBehavior = (index: number, updates: Partial<BehaviorInput>) => {
    setBehaviors((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...updates }
      return next
    })
  }

  const openFeedbackModal = (index: number) => {
    setSelectedBehaviorIndex(index)
    setIsFeedbackOpen(true)
  }

  const closeFeedbackModal = () => {
    setIsFeedbackOpen(false)
    setSelectedBehaviorIndex(null)
  }

  const handleRatingSelect = (rating: number) => {
    if (selectedBehaviorIndex !== null) {
      updateBehavior(selectedBehaviorIndex, { rating })
    }
  }

  const selectedBehavior = selectedBehaviorIndex !== null ? behaviors[selectedBehaviorIndex] : null
  const selectedBehaviorDef = selectedBehaviorIndex !== null
    ? behaviorsList.find(b => b.name === behaviors[selectedBehaviorIndex]?.name)
    : null

  const handleSave = async (finalSubmit: boolean) => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    // Validate all behaviors have ratings
    const missingRatings = behaviors.some(b => !b.rating)
    if (finalSubmit && missingRatings) {
      setError("Please provide a rating for all behaviors before submitting")
      setSaving(false)
      return
    }

    try {
      const payload = {
        behaviors: behaviors.map(b => ({
          name: b.name,
          rating: b.rating,
          feedback: b.feedback || ""
        })),
        assessorName,
        date,
        groupNumber
      }

      const res = await fetch(
        `/api/admin/jobs/${params.id}/rounds/${params.roundId}/candidates/${params.candidateId}/assessment/${mode}`,
        {
          method: finalSubmit ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      )
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        setSuccess(finalSubmit ? "Assessment submitted successfully" : "Draft saved")
        setSubmittedAt(data.submittedAt || (finalSubmit ? new Date().toISOString() : null))
        if (data.score !== undefined) setScore(data.score)
        if (data.scorePercentage !== undefined) setScorePercentage(data.scorePercentage)

        if (finalSubmit && !data.bothSubmitted) {
          // If only one assessment is submitted, show message
          setTimeout(() => {
            router.push(`/admin/jobs/${params.id}/rounds/${params.roundId}/shortlisted`)
          }, 2000)
        } else if (finalSubmit && data.bothSubmitted) {
          // Both assessments complete
          setTimeout(() => {
            router.push(`/admin/jobs/${params.id}/rounds/${params.roundId}/shortlisted`)
          }, 2000)
        }
      } else {
        const err = await res.json().catch(() => ({}))
        setError(err?.error || "Failed to save assessment")
      }
    } catch (e) {
      setError("Failed to save assessment")
    } finally {
      setSaving(false)
    }
  }

  const title = mode === "internal"
    ? "Internal Group Discussion | Batch Recruitment"
    : "External Group Discussion | Batch Recruitment"

  const roleTitle = job?.title || "TRAINEE ROLE"
  const assessmentType = mode === "internal"
    ? "INTERNAL GROUP DISCUSSION"
    : "EXTERNAL GROUP DISCUSSION"

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">


      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <h1 className="text-3xl font-bold text-black mb-8">{title}</h1>

        {/* Assessment Form Card */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          {/* Form Title */}
          <h2 className="text-xl font-bold text-center text-gray-900 mb-8">
            {roleTitle} - {assessmentType}
          </h2>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          {/* Candidate and Assessor Information */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Candidate Name</label>
              <input
                type="text"
                value={candidate?.name || ""}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assessor Name</label>
              <input
                type="text"
                value={assessorName}
                onChange={(e) => setAssessorName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter assessor name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <div className="relative">
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="mm/dd/yyyy"
                />
                <svg className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group Number</label>
              <input
                type="text"
                value={groupNumber}
                onChange={(e) => setGroupNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter group number"
              />
            </div>
          </div>

          {/* Rating Scale Table */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Scale</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Rating</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {RATING_SCALE.map((scale) => (
                    <tr key={scale.rating}>
                      <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900">{scale.rating}</td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">{scale.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Behavior Assessment Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Behavior Assessment</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Behavior</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {behaviors.map((behavior, idx) => (
                    <tr key={idx}>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{behavior.name}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <button
                          onClick={() => openFeedbackModal(idx)}
                          className={`px-4 py-2 text-sm font-semibold rounded transition-all ${behavior.rating
                              ? "bg-blue-500 text-white hover:bg-blue-600"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                          {behavior.rating || 0}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>


          {/* Signature Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Signatures</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Designation</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">RM Batch Recruitment</td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-500">sign1</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Unit Head Batch Recruitment</td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-500">sign2</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">Head of L&OD</td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-500">sign9</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Score Display */}
          {score !== null && scorePercentage !== null && (
            <div className="mb-6 p-4 bg-yellow-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800">
                Score: {score} / {behaviors.length * 4} ({scorePercentage}%)
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Link
              href={`/admin/jobs/${params.id}/rounds/${params.roundId}/shortlisted`}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
            >
              BACK
            </Link>
            <div className="flex gap-4">
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="px-10 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                {saving ? "Saving..." : "NEXT"}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="px-10 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                {saving ? "Submitting..." : "SUBMIT"}
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* Feedback Slide-Over Modal */}
      {isFeedbackOpen && selectedBehaviorIndex !== null && selectedBehavior && selectedBehaviorDef && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
            onClick={closeFeedbackModal}
          />

          {/* Slide-Over Panel */}
          <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="bg-blue-500 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <h3 className="text-lg font-bold text-white">
                  {selectedBehavior.name}
                </h3>
                <button
                  onClick={closeFeedbackModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 space-y-6">
                {/* Behavior Description */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    Takes responsibility and works hard to deliver projects to high standards. Manages time and tasks appropriately.
                  </p>
                </div>

                {/* Positive and Negative Indicators - Two Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Positive Indicators */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Makes an Impact</h4>
                    <div className="space-y-2">
                      {selectedBehaviorDef.positiveIndicators.map((indicator, i) => (
                        <div key={i} className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                          {indicator}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column - Negative Indicators */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Awareness of (Seizes) Business Opportunities</h4>
                    <div className="space-y-2">
                      {selectedBehaviorDef.negativeIndicators.map((indicator, i) => (
                        <div key={i} className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                          {indicator}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Evidence Section */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Evidence:</label>
                  <textarea
                    value={selectedBehavior.feedback || ""}
                    onChange={(e) => updateBehavior(selectedBehaviorIndex, { feedback: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                    rows={6}
                    placeholder="Write here..."
                  />
                </div>

                {/* Rating Section */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-3">Rating</label>
                  <div className="grid grid-cols-1 gap-3">
                    {RATING_SCALE.map((scale) => (
                      <button
                        key={scale.rating}
                        type="button"
                        onClick={() => handleRatingSelect(scale.rating)}
                        className={`px-4 py-3 border-2 rounded-lg text-left text-sm font-medium transition-all ${selectedBehavior.rating === scale.rating
                            ? "bg-yellow-100 border-yellow-500 text-yellow-900"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                          }`}
                      >
                        {scale.rating === 4 && "Excellent evidence of competence"}
                        {scale.rating === 3 && "Strong evidence of competence"}
                        {scale.rating === 2 && "Some development required"}
                        {scale.rating === 1 && "Significant development required"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between sticky bottom-0">
                <button
                  onClick={closeFeedbackModal}
                  className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all"
                >
                  BACK
                </button>
                <button
                  onClick={() => {
                    if (selectedBehavior.rating) {
                      closeFeedbackModal()
                    } else {
                      setError("Please select a rating before closing")
                    }
                  }}
                  className="px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-all"
                >
                  {selectedBehavior.rating ? "SAVE & CLOSE" : "SELECT RATING"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
