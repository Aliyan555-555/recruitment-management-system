"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { SkillPercentageBadge } from "@/components/candidate/VerifiedLevelBadge"

interface AssessmentResult {
  id: string
  candidateId: string
  candidateName: string
  candidateEmail: string
  skillName: string
  passed: boolean
  attemptNumber: number
  scoredPoints: number | null
  maxPoints: number | null
  scorePercentage: number | null
  submittedAt: string | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

function formatSubmittedAt(raw: string | null): string {
  if (!raw) return "—"
  const n = Number(raw)
  const date = Number.isNaN(n) ? new Date(raw) : new Date(n * 1000)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AdminSkillAssessmentsPage() {
  const [results, setResults] = useState<AssessmentResult[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)

  const [skillFilter, setSkillFilter] = useState("")
  const [levelFilter, setLevelFilter] = useState("ALL")
  const [minScore, setMinScore] = useState("")
  const [sort, setSort] = useState("submittedAt")
  const [order, setOrder] = useState<"asc" | "desc">("desc")

  const fetchResults = useCallback(async (page: number) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        sort,
        order,
      })

      if (skillFilter.trim()) params.set("skill", skillFilter.trim())
      if (levelFilter !== "ALL") params.set("level", levelFilter)
      if (minScore.trim()) params.set("minScore", minScore.trim())

      const res = await fetch(`/api/assessments/results?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to load results")
      }

      setResults(data.results || [])
      setPagination(data.pagination)
    } catch (error) {
      console.error("Error fetching assessment results:", error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [skillFilter, levelFilter, minScore, sort, order])

  useEffect(() => {
    fetchResults(1)
  }, [fetchResults])

  const handleClearFilters = () => {
    setSkillFilter("")
    setLevelFilter("ALL")
    setMinScore("")
    setSort("submittedAt")
    setOrder("desc")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">
          AI Skill Assessment Results
        </h2>
        <p className="text-muted-foreground">
          Review completed skill assessments across all candidates.
        </p>
      </div>

      <div className="bg-card rounded-xl shadow-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Filters</h3>
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            Clear all
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-muted-foreground mb-1">Skill</label>
            <input
              type="text"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              placeholder="e.g. React, Python..."
              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Level</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
            >
              <option value="ALL">All levels</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Min score</label>
            <input
              type="number"
              min={0}
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              placeholder="e.g. 60"
              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Sort by</label>
            <select
              value={`${sort}-${order}`}
              onChange={(e) => {
                const [nextSort, nextOrder] = e.target.value.split("-")
                setSort(nextSort)
                setOrder(nextOrder as "asc" | "desc")
              }}
              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
            >
              <option value="submittedAt-desc">Newest first</option>
              <option value="submittedAt-asc">Oldest first</option>
              <option value="score-desc">Highest score</option>
              <option value="score-asc">Lowest score</option>
              <option value="skill-asc">Skill A–Z</option>
              <option value="level-desc">Level high–low</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : results.length === 0 ? (
        <div className="bg-card rounded-xl shadow-lg border border-border p-12 text-center">
          <h3 className="text-xl font-semibold text-foreground mb-2">No results found</h3>
          <p className="text-muted-foreground">
            Completed assessments will appear here once candidates submit them.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Candidate</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Skill</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Attempt</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Score</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Percentage</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((result) => (
                    <tr key={result.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">{result.candidateName}</div>
                        <div className="text-xs text-muted-foreground">{result.candidateEmail}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{result.skillName}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">#{result.attemptNumber}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {result.scoredPoints != null && result.maxPoints != null
                          ? `${result.scoredPoints}/${result.maxPoints}`
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <SkillPercentageBadge percentage={result.scorePercentage} />
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {formatSubmittedAt(result.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-card rounded-xl border border-border px-6 py-4">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} results)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchResults(pagination.page - 1)}
                  className="px-4 py-2 text-sm border border-input rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchResults(pagination.page + 1)}
                  className="px-4 py-2 text-sm border border-input rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <p className="text-sm text-muted-foreground">
        Tip: Open a candidate&apos;s pipeline detail under{" "}
        <Link href="/admin/candidates" className="text-primary hover:underline">
          Candidates
        </Link>{" "}
        to see their full assessment history.
      </p>
    </div>
  )
}
