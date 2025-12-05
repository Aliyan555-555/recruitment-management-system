"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
// Layout is handled by app/interviewer/layout.tsx

interface Candidate {
  id: string
  candidateId: string
  applicationId: string
  currentStatus: string
  candidate: {
    id: string
    firstname: string
    lastname: string
    email: string
  }
  application: {
    id: string
  }
}

interface Batch {
  id: string
  jobId: string
  workflowStepId: string
  batchNumber: number
  batchName: string | null
  status: string
  candidates: Candidate[]
}

export default function BatchEvaluationPage() {
  const params = useParams()
  const router = useRouter()
  const batchId = params.id as string
  const [batch, setBatch] = useState<Batch | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [evaluations, setEvaluations] = useState<Record<string, {
    status: string
    feedback: string
    rating: number | null
  }>>({})

  useEffect(() => {
    fetchBatch()
  }, [batchId])

  async function fetchBatch() {
    try {
      const res = await fetch(`/api/interviewer/batches/${batchId}`)
      if (res.ok) {
        const data = await res.json()
        setBatch(data.batch)
        
        // Initialize evaluations
        const initialEvaluations: Record<string, any> = {}
        data.batch.candidates.forEach((c: Candidate) => {
          initialEvaluations[c.candidateId] = {
            status: c.currentStatus === "PENDING" ? "" : c.currentStatus,
            feedback: "",
            rating: null
          }
        })
        setEvaluations(initialEvaluations)
      }
    } catch (error) {
      console.error("Error fetching batch:", error)
    } finally {
      setLoading(false)
    }
  }

  function updateEvaluation(candidateId: string, field: string, value: any) {
    setEvaluations(prev => ({
      ...prev,
      [candidateId]: {
        ...prev[candidateId],
        [field]: value
      }
    }))
  }

  async function handleSubmit() {
    // Validate all candidates are evaluated
    const unevaluated = batch?.candidates.filter(c => {
      const evalData = evaluations[c.candidateId]
      return !evalData || !evalData.status
    })

    if (unevaluated && unevaluated.length > 0) {
      alert(`Please evaluate all candidates. ${unevaluated.length} candidate(s) remaining.`)
      return
    }

    try {
      setSubmitting(true)
      const evaluationArray = batch!.candidates.map(c => ({
        candidateId: c.candidateId,
        status: evaluations[c.candidateId].status,
        feedback: evaluations[c.candidateId].feedback || undefined,
        rating: evaluations[c.candidateId].rating || undefined
      }))

      const res = await fetch(`/api/interviewer/batches/${batchId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluations: evaluationArray
        })
      })

      if (res.ok) {
        alert("Evaluations submitted successfully")
        router.push("/interviewer/assignments")
      } else {
        const data = await res.json()
        alert(data.error || "Failed to submit evaluations")
      }
    } catch (error) {
      console.error("Error submitting evaluations:", error)
      alert("Failed to submit evaluations")
    } finally {
      setSubmitting(false)
    }
  }

  const evaluatedCount = batch?.candidates.filter(c => {
    const evalData = evaluations[c.candidateId]
    return evalData && evalData.status
  }).length || 0

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Batch not found</p>
      </div>
    )
  }

  return (
    <div>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {batch.batchName || `Batch ${batch.batchNumber}`}
              </h1>
              <p className="text-gray-600 mt-1">Evaluate candidates in this batch</p>
            </div>
            <div className="px-4 py-2 bg-blue-50 rounded-lg">
              <span className="text-sm text-gray-600">Progress: </span>
              <span className="font-semibold text-blue-600">
                {evaluatedCount} / {batch.candidates.length}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {batch.candidates.map((candidate) => {
            const evalData = evaluations[candidate.candidateId] || {
              status: "",
              feedback: "",
              rating: null
            }

            return (
              <div
                key={candidate.id}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {candidate.candidate.firstname} {candidate.candidate.lastname}
                    </h3>
                    <p className="text-sm text-gray-600">{candidate.candidate.email}</p>
                  </div>
                  <span className="px-3 py-1 text-sm text-gray-500 bg-blue-50 text-blue-700 rounded-lg">
                    Profile Used
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Evaluation Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={evalData.status}
                      onChange={(e) => updateEvaluation(candidate.candidateId, "status", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Status</option>
                      <option value="SELECTED">Selected</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="REVIEW">Review / Maybe</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Rating (1-10)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={evalData.rating || ""}
                      onChange={(e) => updateEvaluation(candidate.candidateId, "rating", e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Enter rating (optional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Feedback
                    </label>
                    <textarea
                      value={evalData.feedback}
                      onChange={(e) => updateEvaluation(candidate.candidateId, "feedback", e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Enter your feedback (optional)"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex items-center justify-end gap-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || evaluatedCount < batch.candidates.length}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Batch Evaluation"}
          </button>
        </div>
      </div>
    </div>
  )
}

