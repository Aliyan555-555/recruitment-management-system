"use client"

import { useEffect, useState } from "react"
import { VerifiedLevelBadge } from "@/components/candidate/VerifiedLevelBadge"
import { formatVerifiedLevel } from "@/lib/assessments/level-display"

interface AssessmentSummary {
  id: string
  skillName: string
  status: string
  attemptNumber: number
  scoredPoints: number | null
  totalPoints: number | null
  level: string | null
  passed: boolean
  submittedAt: string | null
}

interface SkillWithVerification {
  id: string
  skillName: string
  verifiedLevel: string | null
  verifiedAt: string | null
}

interface CandidateSkillAssessmentsPanelProps {
  candidateId: string
}

function formatAssessmentDate(raw: string | null): string {
  if (!raw) return "—"
  const n = Number(raw)
  const date = Number.isNaN(n) ? new Date(raw) : new Date(n)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "PASSED":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    case "FAILED":
      return "bg-destructive/10 text-destructive border-destructive/20"
    case "IN_PROGRESS":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20"
    case "EXPIRED":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

export function CandidateSkillAssessmentsPanel({
  candidateId,
}: CandidateSkillAssessmentsPanelProps) {
  const [loading, setLoading] = useState(true)
  const [skills, setSkills] = useState<SkillWithVerification[]>([])
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([])

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true)
        const res = await fetch(`/api/assessments/candidate/${candidateId}`)
        if (!res.ok) return
        const data = await res.json()
        setSkills(data.skills || [])
        setAssessments(data.assessments || [])
      } catch {
        // Non-blocking panel
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [candidateId])

  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-lg border border-border p-6">
        <p className="text-sm text-muted-foreground">Loading skill assessment history...</p>
      </div>
    )
  }

  if (skills.length === 0 && assessments.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground">AI Skill Assessments</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          This candidate has not taken any AI skill assessments yet.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl shadow-lg border border-border p-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">AI Skill Assessments</h3>
          <p className="text-sm text-muted-foreground">
            Verified skills and assessment attempt history
          </p>
        </div>
      </div>

      {skills.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-foreground mb-3">Verified Skills</h4>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30"
              >
                <span className="text-sm font-medium text-foreground">{skill.skillName}</span>
                {skill.verifiedLevel ? (
                  <VerifiedLevelBadge level={skill.verifiedLevel} />
                ) : (
                  <span className="text-xs text-muted-foreground">Not verified</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {assessments.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Assessment History</h4>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Skill</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Attempt</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Level</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assessments.map((assessment) => (
                  <tr key={assessment.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{assessment.skillName}</td>
                    <td className="px-4 py-3 text-muted-foreground">#{assessment.attemptNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {assessment.scoredPoints != null && assessment.totalPoints != null
                        ? `${assessment.scoredPoints}/${assessment.totalPoints}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {assessment.level ? formatVerifiedLevel(assessment.level) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadgeClass(assessment.status)}`}
                      >
                        {assessment.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatAssessmentDate(assessment.submittedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
