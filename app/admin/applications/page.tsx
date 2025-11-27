"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  FileText,
  Search,
  Filter,
  ArrowRight,
  Loader2,
  User,
  Briefcase,
  Calendar
} from "lucide-react"

interface Application {
  id: string
  candidateName: string
  candidateEmail: string
  jobTitle: string
  jobCompany: string
  status: string
  appliedAt: string
  pipeline: {
    id: string
    currentStep: number
    totalSteps: number
    completedSteps: number
    progressPercent: number
    overallStatus: string
  } | null
}

const getPipelineProgress = (pipeline: Application["pipeline"]) => {
  if (!pipeline) return 0

  if (pipeline.progressPercent !== undefined) {
    return Math.min(100, Math.max(0, Math.round(pipeline.progressPercent)))
  }

  const { totalSteps, completedSteps, overallStatus } = pipeline

  if (!totalSteps || totalSteps <= 0) {
    return overallStatus === "COMPLETED" ? 100 : 0
  }

  return Math.min(100, Math.round((completedSteps / totalSteps) * 100))
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [jobFilter, setJobFilter] = useState<string>("all")
  const [jobs, setJobs] = useState<Array<{ id: string; title: string; company: string }>>([])

  useEffect(() => {
    fetchApplications()
    fetchJobs()
  }, [])

  useEffect(() => {
    filterApplications()
  }, [applications, searchQuery, statusFilter, jobFilter])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/admin/applications", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || `Failed to fetch applications: ${response.statusText}`
        )
      }

      const data = await response.json()
      setApplications(data.applications || [])
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch applications"
      console.error("Error fetching applications:", err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/jobs")
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error("Error fetching jobs:", error)
    }
  }

  const filterApplications = () => {
    let filtered = [...applications]

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(a => a.status === statusFilter)
    }

    // Filter by job
    if (jobFilter !== "all") {
      filtered = filtered.filter(a => a.pipeline?.id === jobFilter || a.jobTitle.toLowerCase().includes(jobFilter.toLowerCase()))
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(a =>
        a.candidateName.toLowerCase().includes(query) ||
        a.candidateEmail.toLowerCase().includes(query) ||
        a.jobTitle.toLowerCase().includes(query) ||
        a.jobCompany.toLowerCase().includes(query)
      )
    }

    setFilteredApplications(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-green-100 text-green-800"
      case "REJECTED":
        return "bg-red-100 text-red-800"
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "SHORTLISTED":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPipelineStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800"
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800"
      case "REJECTED":
        return "bg-red-100 text-red-800"
      case "ON_HOLD":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-destructive mb-2">
          Error Loading Applications
        </h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchApplications} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === "PENDING").length,
    accepted: applications.filter(a => a.status === "ACCEPTED").length,
    rejected: applications.filter(a => a.status === "REJECTED").length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Applications</h2>
        <p className="text-muted-foreground mt-2">
          Manage all job applications and track candidate progress
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All applications</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.accepted}</div>
            <p className="text-xs text-muted-foreground mt-1">Successful</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground mt-1">Not selected</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Applications</CardTitle>
          <CardDescription>Filter and search through applications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by candidate, job, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="SHORTLISTED">Shortlisted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredApplications.length > 0 ? (
            <div className="space-y-4">
              {filteredApplications.map((application) => (
                <div
                  key={application.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">{application.candidateName}</p>
                      <Badge className={getStatusColor(application.status)}>
                        {application.status}
                      </Badge>
                      {application.pipeline && (
                        <Badge className={getPipelineStatusColor(application.pipeline.overallStatus)}>
                          {application.pipeline.overallStatus}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      <Briefcase className="h-3 w-3 inline mr-1" />
                      {application.jobTitle} • {application.jobCompany}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {application.candidateEmail}
                    </p>
                    {application.pipeline && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${getPipelineProgress(application.pipeline)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {application.pipeline.totalSteps > 0
                            ? `Step ${Math.min(
                              Math.max(application.pipeline.currentStep, 1),
                              application.pipeline.totalSteps
                            )}/${application.pipeline.totalSteps}`
                            : application.pipeline.overallStatus === "COMPLETED"
                              ? "Completed"
                              : "No steps"}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Applied: {new Date(parseInt(application.appliedAt) * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {application.pipeline && (
                      <Link href={`/admin/candidates/${application.pipeline.id}`}>
                        <Button variant="outline" size="sm">
                          View Pipeline
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {searchQuery || statusFilter !== "all"
                  ? "No applications match your filters"
                  : "No applications yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

