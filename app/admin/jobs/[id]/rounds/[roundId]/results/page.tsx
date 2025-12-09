"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"

interface ResultsStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  rejected: number
  passed: number
  failed: number
  averageScore: number
}

interface CandidateResult {
  id: string
  name: string
  email: string
  score?: number | null
  maxScore?: number | null
  scorePercentage?: number | null
  recommendation?: string | null
  status: string
  interviewer?: string
  assessedAt?: string
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const [stats, setStats] = useState<ResultsStats | null>(null)
  const [candidates, setCandidates] = useState<CandidateResult[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [recFilter, setRecFilter] = useState<string>("all")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => {
    fetchResults()
  }, [])

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/results`)
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        setCandidates(data.candidates || [])
      }
    } catch (error) {
      console.error("Error fetching results:", error)
    } finally {
      setLoading(false)
    }
  }

  const formattedAverage = useMemo(() => {
    if (!stats) return "-"
    return Number.isFinite(stats.averageScore) ? stats.averageScore.toFixed(1) : "-"
  }, [stats])

  const filteredCandidates = useMemo(() => {
    const term = search.trim().toLowerCase()
    return candidates.filter((c) => {
      const matchesSearch =
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term)
      const matchesStatus = statusFilter === "all" || c.status === statusFilter
      const matchesRec = recFilter === "all" || (c.recommendation || "").toUpperCase() === recFilter
      return matchesSearch && matchesStatus && matchesRec
    })
  }, [candidates, search, statusFilter, recFilter])

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredCandidates.map((c) => c.id))
    } else {
      setSelectedIds([])
    }
  }

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    )
  }

  if (loading) return <div className="p-8 text-center">Loading results...</div>
  if (!stats) return <div className="p-8 text-center">No results available</div>

  const statusBadge = (status: string) => {
    const base = "px-2 py-1 text-xs font-semibold rounded-full"
    switch (status) {
      case "PASSED":
        return `${base} bg-green-100 text-green-800`
      case "FAILED":
        return `${base} bg-red-100 text-red-800`
      case "IN_PROGRESS":
        return `${base} bg-yellow-100 text-yellow-800`
      default:
        return `${base} bg-gray-100 text-gray-700`
    }
  }

  const recommendationBadge = (rec?: string | null) => {
    if (!rec) return <span className="text-sm text-gray-400">-</span>
    const base = "px-2 py-1 text-xs font-semibold rounded-full"
    return (
      <span className={rec === "HIRE" ? `${base} bg-green-100 text-green-800` : `${base} bg-red-100 text-red-800`}>
        {rec}
      </span>
    )
  }

  const moveToNextRound = async () => {
    if (selectedIds.length === 0) return
    try {
      setBulkLoading(true)
      const res = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "move_next", candidateIds: selectedIds })
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedIds([])
        
        // Redirect to next round's applied list if nextStepId is available
        if (data.nextStepId) {
          router.push(`/admin/jobs/${params.id}/rounds/${data.nextStepId}/applied`)
        } else {
          // If no next step, refresh the current page
          await fetchResults()
        }
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err?.error || "Failed to move candidates to next round")
      }
    } catch (error) {
      console.error("Error moving to next round:", error)
      alert("Error moving candidates")
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Round Results</h2>
          <p className="text-sm text-gray-500">Job #{params.id} · Round #{params.roundId}</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate or email"
            className="w-full sm:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PENDING">Pending</option>
          </select>
          <select
            value={recFilter}
            onChange={(e) => setRecFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All recommendations</option>
            <option value="HIRE">HIRE</option>
            <option value="NO_HIRE">NO_HIRE</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-50 border-blue-100">
          <div className="text-sm text-blue-600 font-medium">Total Candidates</div>
          <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
        </Card>
        <Card className="p-4 bg-green-50 border-green-100">
          <div className="text-sm text-green-600 font-medium">Passed</div>
          <div className="text-2xl font-bold text-green-900">{stats.passed}</div>
        </Card>
        <Card className="p-4 bg-red-50 border-red-100">
          <div className="text-sm text-red-600 font-medium">Failed</div>
          <div className="text-2xl font-bold text-red-900">{stats.failed}</div>
        </Card>
        <Card className="p-4 bg-purple-50 border-purple-100">
          <div className="text-sm text-purple-600 font-medium">Average Score</div>
          <div className="text-2xl font-bold text-purple-900">{formattedAverage}</div>
        </Card>
        <Card className="p-4 bg-yellow-50 border-yellow-100">
          <div className="text-sm text-yellow-600 font-medium">In Progress</div>
          <div className="text-2xl font-bold text-yellow-900">{stats.inProgress}</div>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="text-sm text-slate-600 font-medium">Pending</div>
          <div className="text-2xl font-bold text-slate-900">{stats.pending}</div>
        </Card>
        <Card className="p-4 bg-emerald-50 border-emerald-100">
          <div className="text-sm text-emerald-600 font-medium">Completed</div>
          <div className="text-2xl font-bold text-emerald-900">{stats.completed}</div>
        </Card>
        <Card className="p-4 bg-rose-50 border-rose-100">
          <div className="text-sm text-rose-600 font-medium">Rejected</div>
          <div className="text-2xl font-bold text-rose-900">{stats.rejected}</div>
        </Card>
      </div>

      {/* Candidates Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Candidate Assessments</h3>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">
              {filteredCandidates.length} shown · {selectedIds.length} selected
            </div>
            <button
              onClick={moveToNextRound}
              disabled={selectedIds.length === 0 || bulkLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkLoading ? "Moving..." : "Move to Next Round"}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    checked={selectedIds.length > 0 && selectedIds.length === filteredCandidates.length}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommendation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interviewer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessed At</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCandidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(candidate.id)}
                      onChange={(e) => toggleSelectOne(candidate.id, e.target.checked)}
                      aria-label={`Select ${candidate.name}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                    <div className="text-xs text-gray-500">{candidate.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {candidate.score !== undefined && candidate.score !== null
                      ? `${candidate.score}/${candidate.maxScore ?? 150}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {candidate.scorePercentage !== undefined && candidate.scorePercentage !== null
                      ? `${candidate.scorePercentage}%`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">{recommendationBadge(candidate.recommendation)}</td>
                  <td className="px-4 py-3">
                    <span className={statusBadge(candidate.status)}>{candidate.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{candidate.interviewer || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {candidate.assessedAt ? new Date(Number(candidate.assessedAt) * 1000).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {candidates.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-500">No candidates assessed yet.</div>
          )}
        </div>
      </Card>
    </div>
  )
}
