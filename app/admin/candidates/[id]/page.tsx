"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

interface PipelineData {
  id: string
  candidate: {
    name: string
    email: string
    phone: string
    location: string
  }
  job: {
    title: string
    company: string
    description: string
  }
  application: {
    status: string
    appliedAt: string
    cv: {
      id: string
      filename: string
      filepath: string
    }
  }
  status: string
  currentStep: number
  startedAt: string
  steps: Array<{
    id: string
    stepName: string
    stepOrder: number
    status: string
    isRequired: boolean
    isSkippable: boolean
    interviewer: { name: string; email: string } | null
    feedback: string | null
    interviews: Array<{
      interviewerName: string
      feedback: string | null
      rating: number | null
      recommendation: string | null
      submittedAt: string | null
    }>
  }>
}

export default function CandidatePipelineDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [pipeline, setPipeline] = useState<PipelineData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPipeline() {
      try {
        const res = await fetch(`/api/admin/pipelines/${params.id}`)
        const data = await res.json()
        setPipeline(data.pipeline)
      } catch (error) {
        console.error("Error fetching pipeline:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPipeline()
  }, [params.id])

  if (loading) {
    return <div>Loading pipeline details...</div>
  }

  if (!pipeline) {
    return <div>Pipeline not found</div>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-gray-100 text-gray-800"
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800"
      case "COMPLETED":
        return "bg-green-100 text-green-800"
      case "SKIPPED":
        return "bg-yellow-100 text-yellow-800"
      case "REJECTED":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/candidates"
          className="text-blue-600 hover:underline mb-2 inline-block"
        >
          ← Back to Candidates
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Pipeline Details</h2>
      </div>

      {/* Candidate Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Candidate Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Name</label>
            <p className="font-medium text-gray-900">{pipeline.candidate.name}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Email</label>
            <p className="font-medium text-gray-900">{pipeline.candidate.email}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Phone</label>
            <p className="font-medium text-gray-900">{pipeline.candidate.phone || "N/A"}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Location</label>
            <p className="font-medium text-gray-900">{pipeline.candidate.location || "N/A"}</p>
          </div>
        </div>
      </div>

      {/* Job Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Information</h3>
        <div className="space-y-2">
          <div>
            <label className="text-sm text-gray-500">Position</label>
            <p className="font-medium text-gray-900">{pipeline.job.title}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Company</label>
            <p className="font-medium text-gray-900">{pipeline.job.company}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">CV</label>
            <a
              href={pipeline.application.cv.filepath}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {pipeline.application.cv.filename}
            </a>
          </div>
        </div>
      </div>

      {/* Pipeline Steps */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Steps</h3>
        <div className="space-y-4">
          {pipeline.steps.map((step, index) => (
            <div
              key={step.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{step.stepName}</h4>
                  <p className="text-sm text-gray-500">
                    Step {step.stepOrder} {step.isRequired ? "• Required" : "• Optional"}
                  </p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(step.status)}`}>
                  {step.status.replace(/_/g, " ")}
                </span>
              </div>

              {step.interviewer && (
                <div className="mb-2">
                  <label className="text-sm text-gray-500">Interviewer</label>
                  <p className="text-sm font-medium text-gray-900">
                    {step.interviewer.name} ({step.interviewer.email})
                  </p>
                </div>
              )}

              {step.interviews.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Interview Feedback</h5>
                  {step.interviews.map((interview, idx) => (
                    <div key={idx} className="space-y-1">
                      {interview.rating && (
                        <p className="text-sm text-gray-700">
                          Rating: {interview.rating}/5
                        </p>
                      )}
                      {interview.recommendation && (
                        <p className="text-sm text-gray-700">
                          Recommendation: {interview.recommendation}
                        </p>
                      )}
                      {interview.feedback && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {interview.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

