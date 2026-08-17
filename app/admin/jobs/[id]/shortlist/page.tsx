"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"

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
  const [firstRound, setFirstRound] = useState<{ id: string; stepName: string } | null>(null)

  useEffect(() => {
    async function fetchWorkflow() {
      try {
        const res = await fetch(`/api/admin/jobs/${jobId}/workflow`)
        if (res.ok) {
          const data = await res.json()
          if (data.workflow?.rounds?.length > 0) {
            setFirstRound({
              id: data.workflow.rounds[0].id,
              stepName: data.workflow.rounds[0].stepName
            })
          }
        }
      } catch (error) {
        console.error("Error fetching workflow:", error)
      }
    }
    if (jobId) {
      fetchWorkflow()
    }
  }, [jobId])

  const fetchCandidates = useCallback(async () => {
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
  }, [jobId, statusFilter])

  useEffect(() => {
    fetchCandidates()
  }, [fetchCandidates])


  async function handleShortlist(action: "select" | "reject") {
    if (selectedCandidates.size === 0) {
      toast.error("Please select at least one candidate")
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
        toast.success(`Candidates ${action === "select" ? "shortlisted" : "rejected"} successfully`)
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to update candidates")
      }
    } catch (error) {
      console.error("Error shortlisting:", error)
      toast.error("Failed to update candidates")
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
            <h1 className="text-2xl font-bold text-foreground">Candidate Shortlisting</h1>
            <p className="text-muted-foreground mt-1">Review and shortlist candidates manually or with AI</p>
          </div>
          <div className="flex items-center gap-3">
            {firstRound && (
              <Link
                href={`/admin/jobs/${jobId}/rounds/${firstRound.id}/applied`}
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                Next Round ({firstRound.stepName}) →
              </Link>
            )}
            <Link
              href={`/admin/jobs/${jobId}`}
              className="px-4 py-2 text-foreground bg-background border border-input rounded-lg hover:bg-accent"
            >
              Back to Job Details
            </Link>
          </div>
        </div>

        {/* Shortlist Mode Navigation Tabs */}
        <div className="flex border-b border-border mb-6">
          <Link
            href={`/admin/jobs/${jobId}/shortlist`}
            className="px-4 py-2 text-sm font-semibold border-b-2 border-primary text-primary flex items-center gap-2"
          >
            📋 Manual Shortlist
          </Link>
          <Link
            href={`/admin/jobs/${jobId}/ai-shortlist`}
            className="px-4 py-2 text-sm font-semibold border-b-2 border-transparent text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
          >
            ✨ AI Shortlist
          </Link>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="px-4 py-2 bg-primary/10 rounded-lg">
            <span className="text-sm text-muted-foreground">Total Applied: </span>
            <span className="font-semibold text-primary">{candidates.length}</span>
          </div>
          <div className="px-4 py-2 bg-emerald-500/10 rounded-lg">
            <span className="text-sm text-muted-foreground">Shortlisted: </span>
            <span className="font-semibold text-emerald-500">{shortlistedCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-input rounded-lg bg-background text-foreground"
          >
            <option value="">All Candidates</option>
            <option value="applied">Applied Only</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="rejected">Rejected</option>
          </select>

          {selectedCandidates.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedCandidates.size} selected
              </span>
              <button
                onClick={() => handleShortlist("select")}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                Shortlist Selected
              </button>
              <button
                onClick={() => handleShortlist("reject")}
                disabled={actionLoading}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50"
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
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <p className="text-muted-foreground">No candidates found</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedCandidates.size === candidates.length && candidates.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Candidate</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Contact</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Applied</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">CV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.has(candidate.candidateId)}
                      onChange={() => toggleCandidate(candidate.candidateId)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{candidate.candidate.name}</div>
                    <div className="text-sm text-muted-foreground">{candidate.candidate.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    <div>{candidate.candidate.phone || "N/A"}</div>
                    <div>{candidate.candidate.location || "N/A"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${candidate.status === "SHORTLISTED"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : candidate.status === "REMOVED"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                        }`}
                    >
                      {candidate.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(Number(candidate.appliedAt) * 1000).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    Profile used
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

