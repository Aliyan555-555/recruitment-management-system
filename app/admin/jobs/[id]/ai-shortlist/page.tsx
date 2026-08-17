"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { SerializedAiCandidateShortlistResult, SerializedAiShortlistRun } from "@/lib/ai-shortlist/serializers"
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Eye,
  Check,
  X,
} from "lucide-react"
import { toast } from "sonner"

interface RunDetail extends SerializedAiShortlistRun {
  completedCount: number
  failedCount: number
  shortlistCount: number
  maybeCount: number
  rejectCount: number
  isStale: boolean
}

export default function AiShortlistPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const [jobTitle, setJobTitle] = useState<string>("")
  const [runs, setRuns] = useState<SerializedAiShortlistRun[]>([])
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [currentRun, setCurrentRun] = useState<RunDetail | null>(null)
  const [results, setResults] = useState<SerializedAiCandidateShortlistResult[]>([])
  
  const [loading, setLoading] = useState<boolean>(true)
  const [triggering, setTriggering] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Filters
  const [recFilter, setRecFilter] = useState<string>("ALL")
  const [minScore, setMinScore] = useState<number>(0)

  // Selected candidate detail modal
  const [selectedResult, setSelectedResult] = useState<SerializedAiCandidateShortlistResult | null>(null)

  // Shortlist action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [bulkShortlisting, setBulkShortlisting] = useState<boolean>(false)

  const handleShortlistCandidate = async (candidateId: string, action: "select" | "reject") => {
    setActionLoadingId(candidateId)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/shortlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateIds: [candidateId],
          action,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(`Candidate ${action === "select" ? "shortlisted" : "rejected"} successfully`)
        if (selectedRunId) {
          fetchRunDetails(selectedRunId)
        }
      } else {
        toast.error(data.error || "Failed to update candidate status")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update candidate status")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleBulkShortlistRecommended = async () => {
    const recommendedIds = results
      .filter((r) => r.recommendation === "SHORTLIST" && r.candidateId)
      .map((r) => r.candidateId)

    if (recommendedIds.length === 0) {
      toast.error("No candidates with AI SHORTLIST recommendation found in this run.")
      return
    }

    setBulkShortlisting(true)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/shortlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateIds: recommendedIds,
          action: "select",
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(`Successfully shortlisted ${recommendedIds.length} AI-recommended candidate(s)!`)
        if (selectedRunId) {
          fetchRunDetails(selectedRunId)
        }
      } else {
        toast.error(data.error || "Failed to shortlist candidates")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to shortlist candidates")
    } finally {
      setBulkShortlisting(false)
    }
  }

  const [firstRound, setFirstRound] = useState<{ id: string; stepName: string } | null>(null)

  // Fetch job details & runs list
  const fetchRunsList = useCallback(async () => {
    try {
      const [jobRes, runsRes] = await Promise.all([
        fetch(`/api/admin/jobs/${jobId}`),
        fetch(`/api/admin/jobs/${jobId}/ai-shortlist`),
      ])

      if (jobRes.ok) {
        const jobData = await jobRes.json()
        setJobTitle(jobData.job.title)
        if (jobData.job?.workflow?.steps?.length > 0) {
          setFirstRound({
            id: jobData.job.workflow.steps[0].id,
            stepName: jobData.job.workflow.steps[0].stepName
          })
        }
      }

      if (runsRes.ok) {
        const runsData = await runsRes.json()
        setRuns(runsData.runs)
        if (runsData.runs.length > 0 && !selectedRunId) {
          setSelectedRunId(runsData.runs[0].id)
        }
      }
    } catch (err) {
      console.error("Error fetching job/runs:", err)
    } finally {
      setLoading(false)
    }
  }, [jobId, selectedRunId])

  // Fetch selected run details & candidate results
  const fetchRunDetails = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/ai-shortlist/${runId}`)
      if (res.ok) {
        const data = await res.json()
        setCurrentRun(data.run)
        setResults(data.results)
      } else {
        const data = await res.json()
        setErrorMsg(data.error || "Failed to load run details")
      }
    } catch (err) {
      console.error("Error fetching run details:", err)
    }
  }, [jobId])

  useEffect(() => {
    fetchRunsList()
  }, [fetchRunsList])

  useEffect(() => {
    if (selectedRunId) {
      fetchRunDetails(selectedRunId)
    }
  }, [selectedRunId, fetchRunDetails])

  // Polling when run is RUNNING
  useEffect(() => {
    if (!currentRun || currentRun.status !== "RUNNING" || currentRun.isStale) return

    const interval = setInterval(() => {
      if (selectedRunId) {
        fetchRunDetails(selectedRunId)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [currentRun, selectedRunId, fetchRunDetails])

  const handleStartRun = async () => {
    setTriggering(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/ai-shortlist`, {
        method: "POST",
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setRuns((prev) => [data.run, ...prev])
        setSelectedRunId(data.run.id)
        await fetchRunDetails(data.run.id)
      } else {
        setErrorMsg(data.error || "Failed to start AI Shortlisting run")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred")
    } finally {
      setTriggering(false)
    }
  }

  // Filtered candidate results
  const filteredResults = results.filter((r) => {
    if (recFilter !== "ALL" && r.recommendation !== recFilter) return false
    if (r.overallScore !== null && r.overallScore < minScore) return false
    return true
  })

  // Table Columns Definition
  const columns: ColumnDef<SerializedAiCandidateShortlistResult>[] = [
    {
      accessorKey: "candidate",
      header: "Candidate",
      cell: ({ row }) => {
        const candidate = row.original.candidate
        return (
          <div>
            <p className="font-semibold text-foreground">
              {candidate ? `${candidate.firstname} ${candidate.lastname}` : "Unknown Candidate"}
            </p>
            <p className="text-xs text-muted-foreground">{candidate?.email || ""}</p>
          </div>
        )
      },
    },
    {
      accessorKey: "overallScore",
      header: "Overall Score",
      cell: ({ row }) => {
        const score = row.original.overallScore
        if (score === null) return <span className="text-muted-foreground text-xs">Pending</span>
        let colorClass = "bg-rose-500/10 text-rose-600 border-rose-200"
        if (score >= 70) colorClass = "bg-emerald-500/10 text-emerald-600 border-emerald-200"
        else if (score >= 50) colorClass = "bg-amber-500/10 text-amber-600 border-amber-200"

        return (
          <span
            className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full border ${colorClass}`}
          >
            {score}%
          </span>
        )
      },
    },
    {
      accessorKey: "skillsScore",
      header: "Skills Match",
      cell: ({ row }) => {
        const s = row.original.skillsScore
        return s !== null ? <span className="text-sm font-medium">{s}%</span> : <span className="text-muted-foreground text-xs">N/A</span>
      },
    },
    {
      accessorKey: "assessmentScore",
      header: "Assessment Avg",
      cell: ({ row }) => {
        const a = row.original.assessmentScore
        return a !== null ? <span className="text-sm font-medium">{a}%</span> : <span className="text-muted-foreground text-xs">Unassessed</span>
      },
    },
    {
      accessorKey: "mandatoryRequirementsMet",
      header: "Mandatory Met",
      cell: ({ row }) => {
        const met = row.original.mandatoryRequirementsMet
        if (met === null) return <span className="text-muted-foreground text-xs">-</span>
        return met ? (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="w-4 h-4" /> Yes
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-rose-600">
            <XCircle className="w-4 h-4" /> No
          </span>
        )
      },
    },
    {
      accessorKey: "recommendation",
      header: "Recommendation",
      cell: ({ row }) => {
        const rec = row.original.recommendation
        if (!rec) return <span className="text-muted-foreground text-xs">Processing</span>
        if (rec === "SHORTLIST") {
          return <Badge className="bg-emerald-600 text-white font-bold">SHORTLIST</Badge>
        }
        if (rec === "MAYBE") {
          return <Badge variant="secondary" className="bg-amber-500 text-white font-bold">MAYBE</Badge>
        }
        return <Badge variant="destructive" className="font-bold">REJECT</Badge>
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original
        const candidateId = item.candidateId
        const isProcessing = actionLoadingId === candidateId

        return (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedResult(item)}
              className="flex items-center gap-1 text-xs"
            >
              <Eye className="w-3.5 h-3.5" /> Details
            </Button>

            {candidateId && (
              <>
                <Button
                  size="sm"
                  disabled={isProcessing}
                  onClick={() => handleShortlistCandidate(candidateId, "select")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-1 flex items-center gap-1"
                  title="Shortlist candidate"
                >
                  <Check className="w-3.5 h-3.5" /> Shortlist
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isProcessing}
                  onClick={() => handleShortlistCandidate(candidateId, "reject")}
                  className="text-xs px-2 py-1 flex items-center gap-1"
                  title="Reject candidate"
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </Button>
              </>
            )}
          </div>
        )
      },
    },
  ]

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading AI Shortlisting evaluation...</div>
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href={`/admin/jobs/${jobId}`}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Job Details
            </Link>
            {firstRound && (
              <Link
                href={`/admin/jobs/${jobId}/rounds/${firstRound.id}/applied`}
                className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1"
              >
                Next Round ({firstRound.stepName}) →
              </Link>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI Shortlisting Evaluation
          </h1>
          <p className="text-sm text-muted-foreground">{jobTitle}</p>
        </div>

        {/* Shortlist Mode Navigation Tabs */}
        <div className="flex border-b border-border w-full">
          <Link
            href={`/admin/jobs/${jobId}/shortlist`}
            className="px-4 py-2 text-sm font-semibold border-b-2 border-transparent text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
          >
            📋 Manual Shortlist
          </Link>
          <Link
            href={`/admin/jobs/${jobId}/ai-shortlist`}
            className="px-4 py-2 text-sm font-semibold border-b-2 border-primary text-primary flex items-center gap-2"
          >
            ✨ AI Shortlist
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {runs.length > 0 && (
            <select
              value={selectedRunId || ""}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground"
            >
              {runs.map((r, i) => (
                <option key={r.id} value={r.id}>
                  Run #{runs.length - i} ({new Date(Number(r.startedAt) * 1000).toLocaleString()}) - {r.status}
                </option>
              ))}
            </select>
          )}

          <Button
            onClick={handleStartRun}
            disabled={triggering || (currentRun?.status === "RUNNING" && !currentRun.isStale)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium flex items-center gap-2"
          >
            {triggering ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {runs.length === 0 ? "✨ Run AI Shortlisting" : "✨ Re-evaluate Candidates"}
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Empty State */}
      {runs.length === 0 && !triggering && (
        <div className="bg-card rounded-xl border border-border p-12 text-center max-w-2xl mx-auto space-y-4 my-8 shadow-sm">
          <div className="w-16 h-16 bg-purple-500/10 text-purple-600 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No AI Shortlisting Evaluations Yet</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Evaluate all applicant profiles against this job&apos;s required skills, education, experience,
            and custom success criteria using AI. All evaluation runs are saved for auditability and do not alter existing candidate pipeline states.
          </p>
          <Button
            onClick={handleStartRun}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-2 mx-auto"
          >
            <Sparkles className="w-5 h-5" /> Start First AI Shortlisting Run
          </Button>
        </div>
      )}

      {/* Active Run Banner & Progress */}
      {currentRun && (
        <>
          {currentRun.isStale && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>
                  This evaluation run appears to have been interrupted. You can trigger a new evaluation run at any time.
                </span>
              </div>
              <Button size="sm" onClick={handleStartRun} className="bg-amber-600 text-white hover:bg-amber-700">
                Start Fresh Run
              </Button>
            </div>
          )}

          {currentRun.status === "RUNNING" && !currentRun.isStale && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6 space-y-3">
              <div className="flex justify-between items-center text-sm font-semibold text-purple-700 dark:text-purple-300">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Evaluating Candidates in Parallel...
                </span>
                <span>
                  {currentRun.completedCount + currentRun.failedCount} / {currentRun.totalCandidates} Processed
                </span>
              </div>
              <div className="w-full bg-purple-200 dark:bg-purple-950 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.round(
                      ((currentRun.completedCount + currentRun.failedCount) /
                        Math.max(1, currentRun.totalCandidates)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Derived Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-xl border border-border">
              <p className="text-xs text-muted-foreground font-medium">Total Evaluated</p>
              <p className="text-2xl font-bold text-foreground mt-1">{currentRun.totalCandidates}</p>
            </div>
            <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
              <p className="text-xs font-semibold text-emerald-600">SHORTLIST</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                {currentRun.shortlistCount}
              </p>
            </div>
            <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/20">
              <p className="text-xs font-semibold text-amber-600">MAYBE</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                {currentRun.maybeCount}
              </p>
            </div>
            <div className="bg-rose-500/5 p-4 rounded-xl border border-rose-500/20">
              <p className="text-xs font-semibold text-rose-600">REJECT</p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">
                {currentRun.rejectCount}
              </p>
            </div>
          </div>

          {/* Filtering & Bulk Action controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Filter Recommendation:</span>
                <div className="flex gap-1 bg-muted p-1 rounded-lg">
                  {["ALL", "SHORTLIST", "MAYBE", "REJECT"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setRecFilter(f)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        recFilter === f
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {currentRun && currentRun.shortlistCount > 0 && (
                <Button
                  onClick={handleBulkShortlistRecommended}
                  disabled={bulkShortlisting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {bulkShortlisting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Shortlist All AI-Recommended ({currentRun.shortlistCount})
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Min Score:</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-32 accent-purple-600"
              />
              <span className="text-xs font-bold text-foreground w-8">{minScore}%</span>
            </div>
          </div>

          {/* Results Table */}
          <DataTable
            columns={columns}
            data={filteredResults}
            searchKey="candidate"
            searchPlaceholder="Search candidate by name..."
          />
        </>
      )}

      {/* Candidate Evaluation Detail Dialog */}
      <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedResult && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl font-bold">
                      {selectedResult.candidate
                        ? `${selectedResult.candidate.firstname} ${selectedResult.candidate.lastname}`
                        : "Candidate Details"}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      {selectedResult.candidate?.email}
                    </DialogDescription>
                  </div>
                  {selectedResult.recommendation && (
                    <Badge
                      className={`text-sm px-3 py-1 font-bold ${
                        selectedResult.recommendation === "SHORTLIST"
                          ? "bg-emerald-600 text-white"
                          : selectedResult.recommendation === "MAYBE"
                          ? "bg-amber-500 text-white"
                          : "bg-rose-600 text-white"
                      }`}
                    >
                      {selectedResult.recommendation}
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              {/* Overall & AI Confidence Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Overall Score</p>
                  <p className="text-xl font-bold text-foreground">
                    {selectedResult.overallScore !== null ? `${selectedResult.overallScore}%` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">AI Confidence</p>
                  <p className="text-xl font-bold text-foreground">
                    {selectedResult.aiConfidence !== null ? `${selectedResult.aiConfidence}%` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Skills Score</p>
                  <p className="text-xl font-bold text-foreground">
                    {selectedResult.skillsScore !== null ? `${selectedResult.skillsScore}%` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assessment Avg</p>
                  <p className="text-xl font-bold text-foreground">
                    {selectedResult.assessmentScore !== null ? `${selectedResult.assessmentScore}%` : "Unassessed"}
                  </p>
                </div>
              </div>

              {/* Mandatory Requirements Checklist */}
              {Array.isArray(selectedResult.mandatoryChecklist) &&
                selectedResult.mandatoryChecklist.length > 0 && (
                  <div className="space-y-2 border border-border p-4 rounded-lg">
                    <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">
                      Mandatory Requirements Checklist
                    </h4>
                    <div className="space-y-2 mt-2">
                      {selectedResult.mandatoryChecklist.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between text-xs p-2 rounded bg-muted/30"
                        >
                          <div className="flex items-start gap-2">
                            {item.met ? (
                              <Check className="w-4 h-4 text-emerald-600 mt-0.5" />
                            ) : (
                              <X className="w-4 h-4 text-rose-600 mt-0.5" />
                            )}
                            <div>
                              <p className="font-semibold text-foreground">{item.requirement}</p>
                              {item.note && <p className="text-muted-foreground">{item.note}</p>}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {item.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Matched vs Missing Requirements */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-emerald-500/20 bg-emerald-500/5 p-4 rounded-lg space-y-2">
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                    Matched Requirements
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(selectedResult.matchedRequirements) &&
                    selectedResult.matchedRequirements.length > 0 ? (
                      selectedResult.matchedRequirements.map((req: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-500/20 font-medium"
                        >
                          ✓ {req}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </div>
                </div>

                <div className="border border-rose-500/20 bg-rose-500/5 p-4 rounded-lg space-y-2">
                  <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase">
                    Missing / Unmet Requirements
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(selectedResult.missingRequirements) &&
                    selectedResult.missingRequirements.length > 0 ? (
                      selectedResult.missingRequirements.map((req: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs bg-rose-500/10 text-rose-700 dark:text-rose-300 rounded border border-rose-500/20 font-medium"
                        >
                          ✗ {req}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Strengths & Concerns */}
              <div className="grid md:grid-cols-2 gap-4">
                {Array.isArray(selectedResult.strengths) && selectedResult.strengths.length > 0 && (
                  <div className="border border-border p-4 rounded-lg space-y-2">
                    <h4 className="text-xs font-bold text-foreground uppercase">Key Strengths</h4>
                    <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                      {selectedResult.strengths.map((s: string, idx: number) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(selectedResult.concerns) && selectedResult.concerns.length > 0 && (
                  <div className="border border-border p-4 rounded-lg space-y-2">
                    <h4 className="text-xs font-bold text-foreground uppercase">Key Concerns</h4>
                    <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                      {selectedResult.concerns.map((c: string, idx: number) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* AI Reasoning Callout */}
              {selectedResult.aiReasoning && (
                <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-lg space-y-1">
                  <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> AI Evaluation Reasoning
                  </h4>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedResult.aiReasoning}
                  </p>
                </div>
              )}

              {/* Modal Shortlist / Reject Action Buttons */}
              {selectedResult.candidateId && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedResult(null)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={actionLoadingId === selectedResult.candidateId}
                    onClick={async () => {
                      await handleShortlistCandidate(selectedResult.candidateId, "reject")
                      setSelectedResult(null)
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" /> Reject Candidate
                  </Button>
                  <Button
                    disabled={actionLoadingId === selectedResult.candidateId}
                    onClick={async () => {
                      await handleShortlistCandidate(selectedResult.candidateId, "select")
                      setSelectedResult(null)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Shortlist Candidate
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
