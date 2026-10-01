"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { JobPipelineHeaderLoader } from "@/components/admin/useJobPipeline"
import { RoundSubNav } from "@/components/admin/RoundSubNav"
import { QueueEmptyState } from "@/components/admin/QueueEmptyState"
import { CandidateQueueTabs } from "@/components/admin/CandidateQueueTabs"

interface Candidate {
  id: string
  name: string
  email: string
  status: string
  appliedAt: string
  shortlistedAt?: string
  assessmentStatus?: string
  assessmentScore?: number | null
  recommendation?: string | null
  interviewer?: string
  assessedAt?: string
  loiStatus?: string
  offerStatus?: string
}

interface RoundCounts {
  pending: number
  shortlisted: number
}

interface WorkflowStep {
  id: string
  stepName: string
  stepType: string | null
  stepOrder: number
  job?: { id: string; title: string; jobCode?: string | null }
  nextStep?: { id: string; stepName: string; stepOrder: number } | null
}

type AssessmentTab = "needs-assessment" | "assessed"

export default function ShortlistedCandidatesPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const roundId = params.roundId as string

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [counts, setCounts] = useState<RoundCounts>({ pending: 0, shortlisted: 0 })
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep | null>(null)
  const [loading, setLoading] = useState(true)
  const [assessmentTab, setAssessmentTab] = useState<AssessmentTab>("needs-assessment")

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const stepRes = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}`)
      if (stepRes.status === 404 || stepRes.status === 400) {
        router.replace("/admin/jobs")
        return
      }
      let stepType: string | null = null
      if (stepRes.ok) {
        const stepData = await stepRes.json()
        setWorkflowStep(stepData.workflowStep)
        stepType = stepData.workflowStep?.stepType || null
      }

      const res = await fetch(
        `/api/admin/jobs/${jobId}/rounds/${roundId}/candidates?status=shortlisted`
      )
      if (res.ok) {
        const data = await res.json()
        if (data.counts) {
          setCounts({
            pending: data.counts.pending,
            shortlisted: data.counts.shortlisted,
          })
        }
        let candidatesData: Candidate[] = data.candidates || []

        if (stepType === "OFFER") {
          candidatesData = await Promise.all(
            candidatesData.map(async (candidate) => {
              try {
                const loiRes = await fetch(
                  `/api/admin/jobs/${jobId}/rounds/${roundId}/candidates/${candidate.id}/loi`
                )
                if (loiRes.ok) {
                  const loiData = await loiRes.json()
                  candidate.loiStatus = loiData.loi?.status || null
                }
                const offerRes = await fetch(
                  `/api/admin/jobs/${jobId}/rounds/${roundId}/candidates/${candidate.id}/offer`
                )
                if (offerRes.ok) {
                  const offerData = await offerRes.json()
                  candidate.offerStatus = offerData.offerLetter?.status || null
                }
              } catch (error) {
                console.error(`Error fetching LOI/Offer for candidate ${candidate.id}:`, error)
              }
              return candidate
            })
          )
        }

        setCandidates(candidatesData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      router.replace("/admin/jobs")
    } finally {
      setLoading(false)
    }
  }, [jobId, roundId, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const isAssessed = (c: Candidate) => c.status === "COMPLETED"
  const filteredCandidates =
    workflowStep?.stepType === "OFFER"
      ? candidates
      : candidates.filter((c) =>
          assessmentTab === "assessed" ? isAssessed(c) : !isAssessed(c)
        )

  const needsAssessmentCount = candidates.filter((c) => !isAssessed(c)).length
  const assessedCount = candidates.filter((c) => isAssessed(c)).length

  if (loading) return <div className="p-8 text-center">Loading candidates...</div>

  return (
    <div className="space-y-6 p-6">
      <JobPipelineHeaderLoader jobId={jobId} currentStageId={roundId} />

      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {workflowStep?.stepName || "Round"} — In Round
        </h2>
        <p className="text-muted-foreground">Track assessments and move to next round</p>
      </div>

      <RoundSubNav
        jobId={jobId}
        roundId={roundId}
        stepType={workflowStep?.stepType}
        activeView="shortlisted"
        counts={counts}
      />

      {workflowStep?.stepType !== "OFFER" && candidates.length > 0 && (
        <CandidateQueueTabs
          tabs={[
            { id: "needs-assessment", label: "Needs Assessment", count: needsAssessmentCount },
            { id: "assessed", label: "Assessed", count: assessedCount },
          ]}
          activeTab={assessmentTab}
          onTabChange={(tab) => setAssessmentTab(tab as AssessmentTab)}
        />
      )}

      {candidates.length === 0 ? (
        <QueueEmptyState
          variant="round-empty"
          actions={[
            {
              label: "Back to Needs Review",
              href: `/admin/jobs/${jobId}/rounds/${roundId}/applied`,
            },
          ]}
        />
      ) : filteredCandidates.length === 0 ? (
        <QueueEmptyState
          variant="queue-complete"
          queueLabel={assessmentTab === "needs-assessment" ? "Needs Assessment" : "Assessed"}
          counts={{ remaining: 0, inRound: candidates.length }}
          actions={[
            {
              label: assessmentTab === "needs-assessment" ? "View Assessed" : "View Needs Assessment",
              onClick: () =>
                setAssessmentTab(assessmentTab === "needs-assessment" ? "assessed" : "needs-assessment"),
            },
          ]}
        />
      ) : (
        <div className="bg-card rounded-xl shadow overflow-hidden border border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Candidate
                </th>
                {workflowStep?.stepType !== "OFFER" && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Assessment Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Recommendation
                    </th>
                  </>
                )}
                {workflowStep?.stepType === "OFFER" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    LOI Status
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Public Profile
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredCandidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-foreground">{candidate.name}</div>
                    <div className="text-sm text-muted-foreground">{candidate.email}</div>
                  </td>
                  {workflowStep?.stepType !== "OFFER" && (
                    <>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            candidate.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-yellow-500/10 text-yellow-500"
                          }`}
                        >
                          {candidate.status === "COMPLETED" ? "Assessed" : "Pending Assessment"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {candidate.assessmentScore ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-sm">{candidate.recommendation ?? "-"}</td>
                    </>
                  )}
                  {workflowStep?.stepType === "OFFER" && (
                    <td className="px-6 py-4 text-sm">{candidate.loiStatus ?? "-"}</td>
                  )}
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/candidate/profile/public/${candidate.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View Profile
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    {workflowStep?.stepType === "FOCUS_GROUP" ? (
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/jobs/${jobId}/rounds/${roundId}/candidates/${candidate.id}/assessment/internal`}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg"
                        >
                          Internal
                        </Link>
                        <Link
                          href={`/admin/jobs/${jobId}/rounds/${roundId}/candidates/${candidate.id}/assessment/external`}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg"
                        >
                          External
                        </Link>
                      </div>
                    ) : workflowStep?.stepType === "OFFER" ? (
                      <Link
                        href={`/admin/jobs/${jobId}/rounds/${roundId}/candidates/${candidate.id}/loi`}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg"
                      >
                        {candidate.loiStatus ? "View LOI" : "Generate LOI"}
                      </Link>
                    ) : (
                      <Link
                        href={`/admin/jobs/${jobId}/rounds/${roundId}/candidates/${candidate.id}/assessment`}
                        className="text-primary hover:underline"
                      >
                        {candidate.status === "COMPLETED" ? "View Assessment" : "Assess"}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between">
        <Link
          href={`/admin/jobs/${jobId}/rounds/${roundId}/applied`}
          className="px-6 py-3 text-sm font-medium border border-input rounded-lg hover:bg-accent"
        >
          ← Back to Needs Review
        </Link>
        <Link
          href={
            workflowStep?.stepType === "OFFER"
              ? `/admin/jobs/${jobId}/rounds/${roundId}/offers`
              : `/admin/jobs/${jobId}/rounds/${roundId}/results`
          }
          className="px-6 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90"
        >
          Continue to {workflowStep?.stepType === "OFFER" ? "Offers" : "Results"}
        </Link>
      </div>
    </div>
  )
}
