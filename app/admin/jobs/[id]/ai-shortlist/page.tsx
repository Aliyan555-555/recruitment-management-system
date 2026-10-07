"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SerializedAiCandidateShortlistResult, SerializedAiShortlistRun } from "@/lib/ai-shortlist/serializers"
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Eye,
  Check,
  X,
  ClipboardList,
  SlidersHorizontal,
  Bot,
  Users,
  Award,
  Clock,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  HelpCircle,
} from "lucide-react"
import { toast } from "sonner"
import { JobPipelineHeaderLoader } from "@/components/admin/useJobPipeline"

function currentStatusBadgeClass(
  reason: string | null | undefined,
  actionable?: boolean
) {
  if (actionable) return "bg-primary/10 text-primary border-primary/20"
  switch (reason) {
    case "HIRED":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200"
    case "REJECTED":
      return "bg-destructive/10 text-destructive border-destructive/20"
    case "ON_HOLD":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200"
    case "IN_LATER_ROUND":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200"
    case "ALREADY_SHORTLISTED":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

interface RunDetail extends SerializedAiShortlistRun {
  completedCount: number
  failedCount: number
  shortlistCount: number
  maybeCount: number
  rejectCount: number
  isStale: boolean
}

interface MandatoryChecklistItem {
  requirement: string
  met: boolean
  note?: string
  priority?: "REQUIRED" | "PREFERRED" | string
}

export default function AiShortlistPage() {
  const params = useParams()
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

  const [firstRound, setFirstRound] = useState<{ id: string; stepName: string } | null>(null)

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
    const recommended = results.filter(
      (r) => r.recommendation === "SHORTLIST" && r.candidateId
    )
    const actionableIds = recommended
      .filter((r) => r.actionable === true)
      .map((r) => r.candidateId)
    const skipped = recommended.length - actionableIds.length

    if (actionableIds.length === 0) {
      toast.error(
        skipped > 0
          ? "No remaining candidates can be shortlisted. Hired or later-stage candidates were skipped."
          : "No candidates with AI SHORTLIST recommendation found in this run."
      )
      return
    }

    setBulkShortlisting(true)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/shortlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateIds: actionableIds,
          action: "select",
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(
          skipped > 0
            ? `Shortlisted ${actionableIds.length} candidate(s). ${skipped} already hired or in a later stage were skipped.`
            : `Successfully shortlisted ${actionableIds.length} AI-recommended candidate(s)!`
        )
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

  // Fetch job details & runs list
  const fetchRunsList = useCallback(async () => {
    try {
      const [jobRes, runsRes] = await Promise.all([
        fetch(`/api/admin/jobs/${jobId}`),
        fetch(`/api/admin/jobs/${jobId}/ai-shortlist`),
      ])

      if (jobRes.ok) {
        const jobData = await jobRes.json()
        setJobTitle(jobData.job?.title || "")
        if (jobData.job?.workflow?.steps?.length > 0) {
          setFirstRound({
            id: jobData.job.workflow.steps[0].id,
            stepName: jobData.job.workflow.steps[0].stepName,
          })
        }
      }

      if (runsRes.ok) {
        const runsData = await runsRes.json()
        setRuns(runsData.runs || [])
        if (runsData.runs?.length > 0 && !selectedRunId) {
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
        setResults(data.results || [])
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
        toast.success("AI shortlisting evaluation started!")
      } else {
        setErrorMsg(data.error || "Failed to start AI Shortlisting run")
        toast.error(data.error || "Failed to start evaluation")
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred")
      toast.error(err.message || "Failed to start evaluation")
    } finally {
      setTriggering(false)
    }
  }

  // Filtered candidate results
  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (recFilter !== "ALL" && r.recommendation !== recFilter) return false
      if (r.overallScore !== null && r.overallScore < minScore) return false
      return true
    })
  }, [results, recFilter, minScore])

  const actionableRecommendedCount = useMemo(() => {
    return results.filter(
      (r) => r.recommendation === "SHORTLIST" && r.actionable === true && r.candidateId
    ).length
  }, [results])

  // Table Columns Definition
  // Only show quick test columns/cards when at least one candidate has a quick test score.
  const hasQuickTestScores = results.some((r) => r.quickTestScore !== null)

  const quickTestColumn: ColumnDef<SerializedAiCandidateShortlistResult> = {
    accessorKey: "quickTestScore",
    header: "Quick Test",
    cell: ({ row }) => {
      const q = row.original.quickTestScore
      if (q === null) {
        return <span className="text-muted-foreground text-[11px] bg-muted/60 px-2 py-0.5 rounded">Not taken</span>
      }
      return (
        <div className="space-y-1 min-w-[70px]">
          <span className="text-xs font-semibold text-foreground">{q}%</span>
          <div className="w-16 bg-muted rounded-full h-1 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, q))}%` }}
            />
          </div>
        </div>
      )
    },
  }

  const columns: ColumnDef<SerializedAiCandidateShortlistResult>[] = [
    {
      id: "candidate",
      accessorFn: (row) =>
        `${row.candidate?.firstname ?? ""} ${row.candidate?.lastname ?? ""} ${row.candidate?.email ?? ""}`,
      header: "Candidate",
      cell: ({ row }) => {
        const candidate = row.original.candidate
        const initials = candidate
          ? `${candidate.firstname?.[0] ?? ""}${candidate.lastname?.[0] ?? ""}`.toUpperCase()
          : "CN"
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-border/60 shadow-sm">
              {candidate?.avatar && <AvatarImage src={candidate.avatar} alt="Candidate" />}
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {initials || "CN"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground text-sm leading-tight">
                {candidate ? `${candidate.firstname} ${candidate.lastname}` : "Unknown Candidate"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{candidate?.email || "No email"}</p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "overallScore",
      header: "Match Score",
      cell: ({ row }) => {
        const score = row.original.overallScore
        if (score === null) {
          return <span className="text-muted-foreground text-xs italic">Pending</span>
        }
        let colorClass = "bg-rose-500/10 text-rose-600 border-rose-300 dark:border-rose-900"
        let barColor = "bg-rose-500"
        let label = "Low"

        if (score >= 70) {
          colorClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
          barColor = "bg-emerald-500"
          label = "High"
        } else if (score >= 50) {
          colorClass = "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800"
          barColor = "bg-blue-500"
          label = "Good"
        } else if (score >= 35) {
          colorClass = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
          barColor = "bg-amber-500"
          label = "Moderate"
        }

        return (
          <div className="space-y-1.5 min-w-[85px]">
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-full border ${colorClass}`}>
                {score}%
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
            </div>
            <div className="w-20 bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "skillsScore",
      header: "Skills Match",
      cell: ({ row }) => {
        const s = row.original.skillsScore
        if (s === null) return <span className="text-muted-foreground text-xs">N/A</span>
        return (
          <div className="space-y-1 min-w-[70px]">
            <span className="text-xs font-semibold text-foreground">{s}%</span>
            <div className="w-16 bg-muted rounded-full h-1 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, s))}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "assessmentScore",
      header: "Assessments",
      cell: ({ row }) => {
        const a = row.original.assessmentScore
        if (a === null) {
          return <span className="text-muted-foreground text-[11px] bg-muted/60 px-2 py-0.5 rounded">Unassessed</span>
        }
        return (
          <div className="space-y-1 min-w-[70px]">
            <span className="text-xs font-semibold text-foreground">{a}%</span>
            <div className="w-16 bg-muted rounded-full h-1 overflow-hidden">
              <div
                className="bg-teal-500 h-full rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, a))}%` }}
              />
            </div>
          </div>
        )
      },
    },
    ...(hasQuickTestScores ? [quickTestColumn] : []),
    {
      accessorKey: "mandatoryRequirementsMet",
      header: "Mandatory Met",
      cell: ({ row }) => {
        const met = row.original.mandatoryRequirementsMet
        if (met === null) return <span className="text-muted-foreground text-xs">-</span>
        return met ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> All Met
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" /> Gaps Found
          </span>
        )
      },
    },
    {
      accessorKey: "recommendation",
      header: "AI Decision",
      cell: ({ row }) => {
        const rec = row.original.recommendation
        if (!rec) return <span className="text-muted-foreground text-xs italic">Evaluating...</span>
        if (rec === "SHORTLIST") {
          return (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 w-fit">
              <Sparkles className="w-3 h-3" /> SHORTLIST
            </Badge>
          )
        }
        if (rec === "MAYBE") {
          return (
            <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm flex items-center gap-1 w-fit">
              <HelpCircle className="w-3 h-3" /> CONSIDER
            </Badge>
          )
        }
        return (
          <Badge variant="destructive" className="font-bold text-xs shadow-sm flex items-center gap-1 w-fit">
            <XCircle className="w-3 h-3" /> REJECT
          </Badge>
        )
      },
    },
    {
      id: "currentStatus",
      header: "Pipeline Stage",
      cell: ({ row }) => {
        const item = row.original
        const label = item.actionable ? "Ready for Review" : item.statusLabel || "Unavailable"
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${currentStatusBadgeClass(
              item.actionBlockedReason,
              item.actionable
            )}`}
          >
            {label}
          </span>
        )
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
              className="h-8 text-xs font-medium flex items-center gap-1 border-border/80 hover:bg-muted/80"
            >
              <Eye className="w-3.5 h-3.5 text-muted-foreground" /> Dossier
            </Button>

            {candidateId && item.actionable === true && (
              <>
                <Button
                  size="sm"
                  disabled={isProcessing}
                  onClick={() => handleShortlistCandidate(candidateId, "select")}
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 flex items-center gap-1 shadow-sm"
                  title="Shortlist to next round"
                >
                  <Check className="w-3.5 h-3.5" /> Shortlist
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isProcessing}
                  onClick={() => handleShortlistCandidate(candidateId, "reject")}
                  className="h-8 text-xs px-2.5 flex items-center gap-1 border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:border-rose-900"
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
    return (
      <div className="space-y-6 p-6">
        <div className="h-20 bg-muted/40 animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted/40 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-muted/30 animate-pulse rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Pipeline Header */}
      <JobPipelineHeaderLoader jobId={jobId} currentStageId="applications" />

      {/* Hero Control Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-purple-500/5 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                <Sparkles className="w-3.5 h-3.5" /> AI Shortlisting Intelligence
              </span>
              {currentRun && (
                <span className="text-xs text-muted-foreground font-medium">
                  {currentRun.aiModel ? `Model: ${currentRun.aiModel}` : "Powered by AI Engine"}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              Candidate Screening & Evaluation
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Holistic AI multi-dimensional scoring across skills match, experience, education criteria,
              and assessment performance for {jobTitle || "this position"}.
            </p>
          </div>

          {/* Navigation Mode Switcher & Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Segmented Mode Switch */}
            <div className="inline-flex p-1 bg-muted/80 rounded-xl border border-border/60 self-start sm:self-auto">
              <Link
                href={`/admin/jobs/${jobId}/shortlist`}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/60 transition-all flex items-center gap-1.5"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Manual Review
              </Link>
              <Link
                href={`/admin/jobs/${jobId}/ai-shortlist`}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-background text-purple-700 dark:text-purple-300 shadow-sm border border-purple-500/20 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                AI Shortlist
              </Link>
            </div>

            {firstRound && (
              <Link
                href={`/admin/jobs/${jobId}/rounds/${firstRound.id}/applied`}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-muted/80 text-foreground border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <span>Next Round: {firstRound.stepName}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
            )}
          </div>
        </div>

        {/* Run Selector & Trigger Toolbar */}
        <div className="mt-6 pt-5 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {runs.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Evaluation Run:
                </span>
                <select
                  value={selectedRunId || ""}
                  onChange={(e) => setSelectedRunId(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                >
                  {runs.map((r, i) => (
                    <option key={r.id} value={r.id}>
                      Run #{runs.length - i} ({new Date(Number(r.startedAt) * 1000).toLocaleString()}) - {r.status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {currentRun && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{currentRun.totalCandidates} Candidates Evaluated</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleStartRun}
            disabled={triggering || (currentRun?.status === "RUNNING" && !currentRun.isStale)}
            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-800 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-md hover:shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
          >
            {triggering ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {runs.length === 0 ? "Run First AI Shortlisting" : "Re-evaluate All Candidates"}
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 rounded-xl text-sm flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setErrorMsg(null)} className="h-7 text-xs">
            Dismiss
          </Button>
        </div>
      )}

      {/* Empty State when no runs exist */}
      {runs.length === 0 && !triggering && (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center max-w-2xl mx-auto space-y-6 my-10 shadow-sm">
          <div className="w-16 h-16 bg-purple-500/10 text-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Bot className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">No Shortlist Evaluations Recorded Yet</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              Our AI engine compares applicant resumes, skills, and assessment scores against this job&apos;s
              mandatory and preferred criteria, giving you clear recommendations and confidence scores.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-left text-xs">
            <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
              <p className="font-bold text-foreground">Resume Parsing</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">Extracts verified skills & background</p>
            </div>
            <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
              <p className="font-bold text-foreground">Objective Scoring</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">0-100% multi-dimensional fit</p>
            </div>
            <div className="p-3 bg-muted/40 rounded-xl border border-border/50">
              <p className="font-bold text-foreground">1-Click Pipeline</p>
              <p className="text-muted-foreground text-[11px] mt-0.5">Promote straight into Round 1</p>
            </div>
          </div>
          <Button
            onClick={handleStartRun}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-2 mx-auto rounded-xl shadow-md"
          >
            <Sparkles className="w-4 h-4" /> Start First AI Shortlisting Run
          </Button>
        </div>
      )}

      {/* Active Run Banner & Live Progress */}
      {currentRun && (
        <>
          {currentRun.isStale && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-xl text-sm flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
                <span>
                  This evaluation run appears interrupted. You can start a fresh evaluation at any time.
                </span>
              </div>
              <Button size="sm" onClick={handleStartRun} className="bg-amber-600 text-white hover:bg-amber-700 h-8 text-xs font-semibold rounded-lg">
                Restart Run
              </Button>
            </div>
          )}

          {currentRun.status === "RUNNING" && !currentRun.isStale && (
            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-6 space-y-4 shadow-sm">
              <div className="flex justify-between items-center text-sm font-semibold text-purple-700 dark:text-purple-300">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                  Evaluating Candidates Against Job Criteria in Parallel...
                </span>
                <span className="text-xs bg-purple-500/20 px-2.5 py-1 rounded-full font-bold">
                  {currentRun.completedCount + currentRun.failedCount} / {currentRun.totalCandidates} Complete
                </span>
              </div>
              <div className="w-full bg-purple-200/50 dark:bg-purple-950/50 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.round(
                      ((currentRun.completedCount + currentRun.failedCount) /
                        Math.max(1, currentRun.totalCandidates)) *
                        100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground italic">
                Scores and recommendations will appear below in real-time as processing finishes.
              </p>
            </div>
          )}

          {/* Derived Interactive Statistics Cards (Click-to-Filter) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Evaluated */}
            <button
              type="button"
              onClick={() => setRecFilter("ALL")}
              className={`text-left p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${
                recFilter === "ALL"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Total Applicants
                </span>
                <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-foreground mt-2">{currentRun.totalCandidates}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Click to view all results</p>
            </button>

            {/* SHORTLIST */}
            <button
              type="button"
              onClick={() => setRecFilter("SHORTLIST")}
              className={`text-left p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${
                recFilter === "SHORTLIST"
                  ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-sm"
                  : "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-500/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Recommended
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-2">
                {currentRun.shortlistCount}
              </p>
              <p className="text-[11px] text-emerald-600/80 mt-1 font-medium">
                {currentRun.totalCandidates > 0
                  ? `${Math.round((currentRun.shortlistCount / currentRun.totalCandidates) * 100)}% of applicants`
                  : "0%"}
              </p>
            </button>

            {/* MAYBE */}
            <button
              type="button"
              onClick={() => setRecFilter("MAYBE")}
              className={`text-left p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${
                recFilter === "MAYBE"
                  ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-sm"
                  : "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 hover:bg-amber-500/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Consideration
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <HelpCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-amber-700 dark:text-amber-400 mt-2">
                {currentRun.maybeCount}
              </p>
              <p className="text-[11px] text-amber-600/80 mt-1 font-medium">
                {currentRun.totalCandidates > 0
                  ? `${Math.round((currentRun.maybeCount / currentRun.totalCandidates) * 100)}% of applicants`
                  : "0%"}
              </p>
            </button>

            {/* REJECT */}
            <button
              type="button"
              onClick={() => setRecFilter("REJECT")}
              className={`text-left p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${
                recFilter === "REJECT"
                  ? "border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/20 shadow-sm"
                  : "border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40 hover:bg-rose-500/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  Not Recommended
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-rose-700 dark:text-rose-400 mt-2">
                {currentRun.rejectCount}
              </p>
              <p className="text-[11px] text-rose-600/80 mt-1 font-medium">
                {currentRun.totalCandidates > 0
                  ? `${Math.round((currentRun.rejectCount / currentRun.totalCandidates) * 100)}% of applicants`
                  : "0%"}
              </p>
            </button>
          </div>

          {/* Filtering & Bulk Action Toolbar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl border border-border/50">
                {[
                  { id: "ALL", label: "All", count: currentRun.totalCandidates },
                  { id: "SHORTLIST", label: "Shortlist", count: currentRun.shortlistCount },
                  { id: "MAYBE", label: "Consider", count: currentRun.maybeCount },
                  { id: "REJECT", label: "Reject", count: currentRun.rejectCount },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setRecFilter(f.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      recFilter === f.id
                        ? "bg-background text-foreground shadow-sm border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-muted/80 rounded-full font-bold">
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              {actionableRecommendedCount > 0 && (
                <Button
                  onClick={handleBulkShortlistRecommended}
                  disabled={bulkShortlisting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  {bulkShortlisting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Shortlist All Recommended ({actionableRecommendedCount})
                </Button>
              )}
            </div>

            {/* Score Slider & Presets */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" /> Min Score:
              </span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-28 accent-purple-600 cursor-pointer"
              />
              <span className="text-xs font-bold text-foreground w-10 text-right">{minScore}%</span>
              {minScore > 0 && (
                <button
                  onClick={() => setMinScore(0)}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Results Table */}
          <div className="space-y-4">
            <DataTable
              columns={columns}
              data={filteredResults}
              searchKey="candidate"
              searchPlaceholder="Filter candidate by name or email..."
            />
          </div>
        </>
      )}

      {/* Candidate Evaluation Dossier Dialog */}
      <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto p-0 rounded-2xl border-border">
          {selectedResult && (
            <div className="space-y-6">
              {/* Modal Top Banner */}
              <div className="p-6 bg-gradient-to-br from-card via-muted/30 to-purple-500/10 border-b border-border/80">
                <DialogHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border border-border shadow-sm">
                        {selectedResult.candidate?.avatar && (
                          <AvatarImage src={selectedResult.candidate.avatar} alt="Candidate" />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                          {selectedResult.candidate
                            ? `${selectedResult.candidate.firstname?.[0] ?? ""}${selectedResult.candidate.lastname?.[0] ?? ""}`.toUpperCase()
                            : "CN"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <DialogTitle className="text-xl font-extrabold text-foreground">
                          {selectedResult.candidate
                            ? `${selectedResult.candidate.firstname} ${selectedResult.candidate.lastname}`
                            : "Candidate Evaluation"}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                          {selectedResult.candidate?.email || "No email available"}
                        </DialogDescription>
                      </div>
                    </div>

                    {selectedResult.recommendation && (
                      <Badge
                        className={`text-xs px-3 py-1 font-bold rounded-lg shadow-sm ${
                          selectedResult.recommendation === "SHORTLIST"
                            ? "bg-emerald-600 text-white"
                            : selectedResult.recommendation === "MAYBE"
                            ? "bg-amber-500 text-white"
                            : "bg-rose-600 text-white"
                        }`}
                      >
                        {selectedResult.recommendation === "SHORTLIST"
                          ? "✨ AI RECOMMENDED"
                          : selectedResult.recommendation === "MAYBE"
                          ? "⚡ CONSIDERATION"
                          : "✕ NOT RECOMMENDED"}
                      </Badge>
                    )}
                  </div>
                </DialogHeader>
              </div>

              <div className="p-6 space-y-6 pt-0">
                {/* 5-Card Score Radar / Metric Grid */}
                <div className={`grid grid-cols-2 gap-3 ${selectedResult.quickTestScore !== null ? "sm:grid-cols-3 lg:grid-cols-6" : "sm:grid-cols-5"}`}>
                  <div className="p-3 bg-muted/50 rounded-xl border border-border/60 text-center">
                    <p className="text-[11px] text-muted-foreground font-semibold">Overall Fit</p>
                    <p className="text-xl font-extrabold text-foreground mt-1">
                      {selectedResult.overallScore !== null ? `${selectedResult.overallScore}%` : "N/A"}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-xl border border-border/60 text-center">
                    <p className="text-[11px] text-muted-foreground font-semibold">Skills Match</p>
                    <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                      {selectedResult.skillsScore !== null ? `${selectedResult.skillsScore}%` : "N/A"}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-xl border border-border/60 text-center">
                    <p className="text-[11px] text-muted-foreground font-semibold">Assessments</p>
                    <p className="text-xl font-extrabold text-teal-600 dark:text-teal-400 mt-1">
                      {selectedResult.assessmentScore !== null ? `${selectedResult.assessmentScore}%` : "N/A"}
                    </p>
                  </div>
                  {selectedResult.quickTestScore !== null && (
                    <div className="p-3 bg-muted/50 rounded-xl border border-border/60 text-center">
                      <p className="text-[11px] text-muted-foreground font-semibold">Quick Test</p>
                      <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                        {selectedResult.quickTestScore}%
                      </p>
                    </div>
                  )}
                  <div className="p-3 bg-muted/50 rounded-xl border border-border/60 text-center">
                    <p className="text-[11px] text-muted-foreground font-semibold">Experience</p>
                    <p className="text-xl font-extrabold text-foreground mt-1">
                      {selectedResult.experienceScore !== null ? `${selectedResult.experienceScore}%` : "N/A"}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-center col-span-2 sm:col-span-1">
                    <p className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold">AI Confidence</p>
                    <p className="text-xl font-extrabold text-purple-700 dark:text-purple-300 mt-1">
                      {selectedResult.aiConfidence !== null ? `${selectedResult.aiConfidence}%` : "N/A"}
                    </p>
                  </div>
                </div>

                {/* AI Executive Reasoning Box */}
                {selectedResult.aiReasoning && (
                  <div className="rounded-xl border border-purple-500/25 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      AI Evaluation Analysis & Rationale
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {selectedResult.aiReasoning}
                    </p>
                  </div>
                )}

                {/* Mandatory Requirements Checklist */}
                {Array.isArray(selectedResult.mandatoryChecklist) &&
                  selectedResult.mandatoryChecklist.length > 0 && (
                    <div className="space-y-3 rounded-xl border border-border p-4 bg-card">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4 text-primary" />
                        Mandatory Requirements Checklist
                      </h4>
                      <div className="space-y-2">
                        {selectedResult.mandatoryChecklist.map((item: MandatoryChecklistItem, idx: number) => (
                          <div
                            key={idx}
                            className={`flex items-start justify-between text-xs p-2.5 rounded-lg border transition-colors ${
                              item.met
                                ? "bg-emerald-500/5 border-emerald-500/20"
                                : "bg-rose-500/5 border-rose-500/20"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              {item.met ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                              )}
                              <div>
                                <p className="font-semibold text-foreground">{item.requirement}</p>
                                {item.note && (
                                  <p className="text-muted-foreground text-[11px] mt-0.5">{item.note}</p>
                                )}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                item.priority === "REQUIRED"
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {item.priority || "REQUIRED"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Matched vs Missing Requirements */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-emerald-500/20 bg-emerald-500/5 p-4 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Matched Qualifications
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.isArray(selectedResult.matchedRequirements) &&
                      selectedResult.matchedRequirements.length > 0 ? (
                        selectedResult.matchedRequirements.map((req: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-500/20 font-medium"
                          >
                            ✓ {req}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None recorded</span>
                      )}
                    </div>
                  </div>

                  <div className="border border-rose-500/20 bg-rose-500/5 p-4 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Missing / Unmet Gaps
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.isArray(selectedResult.missingRequirements) &&
                      selectedResult.missingRequirements.length > 0 ? (
                        selectedResult.missingRequirements.map((req: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 text-xs bg-rose-500/10 text-rose-800 dark:text-rose-300 rounded-lg border border-rose-500/20 font-medium"
                          >
                            ✗ {req}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None detected</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Key Strengths & Concerns */}
                <div className="grid md:grid-cols-2 gap-4">
                  {Array.isArray(selectedResult.strengths) && selectedResult.strengths.length > 0 && (
                    <div className="border border-border p-4 rounded-xl space-y-2 bg-card">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-500" /> Key Strengths
                      </h4>
                      <ul className="text-xs space-y-1.5 text-muted-foreground">
                        {selectedResult.strengths.map((s: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {Array.isArray(selectedResult.concerns) && selectedResult.concerns.length > 0 && (
                    <div className="border border-border p-4 rounded-xl space-y-2 bg-card">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Key Concerns
                      </h4>
                      <ul className="text-xs space-y-1.5 text-muted-foreground">
                        {selectedResult.concerns.map((c: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-rose-600 font-bold">•</span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    {selectedResult.statusLabel && selectedResult.actionable !== true && (
                      <span
                        className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${currentStatusBadgeClass(
                          selectedResult.actionBlockedReason,
                          selectedResult.actionable
                        )}`}
                      >
                        {selectedResult.statusLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedResult(null)}>
                      Close
                    </Button>
                    {selectedResult.candidateId && selectedResult.actionable === true && (
                      <>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionLoadingId === selectedResult.candidateId}
                          onClick={async () => {
                            await handleShortlistCandidate(selectedResult.candidateId, "reject")
                            setSelectedResult(null)
                          }}
                          className="flex items-center gap-1.5"
                        >
                          <X className="w-4 h-4" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          disabled={actionLoadingId === selectedResult.candidateId}
                          onClick={async () => {
                            await handleShortlistCandidate(selectedResult.candidateId, "select")
                            setSelectedResult(null)
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" /> Shortlist Candidate
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
