"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { CandidateQueueTabs } from "@/components/admin/CandidateQueueTabs"
import { QueueEmptyState } from "@/components/admin/QueueEmptyState"
import { JobPipelineHeaderLoader } from "@/components/admin/useJobPipeline"
import { formatApplicationStatus } from "@/lib/admin/application-status-labels"

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
  actionable?: boolean
  actionBlockedReason?: string | null
  statusLabel?: string | null
  pipelineStatus?: string | null
}

interface ShortlistCounts {
  needsReview: number
  shortlisted: number
  rejected: number
  total: number
}

type QueueTabId = "applied" | "shortlisted" | "rejected"

export default function ShortlistPage() {
  const params = useParams()
  const jobId = params.id as string
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [counts, setCounts] = useState<ShortlistCounts>({
    needsReview: 0,
    shortlisted: 0,
    rejected: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<QueueTabId>("applied")
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
              stepName: data.workflow.rounds[0].stepName,
            })
          }
        }
      } catch (error) {
        console.error("Error fetching workflow:", error)
      }
    }
    if (jobId) fetchWorkflow()
  }, [jobId])

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/api/admin/jobs/${jobId}/shortlist?status=${activeTab}`
      )
      if (res.ok) {
        const data = await res.json()
        setCandidates(data.applications || [])
        if (data.counts) setCounts(data.counts)
      }
    } catch (error) {
      console.error("Error fetching candidates:", error)
    } finally {
      setLoading(false)
    }
  }, [jobId, activeTab])

  useEffect(() => {
    fetchCandidates()
  }, [fetchCandidates])

  useEffect(() => {
    setSelectedCandidates(new Set())
  }, [activeTab])

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
          action,
        }),
      })

      if (res.ok) {
        setSelectedCandidates(new Set())
        await fetchCandidates()
        toast.success(
          `Candidates ${action === "select" ? "shortlisted" : "rejected"} successfully`
        )
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
    const next = new Set(selectedCandidates)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedCandidates(next)
  }

  function toggleAll() {
    const actionableIds = candidates
      .filter((c) => c.actionable !== false)
      .map((c) => c.candidateId)
    if (selectedCandidates.size === actionableIds.length && actionableIds.length > 0) {
      setSelectedCandidates(new Set())
    } else {
      setSelectedCandidates(new Set(actionableIds))
    }
  }

  const queueTabs = [
    { id: "applied", label: "Needs Review", count: counts.needsReview },
    { id: "shortlisted", label: "Shortlisted", count: counts.shortlisted },
    { id: "rejected", label: "Rejected", count: counts.rejected },
  ]

  const showActions = activeTab === "applied"
  const actionableCandidates = candidates.filter((c) => c.actionable !== false)
  const isEmpty = !loading && candidates.length === 0

  function renderEmptyState() {
    if (counts.total === 0) {
      return (
        <QueueEmptyState
          variant="no-applicants"
          actions={[{ label: "Back to Job", href: `/admin/jobs/${jobId}` }]}
        />
      )
    }

    if (activeTab === "applied" && counts.needsReview === 0) {
      const actions: Array<{ label: string; href?: string; onClick?: () => void }> = []
      if (counts.shortlisted > 0) {
        actions.push({ label: "View Shortlisted", onClick: () => setActiveTab("shortlisted") })
      }
      if (counts.rejected > 0) {
        actions.push({ label: "View Rejected", onClick: () => setActiveTab("rejected") })
      }
      if (firstRound) {
        actions.push({
          label: `Continue to ${firstRound.stepName}`,
          href: `/admin/jobs/${jobId}/rounds/${firstRound.id}/applied`,
        })
      }
      return (
        <QueueEmptyState
          variant="queue-complete"
          queueLabel="Needs Review"
          counts={{
            shortlisted: counts.shortlisted,
            rejected: counts.rejected,
            remaining: 0,
          }}
          actions={actions}
        />
      )
    }

    return (
      <div className="text-center py-12 bg-card rounded-lg border border-border">
        <p className="text-muted-foreground">
          No candidates in {activeTab === "shortlisted" ? "Shortlisted" : "Rejected"}.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <JobPipelineHeaderLoader jobId={jobId} currentStageId="applications" />

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Candidate Shortlisting</h1>
            <p className="text-muted-foreground mt-1">
              Review and shortlist candidates manually or with AI
            </p>
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

        <div className="flex border-b border-border mb-6">
          <Link
            href={`/admin/jobs/${jobId}/shortlist`}
            className="px-4 py-2 text-sm font-semibold border-b-2 border-primary text-primary flex items-center gap-2"
          >
            Manual Shortlist
          </Link>
          <Link
            href={`/admin/jobs/${jobId}/ai-shortlist`}
            className="px-4 py-2 text-sm font-semibold border-b-2 border-transparent text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
          >
            AI Shortlist
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="px-4 py-2 bg-primary/10 rounded-lg">
            <span className="text-sm text-muted-foreground">Total Applications: </span>
            <span className="font-semibold text-primary">{counts.total}</span>
          </div>
          <div className="px-4 py-2 bg-amber-500/10 rounded-lg">
            <span className="text-sm text-muted-foreground">Needs Review: </span>
            <span className="font-semibold text-amber-600">{counts.needsReview}</span>
          </div>
          <div className="px-4 py-2 bg-emerald-500/10 rounded-lg">
            <span className="text-sm text-muted-foreground">Shortlisted: </span>
            <span className="font-semibold text-emerald-500">{counts.shortlisted}</span>
          </div>
          <div className="px-4 py-2 bg-destructive/10 rounded-lg">
            <span className="text-sm text-muted-foreground">Rejected: </span>
            <span className="font-semibold text-destructive">{counts.rejected}</span>
          </div>
        </div>

        <CandidateQueueTabs
          tabs={queueTabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as QueueTabId)}
          className="mb-4"
        />

        {showActions && selectedCandidates.size > 0 && (
          <div className="flex items-center gap-2 mb-4">
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

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : isEmpty ? (
        renderEmptyState()
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {showActions && (
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedCandidates.size === actionableCandidates.length &&
                        actionableCandidates.length > 0
                      }
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
                  Applied
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
                  CV
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-muted/50">
                  {showActions && (
                    <td className="px-6 py-4">
                      {candidate.actionable !== false ? (
                        <input
                          type="checkbox"
                          checked={selectedCandidates.has(candidate.candidateId)}
                          onChange={() => toggleCandidate(candidate.candidateId)}
                          className="rounded border-gray-300"
                        />
                      ) : null}
                    </td>
                  )}
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
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        candidate.actionBlockedReason === "HIRED"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : candidate.actionBlockedReason === "IN_LATER_ROUND"
                            ? "bg-blue-500/10 text-blue-600"
                            : candidate.actionBlockedReason === "ON_HOLD"
                              ? "bg-amber-500/10 text-amber-600"
                              : candidate.actionBlockedReason === "REJECTED" ||
                                  candidate.status === "REMOVED"
                                ? "bg-destructive/10 text-destructive"
                                : candidate.status === "SHORTLISTED" ||
                                    candidate.status === "BATCH_ASSIGNED" ||
                                    candidate.actionBlockedReason === "ALREADY_SHORTLISTED"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-primary/10 text-primary"
                      }`}
                    >
                      {candidate.statusLabel || formatApplicationStatus(candidate.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(Number(candidate.appliedAt) * 1000).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">Profile used</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
