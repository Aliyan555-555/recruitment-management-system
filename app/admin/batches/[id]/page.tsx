"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

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
    cv: {
      id: string
      filename: string
      filepath: string
    } | null
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

export default function BatchDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const batchId = params.id as string
  const [batch, setBatch] = useState<Batch | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBatch()
  }, [batchId])

  async function fetchBatch() {
    try {
      const res = await fetch(`/api/admin/batches/${batchId}`)
      if (res.ok) {
        const data = await res.json()
        setBatch(data.batch)
      }
    } catch (error) {
      console.error("Error fetching batch:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    try {
      const res = await fetch(`/api/admin/batches/${batchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        fetchBatch()
        alert("Batch status updated")
      } else {
        const data = await res.json()
        alert(data.error || "Failed to update status")
      }
    } catch (error) {
      console.error("Error updating status:", error)
      alert("Failed to update status")
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "PENDING_ADMIN":
        return "bg-yellow-100 text-yellow-800"
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800"
      case "COMPLETED":
        return "bg-green-100 text-green-800"
      case "CANCELLED":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  function getCandidateStatusColor(status: string) {
    switch (status) {
      case "SELECTED":
        return "bg-green-100 text-green-800"
      case "REJECTED":
        return "bg-red-100 text-red-800"
      case "REVIEW":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
        <div className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
    )
  }

  if (!batch) {
    return (
  
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-gray-600">Batch not found</p>
          </div>
        </div>
    )
  }

  const selectedCount = batch.candidates.filter(c => c.currentStatus === "SELECTED").length
  const rejectedCount = batch.candidates.filter(c => c.currentStatus === "REJECTED").length
  const reviewCount = batch.candidates.filter(c => c.currentStatus === "REVIEW").length

  return (
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {batch.batchName || `Batch ${batch.batchNumber}`}
              </h1>
              <p className="text-gray-600 mt-1">Batch details and candidate evaluations</p>
            </div>
            <Link
              href={`/admin/jobs/${batch.jobId}/batches`}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to Batches
            </Link>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg">
              <span className="text-sm text-gray-600">Status: </span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(batch.status)}`}>
                {batch.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="px-4 py-2 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-600">Selected: </span>
              <span className="font-semibold text-green-600">{selectedCount}</span>
            </div>
            <div className="px-4 py-2 bg-red-50 rounded-lg">
              <span className="text-sm text-gray-600">Rejected: </span>
              <span className="font-semibold text-red-600">{rejectedCount}</span>
            </div>
            <div className="px-4 py-2 bg-yellow-50 rounded-lg">
              <span className="text-sm text-gray-600">Review: </span>
              <span className="font-semibold text-yellow-600">{reviewCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Update Status:</span>
            <select
              value={batch.status}
              onChange={(e) => handleUpdateStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="PENDING_ADMIN">Pending Admin</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Candidate</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">CV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {batch.candidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {candidate.candidate.firstname} {candidate.candidate.lastname}
                    </div>
                    <div className="text-sm text-gray-500">{candidate.candidate.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getCandidateStatusColor(candidate.currentStatus)}`}
                    >
                      {candidate.currentStatus.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {candidate.application.cv ? (
                      <a
                        href={`/api/profile/cv/${candidate.application.cv.id}`}
                        target="_blank"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View CV
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">No CV</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
  )
}

