"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { SkillPercentageBadge } from "@/components/candidate/VerifiedLevelBadge"

interface VerifiedSkill {
  skillName: string
  verifiedLevel: string
  skillPercentage: number | null
}

interface CandidatePipeline {
  id: string
  candidateId?: string
  candidateName: string
  candidateEmail: string
  jobId?: string
  jobTitle: string
  jobCompany: string
  status: string
  currentStep: number
  totalSteps: number
  completedSteps: number
  progressPercent: number
  startedAt: string
  applicationId?: string
  applicationStatus?: string
  appliedAt?: string
  verifiedSkills?: VerifiedSkill[]
}

interface Job {
  id: string
  title: string
}

export default function AdminCandidatesPage() {
  const searchParams = useSearchParams()
  const jobIdParam = searchParams.get("jobId")

  const [pipelines, setPipelines] = useState<CandidatePipeline[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  // Filter states
  const [searchText, setSearchText] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [jobFilter, setJobFilter] = useState<string>(jobIdParam || "ALL")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [verifiedSkillFilter, setVerifiedSkillFilter] = useState("")
  const [minVerifiedLevelFilter, setMinVerifiedLevelFilter] = useState("ALL")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Fetch jobs for filter dropdown
  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch("/api/jobs")
        if (res.ok) {
          const data = await res.json()
          setJobs(data.jobs || [])
        }
      } catch (error) {
        console.error("Error fetching jobs:", error)
      }
    }
    fetchJobs()
  }, [])

  // Fetch pipelines
  useEffect(() => {
    async function fetchPipelines() {
      try {
        let url = "/api/admin/pipelines"
        const params = new URLSearchParams()

        // Apply jobId filter if present in URL params
        if (jobIdParam) {
          params.append("jobId", jobIdParam)
        }

        if (verifiedSkillFilter.trim()) {
          params.append("verifiedSkill", verifiedSkillFilter.trim())
        }

        if (minVerifiedLevelFilter !== "ALL") {
          params.append("minVerifiedLevel", minVerifiedLevelFilter)
        }

        if (params.toString()) {
          url += `?${params.toString()}`
        }

        const res = await fetch(url)
        const data = await res.json()
        setPipelines(data.pipelines || [])
      } catch (error) {
        console.error("Error fetching pipelines:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPipelines()
  }, [jobIdParam, verifiedSkillFilter, minVerifiedLevelFilter])

  // Apply filters
  const filteredPipelines = useMemo(() => {
    let filtered = [...pipelines]

    // Search filter (name, email, job title, company)
    if (searchText) {
      const search = searchText.toLowerCase()
      filtered = filtered.filter(p =>
        (p.candidateName?.toLowerCase() || "").includes(search) ||
        (p.candidateEmail?.toLowerCase() || "").includes(search) ||
        (p.jobTitle?.toLowerCase() || "").includes(search) ||
        (p.jobCompany?.toLowerCase() || "").includes(search)
      )
    }

    // Status filter
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    // Job filter
    if (jobFilter !== "ALL") {
      filtered = filtered.filter(p => p.jobId === jobFilter)
    }

    // Date range filter (use appliedAt when available, else startedAt; both are Unix seconds from API)
    const toAppliedDate = (p: CandidatePipeline) => {
      const raw = p.appliedAt ?? p.startedAt
      if (raw === undefined || raw === null || raw === "") return new Date(0)
      const n = Number(raw)
      return Number.isNaN(n) ? new Date(raw) : new Date(n * 1000)
    }
    if (dateFrom) {
      filtered = filtered.filter(p => toAppliedDate(p) >= new Date(dateFrom))
    }
    if (dateTo) {
      filtered = filtered.filter(p => {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        return toAppliedDate(p) <= toDate
      })
    }

    return filtered
  }, [pipelines, searchText, statusFilter, jobFilter, dateFrom, dateTo])

  // Pagination
  const paginatedPipelines = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredPipelines.slice(startIndex, endIndex)
  }, [filteredPipelines, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredPipelines.length / itemsPerPage)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchText, statusFilter, jobFilter, dateFrom, dateTo, verifiedSkillFilter, minVerifiedLevelFilter])

  const handleClearFilters = () => {
    setSearchText("")
    setStatusFilter("ALL")
    setJobFilter("ALL")
    setDateFrom("")
    setDateTo("")
    setVerifiedSkillFilter("")
    setMinVerifiedLevelFilter("ALL")
  }

  /** API returns appliedAt/startedAt as Unix seconds (string). Parse and format for display. */
  const formatAppliedDate = (raw: string | undefined): string => {
    if (raw === undefined || raw === null || raw === "") return "—"
    const n = Number(raw)
    const date = Number.isNaN(n) ? new Date(raw) : new Date(n * 1000)
    if (Number.isNaN(date.getTime())) return "—"
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return "bg-blue-500/10 text-blue-500 border border-blue-500/20"
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
      case "REJECTED":
        return "bg-destructive/10 text-destructive border border-destructive/20"
      case "ON_HOLD":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20"
      default:
        return "bg-muted text-muted-foreground border border-border"
    }
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">Candidate Pipelines</h2>
          <p className="text-muted-foreground">
            Showing {filteredPipelines.length} of {pipelines.length} candidates
            {jobIdParam && jobs.length > 0 && (
              <span className="ml-2 text-primary font-medium">
                • Filtered by: {jobs.find(j => j.id === jobIdParam)?.title || "Selected Job"}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-card rounded-xl shadow-lg border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Advanced Filters
          </h3>
          <button
            onClick={handleClearFilters}
            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-muted-foreground mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Name, Email, Job Title, Company..."
                className="w-full px-4 py-2 pl-10 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
              />
              <svg className="w-5 h-5 text-muted-foreground absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
          </div>

          {/* Job Filter */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Job</label>
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground"
            >
              <option value="ALL">All Jobs</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground"
            />
          </div>

          {/* Verified Skill Filter */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Verified Skill</label>
            <input
              type="text"
              value={verifiedSkillFilter}
              onChange={(e) => setVerifiedSkillFilter(e.target.value)}
              placeholder="e.g. React, Python..."
              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Min Verified Level */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Min Verified Level</label>
            <select
              value={minVerifiedLevelFilter}
              onChange={(e) => setMinVerifiedLevelFilter(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-foreground"
            >
              <option value="ALL">Any level</option>
              <option value="BEGINNER">Beginner+</option>
              <option value="INTERMEDIATE">Intermediate+</option>
              <option value="PROFESSIONAL">Professional+</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      {filteredPipelines.length === 0 ? (
        <div className="bg-card rounded-xl shadow-lg border border-border p-12 text-center">
          <svg className="w-16 h-16 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-foreground mb-2">No candidates found</h3>
          <p className="text-muted-foreground mb-4">
            {pipelines.length === 0
              ? "Candidates will appear here once they apply for jobs."
              : "Try adjusting your filters to see more results."
            }
          </p>
          {pipelines.length > 0 && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Table with horizontal scroll */}
          <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      Pipeline ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      Candidate Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      Job Title
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      Company
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      Applied Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      Current Step
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      Progress
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      Completed Steps
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      Verified Skills
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap sticky right-0 bg-muted/50 border-l border-border">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {paginatedPipelines.map((pipeline) => (
                    <tr key={pipeline.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-muted-foreground">
                          #{pipeline.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-foreground">
                          {pipeline.candidateName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-muted-foreground">
                          {pipeline.candidateEmail}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {pipeline.jobTitle}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-muted-foreground">
                          {pipeline.jobCompany}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-muted-foreground">
                          {formatAppliedDate(pipeline.appliedAt ?? pipeline.startedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">
                          {pipeline.totalSteps > 0
                            ? `${pipeline.currentStep} / ${pipeline.totalSteps}`
                            : pipeline.status === "COMPLETED"
                              ? "Completed"
                              : "No steps"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-32">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-secondary rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(0, pipeline.progressPercent))}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-right">
                              {Math.round(pipeline.progressPercent)}%
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {pipeline.completedSteps} / {pipeline.totalSteps}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(pipeline.status)}`}
                        >
                          {pipeline.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {pipeline.verifiedSkills && pipeline.verifiedSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {pipeline.verifiedSkills.slice(0, 3).map((skill) => (
                              <div key={`${skill.skillName}-${skill.verifiedLevel}`} className="flex items-center gap-1">
                                <span className="text-xs text-foreground">{skill.skillName}</span>
                                <SkillPercentageBadge
                                  percentage={skill.skillPercentage}
                                  className="text-[10px] px-1.5 py-0"
                                />
                              </div>
                            ))}
                            {pipeline.verifiedSkills.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{pipeline.verifiedSkills.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right sticky right-0 bg-card border-l border-border">
                        <Link
                          href={`/admin/candidates/${pipeline.id}`}
                          className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-card rounded-xl shadow-lg border border-border px-6 py-4 mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, filteredPipelines.length)}
                </span>{" "}
                of <span className="font-medium">{filteredPipelines.length}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground bg-card border border-input rounded-lg hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage === pageNum
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground bg-card border border-input hover:bg-accent hover:text-accent-foreground"
                          }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground bg-card border border-input rounded-lg hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    // </div >
  )
}
