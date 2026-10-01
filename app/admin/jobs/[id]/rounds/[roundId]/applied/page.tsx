"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { CandidateQueueTabs } from "@/components/admin/CandidateQueueTabs"
import { QueueEmptyState } from "@/components/admin/QueueEmptyState"
import { JobPipelineHeaderLoader } from "@/components/admin/useJobPipeline"
import { RoundSubNav } from "@/components/admin/RoundSubNav"
import { formatStepStatus } from "@/lib/admin/application-status-labels"

interface Candidate {
  id: string
  name: string
  email: string
  appliedAt: string
  status: string
  applicationStatus?: string
  pipelineStepId: string
  assessmentStatus: "pending" | "in_progress" | "completed"
}

interface RoundCounts {
  pending: number
  inProgress: number
  completed: number
  rejected: number
  shortlisted: number
  total: number
}

interface WorkflowStep {
  id: string
  stepName: string
  stepType: string
  stepOrder: number
  job?: { id: string; title: string; jobCode?: string | null }
  nextStep?: { id: string; stepName: string; stepOrder: number } | null
}

type QueueTabId = "pending" | "rejected"

function formatAppliedDate(appliedAt: string) {
  try {
    const timestamp = Number(appliedAt)
    if (!timestamp) return "N/A"
    const date = new Date(timestamp < 1000000000000 ? timestamp * 1000 : timestamp)
    if (isNaN(date.getTime())) return "Invalid Date"
    return date.toLocaleDateString()
  } catch {
    return "Invalid Date"
  }
}

