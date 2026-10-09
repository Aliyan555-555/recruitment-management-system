"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { JobPipelineHeaderLoader } from "@/components/admin/useJobPipeline"
import { RoundSubNav } from "@/components/admin/RoundSubNav"
import { QueueEmptyState } from "@/components/admin/QueueEmptyState"

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
  movedToNext?: boolean
  evaluatorCount?: number
  isSplit?: boolean
  hireVotes?: number
  noHireVotes?: number
}

interface WorkflowStep {
  id: string
  stepName: string
  stepType: string | null
  stepOrder: number
  job?: {
    id: string
    title: string
    jobCode?: string | null
  }
  nextStep?: {
    id: string
    stepName: string
    stepOrder: number
  } | null
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const [stats, setStats] = useState<ResultsStats | null>(null)
  const [candidates, setCandidates] = useState<CandidateResult[]>([])
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [recFilter, setRecFilter] = useState<string>("all")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [roundCounts, setRoundCounts] = useState({ pending: 0, shortlisted: 0 })

  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => {
    async function loadCounts() {
      const res = await fetch(
        `/api/admin/jobs/${params.id}/rounds/${params.roundId}/candidates?status=pending`
      )
      if (res.ok) {
        const data = await res.json()
        if (data.counts) {
          setRoundCounts({
            pending: data.counts.pending,
            shortlisted: data.counts.shortlisted,
          })
        }
      }
    }
    loadCounts()
  }, [params.id, params.roundId])

  useEffect(() => {
    fetchResults()
    fetchWorkflowStep()
  }, [])

  const fetchWorkflowStep = async () => {
    try {
      const res = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}`)
      if (res.status === 404 || res.status === 400) {
        router.replace("/admin/jobs")
        return
      }
      if (res.ok) {
        const data = await res.json()
        setWorkflowStep(data.workflowStep)
      }
    } catch (error) {
      console.error("Error fetching workflow step:", error)
      router.replace("/admin/jobs")
    }
  }

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/results`)
      if (res.status === 404 || res.status === 400) {
        router.replace("/admin/jobs")
        return
      }
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        setCandidates(data.candidates || [])
      }
    } catch (error) {
      console.error("Error fetching results:", error)
      router.replace("/admin/jobs")
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

      let matchesStatus = statusFilter === "all" || c.status === statusFilter
      if (statusFilter === "PASSED") {
        matchesStatus = c.recommendation === "HIRE" || (c.status === "COMPLETED" && c.recommendation !== "NO_HIRE")
      } else if (statusFilter === "FAILED") {
        matchesStatus = c.recommendation === "NO_HIRE" || c.status === "REJECTED"
      }

      const matchesRec = recFilter === "all" || (c.recommendation || "").toUpperCase() === recFilter
      return matchesSearch && matchesStatus && matchesRec
    })
  }, [candidates, search, statusFilter, recFilter])

  // Only allow selection of candidates who completed the round and haven't been moved yet
  const isSelectable = (candidate: CandidateResult) => {
    return candidate.status === "COMPLETED" && !candidate.movedToNext
  }

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableCandidates = filteredCandidates.filter(isSelectable)
      setSelectedIds(selectableCandidates.map((c) => c.id))
    } else {
      setSelectedIds([])
    }
  }

  const toggleSelectOne = (id: string, checked: boolean) => {
    const candidate = candidates.find(c => c.id === id)
    if (!candidate || !isSelectable(candidate)) return

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
      case "COMPLETED":
        return `${base} bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`
      case "FAILED":
      case "REJECTED":
        return `${base} bg-destructive/10 text-destructive`
      case "IN_PROGRESS":
        return `${base} bg-yellow-500/10 text-yellow-600 dark:text-yellow-400`
      case "PENDING":
        return `${base} bg-muted text-muted-foreground`
      default:
        return `${base} bg-muted text-muted-foreground`
    }
  }

  const recommendationBadge = (rec?: string | null) => {
    if (!rec) return <span className="text-sm text-muted-foreground">-</span>
    const base = "px-2 py-1 text-xs font-semibold rounded-full"
    return (
      <span className={rec === "HIRE" ? `${base} bg-emerald-500/10 text-emerald-600 dark:text-emerald-400` : `${base} bg-destructive/10 text-destructive`}>
        {rec}
      </span>
    )
  }

  const rejectSelected = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Reject ${selectedIds.length} candidate${selectedIds.length === 1 ? "" : "s"}? This closes their application.`)) return
    try {
      setBulkLoading(true)
      const res = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", candidateIds: selectedIds })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err?.error || "Failed to reject candidates")
      }
      setSelectedIds([])
      await fetchResults()
    } catch (error) {
      console.error("Error rejecting candidates:", error)
      alert("Error rejecting candidates")
    } finally {
      setBulkLoading(false)
    }
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
        // Refresh the current page to show updated statuses
        await fetchResults()
      }
    } catch (error) {
      console.error("Error moving to next round:", error)
      alert("Error moving candidates")
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-8 p-6">
      <JobPipelineHeaderLoader jobId={params.id as string} currentStageId={params.roundId as string} />

      <RoundSubNav
        jobId={params.id as string}
        roundId={params.roundId as string}
        stepType={workflowStep?.stepType}
        activeView="results"
        counts={roundCounts}
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/jobs" className="hover:text-foreground transition-colors">Jobs</Link>
        <span>/</span>
        <Link href={`/admin/jobs/${params.id}`} className="hover:text-foreground transition-colors">
          {workflowStep?.job?.title || "Job"}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{workflowStep?.stepName || "Round"} - Results</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
       
          <h2 className="text-2xl font-bold text-foreground">Round Results</h2>
          <p className="text-sm text-muted-foreground">{workflowStep?.stepName || "Round"} assessment results</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate or email"
            className="w-full sm:w-64 border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            value={recFilter}
            onChange={(e) => setRecFilter(e.target.value)}
            className="border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All recommendations</option>
            <option value="HIRE">HIRE</option>
            <option value="NO_HIRE">NO_HIRE</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-primary/5 border-primary/10">
          <div className="text-sm text-primary font-medium">Total Candidates</div>
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
        </Card>
        <Card className="p-4 bg-emerald-500/5 border-emerald-500/10">
          <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Passed</div>
          <div className="text-2xl font-bold text-foreground">{stats.passed}</div>
        </Card>
        <Card className="p-4 bg-destructive/5 border-destructive/10">
          <div className="text-sm text-destructive font-medium">Failed</div>
          <div className="text-2xl font-bold text-foreground">{stats.failed}</div>
        </Card>
        <Card className="p-4 bg-purple-500/5 border-purple-500/10">
          <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Average Score</div>
          <div className="text-2xl font-bold text-foreground">{formattedAverage}</div>
        </Card>
        <Card className="p-4 bg-yellow-500/5 border-yellow-500/10">
          <div className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">In Progress</div>
          <div className="text-2xl font-bold text-foreground">{stats.inProgress}</div>
        </Card>
        <Card className="p-4 bg-muted/50 border-border">
          <div className="text-sm text-muted-foreground font-medium">Pending</div>
          <div className="text-2xl font-bold text-foreground">{stats.pending}</div>
        </Card>
        <Card className="p-4 bg-emerald-500/5 border-emerald-500/10">
          <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Completed</div>
          <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
        </Card>
        <Card className="p-4 bg-destructive/5 border-destructive/10">
          <div className="text-sm text-destructive font-medium">Rejected</div>
          <div className="text-2xl font-bold text-foreground">{stats.rejected}</div>
        </Card>
      </div>

      {/* Candidates Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Candidate Assessments</h3>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {filteredCandidates.length} shown · {selectedIds.length} selected
            </div>
            <button
              onClick={rejectSelected}
              disabled={selectedIds.length === 0 || bulkLoading}
              className="px-4 py-2 border border-destructive/50 text-destructive rounded-lg text-sm font-semibold hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reject selected
            </button>
            <button
              onClick={moveToNextRound}
              disabled={selectedIds.length === 0 || bulkLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkLoading ? "Moving..." : "Move to Next Round"}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    checked={
                      filteredCandidates.filter(isSelectable).length > 0 &&
                      filteredCandidates.filter(isSelectable).every(c => selectedIds.includes(c.id))
                    }
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Candidate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">% Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Recommendation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Interviewer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Assessed At</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    {candidates.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-lg font-medium text-foreground">
                          No assessments in this round yet
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Complete assessments on the In Round page first.
                        </p>
                        <Link
                          href={`/admin/jobs/${params.id}/rounds/${params.roundId}/shortlisted`}
                          className="inline-block mt-4 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg"
                        >
                          Go to In Round
                        </Link>
                      </div>
                    ) : (
                      <QueueEmptyState
                        variant="search-miss"
                        searchTerm={search || `${statusFilter !== "all" ? statusFilter : recFilter !== "all" ? recFilter : "filters"}`}
                        queueLabel="Results"
                        actions={[
                          {
                            label: "Clear filters",
                            onClick: () => {
                              setSearch("")
                              setStatusFilter("all")
                              setRecFilter("all")
                            },
                          },
                        ]}
                      />
                    )}
                  </td>
                </tr>
              ) : (
              filteredCandidates.map((candidate) => (
                <tr
                  key={candidate.id}
                  className={`hover:bg-muted/50 ${!isSelectable(candidate) ? 'bg-muted/30 opacity-60' : ''}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(candidate.id)}
                      onChange={(e) => toggleSelectOne(candidate.id, e.target.checked)}
                      disabled={!isSelectable(candidate)}
                      className={!isSelectable(candidate) ? 'cursor-not-allowed opacity-50' : ''}
                      aria-label={`Select ${candidate.name}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-foreground">{candidate.name}</div>
                    <div className="text-xs text-muted-foreground">{candidate.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">
                    {candidate.score !== undefined && candidate.score !== null
                      ? `${candidate.score}/${candidate.maxScore ?? 150}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {candidate.scorePercentage !== undefined && candidate.scorePercentage !== null
                      ? `${candidate.scorePercentage}%`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {recommendationBadge(candidate.recommendation)}
                    {candidate.isSplit && <div className="mt-1 text-xs text-amber-600">Split decision ({candidate.hireVotes}-{candidate.noHireVotes})</div>}
                    {(candidate.evaluatorCount ?? 0) > 1 && !candidate.isSplit && (
                      <div className="mt-1 text-xs text-muted-foreground">{candidate.hireVotes} of {candidate.evaluatorCount} recommend</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadge(candidate.status)}>{candidate.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{candidate.interviewer || "-"}</td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {candidate.assessedAt ? new Date(Number(candidate.assessedAt) * 1000).toLocaleString() : "-"}
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex flex-wrap justify-between items-center gap-4 mt-6">
        <Link
          href={`/admin/jobs/${params.id}/rounds/${params.roundId}/shortlisted`}
          className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-foreground bg-background border border-input rounded-lg hover:bg-accent transition-all shadow-sm hover:shadow-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        {workflowStep?.nextStep ? (
          <Link
            href={`/admin/jobs/${params.id}/rounds/${workflowStep.nextStep.id}/applied`}
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
          >
            Next Round: {workflowStep.nextStep.stepName}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <Link
            href={`/admin/jobs/${params.id}`}
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
          >
            Back to Job
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  )
}
