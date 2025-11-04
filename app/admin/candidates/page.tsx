"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface CandidatePipeline {
  id: string
  candidateName: string
  candidateEmail: string
  jobTitle: string
  jobCompany: string
  status: string
  currentStep: number
  totalSteps: number
  startedAt: string
}

export default function AdminCandidatesPage() {
  const [pipelines, setPipelines] = useState<CandidatePipeline[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPipelines() {
      try {
        const res = await fetch("/api/admin/pipelines")
        const data = await res.json()
        setPipelines(data.pipelines || [])
      } catch (error) {
        console.error("Error fetching pipelines:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPipelines()
  }, [])

  if (loading) {
    return <div>Loading candidate pipelines...</div>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800"
      case "COMPLETED":
        return "bg-green-100 text-green-800"
      case "REJECTED":
        return "bg-red-100 text-red-800"
      case "ON_HOLD":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Candidate Pipelines</h2>
      </div>

      {pipelines.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No candidate pipelines yet.</p>
          <p className="text-sm text-gray-400">
            Candidates will appear here once they apply for jobs.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pipelines.map((pipeline) => (
                <tr key={pipeline.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {pipeline.candidateName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {pipeline.candidateEmail}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {pipeline.jobTitle}
                      </div>
                      <div className="text-sm text-gray-500">
                        {pipeline.jobCompany}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Step {pipeline.currentStep} of {pipeline.totalSteps}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(pipeline.currentStep / pipeline.totalSteps) * 100}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(pipeline.status)}`}
                    >
                      {pipeline.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/admin/candidates/${pipeline.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