export default function AppliedCandidatesPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const roundId = params.roundId as string

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [counts, setCounts] = useState<RoundCounts>({
    pending: 0,
    inProgress: 0,
    completed: 0,
    rejected: 0,
    shortlisted: 0,
    total: 0,
  })
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<QueueTabId>("pending")
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const stepRes = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}`)
      if (stepRes.status === 404 || stepRes.status === 400) {
        router.replace("/admin/jobs")
        return
      }
      if (stepRes.ok) {
        const stepData = await stepRes.json()
        setWorkflowStep(stepData.workflowStep)
      }

      const statusParam = activeTab === "pending" ? "pending" : "rejected"
      const candidatesRes = await fetch(
        `/api/admin/jobs/${jobId}/rounds/${roundId}/candidates?status=${statusParam}`
      )
      if (candidatesRes.ok) {
        const candidatesData = await candidatesRes.json()
        setCandidates(candidatesData.candidates || [])
        if (candidatesData.counts) setCounts(candidatesData.counts)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      router.replace("/admin/jobs")
    } finally {
      setLoading(false)
    }
  }, [jobId, roundId, activeTab, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setSelectedCandidates(new Set())
  }, [activeTab])

  const handleShortlist = async (candidateIds: string[]) => {
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "shortlist", candidateIds }),
      })
      if (res.ok) {
        await fetchData()
        setSelectedCandidates(new Set())
      }
    } catch (error) {
      console.error("Error shortlisting candidates:", error)
    }
  }

  const handleReject = async (candidateIds: string[]) => {
    if (!confirm(`Are you sure you want to reject ${candidateIds.length} candidate(s)?`)) return
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", candidateIds }),
      })
      if (res.ok) {
        await fetchData()
        setSelectedCandidates(new Set())
      }
    } catch (error) {
      console.error("Error rejecting candidates:", error)
    }
  }

  const isSelectable = (candidate: Candidate) => candidate.status === "PENDING"

  const filteredCandidates = candidates.filter((candidate) => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return true
    return (
      candidate.name.toLowerCase().includes(term) ||
      candidate.email.toLowerCase().includes(term)
    )
  })

  const queueTabs = [
    { id: "pending", label: "Needs Review", count: counts.pending },
    { id: "rejected", label: "Rejected", count: counts.rejected },
  ]

  const showActions = activeTab === "pending"

  function renderTableEmpty() {
    if (searchTerm.trim() && filteredCandidates.length === 0 && candidates.length > 0) {
      return (
        <tr>
          <td colSpan={showActions ? 7 : 6}>
            <QueueEmptyState
              variant="search-miss"
              searchTerm={searchTerm}
              queueLabel={activeTab === "pending" ? "Needs Review" : "Rejected"}
              actions={[{ label: "Clear search", onClick: () => setSearchTerm("") }]}
            />
          </td>
        </tr>
      )
    }

    if (activeTab === "pending" && counts.pending === 0 && counts.total > 0) {
      return (
        <tr>
          <td colSpan={7}>
            <QueueEmptyState
              variant="queue-complete"
              queueLabel="Needs Review"
              counts={{
                inRound: counts.shortlisted,
                rejected: counts.rejected,
                remaining: 0,
              }}
              actions={[
                ...(counts.shortlisted > 0
                  ? [
                      {
                        label: "View In Round",
                        href: `/admin/jobs/${jobId}/rounds/${roundId}/shortlisted`,
                      },
                    ]
                  : []),
              ]}
            />
          </td>
        </tr>
      )
    }

    if (counts.total === 0) {
      return (
        <tr>
          <td colSpan={7}>
            <QueueEmptyState
              variant="no-applicants"
              actions={[
                { label: "Back to Job", href: `/admin/jobs/${jobId}` },
              ]}
            />
          </td>
        </tr>
      )
    }

    return (
      <tr>
        <td colSpan={showActions ? 7 : 6} className="px-6 py-12 text-center">
          <p className="text-muted-foreground">
            No {activeTab === "pending" ? "candidates awaiting review" : "rejected candidates"} in this round.
          </p>
        </td>
      </tr>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading candidates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:py-6">
        <JobPipelineHeaderLoader jobId={jobId} currentStageId={roundId} />

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Link href="/admin/jobs" className="hover:text-foreground transition-colors">
              Jobs
            </Link>
            <span>/</span>
            <Link href={`/admin/jobs/${jobId}`} className="hover:text-foreground transition-colors">
              {workflowStep?.job?.title || "Job"}
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">
              {workflowStep?.stepName || "Round"} — Needs review
            </span>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">
            {workflowStep?.stepName || "Round"} — Needs Review
          </h1>
          <p className="text-muted-foreground">
            Shortlist or reject candidates waiting for a decision in this round
          </p>
        </div>

        <RoundSubNav
          jobId={jobId}
          roundId={roundId}
          stepType={workflowStep?.stepType}
          activeView="applied"
          counts={{ pending: counts.pending, shortlisted: counts.shortlisted }}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Total in Round</p>
            <p className="text-2xl font-bold">{counts.total}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Needs Review</p>
            <p className="text-2xl font-bold text-amber-600">{counts.pending}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">In Round</p>
            <p className="text-2xl font-bold text-emerald-600">{counts.shortlisted}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold text-destructive">{counts.rejected}</p>
          </div>
        </div>

        <CandidateQueueTabs
          tabs={queueTabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as QueueTabId)}
          className="mb-4"
        />

        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>
            {showActions && selectedCandidates.size > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleShortlist(Array.from(selectedCandidates))}
                  className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90"
                >
                  Shortlist Selected ({selectedCandidates.size})
                </button>
                <button
                  onClick={() => handleReject(Array.from(selectedCandidates))}
                  className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive rounded-lg hover:bg-destructive/90"
                >
                  Reject Selected ({selectedCandidates.size})
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {showActions && (
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={
                          filteredCandidates.filter(isSelectable).length > 0 &&
                          filteredCandidates.filter(isSelectable).every((c) =>
                            selectedCandidates.has(c.id)
                          )
                        }
                        onChange={() => {
                          const selectable = filteredCandidates.filter(isSelectable)
                          const allSelected =
                            selectable.length > 0 &&
                            selectable.every((c) => selectedCandidates.has(c.id))
                          if (allSelected) setSelectedCandidates(new Set())
                          else setSelectedCandidates(new Set(selectable.map((c) => c.id)))
                        }}
                        className="w-4 h-4 rounded"
                      />
                    </th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Candidate
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Applied Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Status
                  </th>
                  {showActions && (
                    <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCandidates.length === 0
                  ? renderTableEmpty()
                  : filteredCandidates.map((candidate) => (
                      <tr key={candidate.id} className="hover:bg-muted/50">
                        {showActions && (
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedCandidates.has(candidate.id)}
                              onChange={() => {
                                const next = new Set(selectedCandidates)
                                if (next.has(candidate.id)) next.delete(candidate.id)
                                else next.add(candidate.id)
                                setSelectedCandidates(next)
                              }}
                              disabled={!isSelectable(candidate)}
                              className="w-4 h-4 rounded disabled:opacity-50"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 font-medium">{candidate.name}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{candidate.email}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {formatAppliedDate(candidate.appliedAt)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-muted">
                            {formatStepStatus(candidate.status)}
                          </span>
                        </td>
                        {showActions && (
                          <td className="px-6 py-4 text-right">
                            {isSelectable(candidate) && (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleShortlist([candidate.id])}
                                  className="px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-500/10 rounded-lg"
                                >
                                  Shortlist
                                </button>
                                <button
                                  onClick={() => handleReject([candidate.id])}
                                  className="px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Link
            href={`/admin/jobs/${jobId}/rounds/${roundId}/shortlisted`}
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90"
          >
            Continue to In Round ({counts.shortlisted})
          </Link>
        </div>
      </div>
    </div>
  )
}
