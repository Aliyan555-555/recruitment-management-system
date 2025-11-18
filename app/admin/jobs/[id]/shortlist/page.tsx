"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

interface Candidate {
  id: string
  candidateId: string
  candidate: {
    name: string
    email: string
    phone: string
    location: string
  }
  status: string
  appliedAt: string
  cv: {
    id: string
    filename: string
    filepath: string
  }
}

export default function ShortlistPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchCandidates()
  }, [jobId, statusFilter])

  async function fetchCandidates() {
    try {
      setLoading(true)
      const url = statusFilter
        ? `/api/admin/jobs/${jobId}/shortlist?status=${statusFilter}`
        : `/api/admin/jobs/${jobId}/shortlist`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setCandidates(data.applications || [])
      }
    } catch (error) {
      console.error("Error fetching candidates:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleShortlist(action: "select" | "reject") {
    if (selectedCandidates.size === 0) {
      alert("Please select at least one candidate")
      return
    }

    try {
      setActionLoading(true)
      const res = await fetch(`/api/admin/jobs/${jobId}/shortlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateIds: Array.from(selectedCandidates),
          action
        })
      })

      if (res.ok) {
        setSelectedCandidates(new Set())
        fetchCandidates()
        alert(`Candidates ${action === "select" ? "shortlisted" : "rejected"} successfully`)
      } else {
        const data = await res.json()
        alert(data.error || "Failed to update candidates")
      }
    } catch (error) {
      console.error("Error shortlisting:", error)
      alert("Failed to update candidates")
    } finally {
      setActionLoading(false)
    }
  }

  function toggleCandidate(id: string) {
    const newSelected = new Set(selectedCandidates)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedCandidates(newSelected)
  }

  function toggleAll() {
    if (selectedCandidates.size === candidates.length) {
      setSelectedCandidates(new Set())
    } else {
      setSelectedCandidates(new Set(candidates.map(c => c.candidateId)))
    }
  }

  const shortlistedCount = candidates.filter(c => c.status === "SHORTLISTED").length
  const appliedCount = candidates.filter(c => c.status === "APPLIED").length

  return (

      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shortlist Candidates</h1>
              <p className="text-gray-600 mt-1">Review and shortlist candidates for bulk hiring</p>
            </div>
            <Link
              href={`/admin/jobs/${jobId}`}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to Job
            </Link>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="px-4 py-2 bg-blue-50 rounded-lg">
              <span className="text-sm text-gray-600">Total Applied: </span>
              <span className="font-semibold text-blue-600">{candidates.length}</span>
            </div>
            <div className="px-4 py-2 bg-green-50 rounded-lg">
              <span className="text-sm text-gray-600">Shortlisted: </span>
              <span className="font-semibold text-green-600">{shortlistedCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">All Candidates</option>
              <option value="applied">Applied Only</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="rejected">Rejected</option>
            </select>

            {selectedCandidates.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedCandidates.size} selected
                </span>
                <button
                  onClick={() => handleShortlist("select")}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Shortlist Selected
                </button>
                <button
                  onClick={() => handleShortlist("reject")}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Reject Selected
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600">No candidates found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.size === candidates.length && candidates.length > 0}
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Candidate</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Contact</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Applied</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">CV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCandidates.has(candidate.candidateId)}
                        onChange={() => toggleCandidate(candidate.candidateId)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{candidate.candidate.name}</div>
                      <div className="text-sm text-gray-500">{candidate.candidate.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{candidate.candidate.phone || "N/A"}</div>
                      <div>{candidate.candidate.location || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          candidate.status === "SHORTLISTED"
                            ? "bg-green-100 text-green-800"
                            : candidate.status === "REMOVED"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {candidate.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(Number(candidate.appliedAt) * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`/api/profile/cv/${candidate.cv.id}`}
                        target="_blank"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View CV
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {shortlistedCount > 0 && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-green-900">
                  {shortlistedCount} candidate(s) shortlisted
                </p>
                <p className="text-sm text-green-700 mt-1">
                  You can now create Batch 1 from shortlisted candidates
                </p>
              </div>
              <Link
                href={`/admin/jobs/${jobId}/batches`}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Create Batch 1
              </Link>
            </div>
          </div>
        )}
      </div>

  )
}

