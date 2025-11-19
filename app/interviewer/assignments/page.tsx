"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Loader2,
  Search,
  Filter
} from "lucide-react"

interface Assignment {
  id: string
  type: "pipeline" | "batch"
  status: string
  stepOrder: number
  workflowStep: {
    id: string
    stepName: string
    stepOrder: number
  }
  pipeline?: {
    id: string
    job: {
      id: string
      title: string
      company: string
    }
    candidate: {
      id: string
      name: string
      email: string
    }
  }
  batch?: {
    id: string
    batchNumber: number
    batchName?: string
    candidateCount: number
    job: {
      id: string
      title: string
      company: string
    }
  }
}

export default function AssignmentsPage() {
  const searchParams = useSearchParams()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all")

  useEffect(() => {
    fetchAssignments()
  }, [])

  useEffect(() => {
    filterAssignments()
  }, [assignments, searchQuery, statusFilter])

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/interviewer/assignments", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || `Failed to fetch assignments: ${response.statusText}`
        )
      }

      const data = await response.json()
      setAssignments(data.assignments || [])
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch assignments"
      console.error("Error fetching assignments:", err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const filterAssignments = () => {
    let filtered = [...assignments]

    if (statusFilter !== "all") {
      filtered = filtered.filter(a => a.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((assignment) => {
        const jobTitle = assignment.pipeline?.job.title || assignment.batch?.job.title || ""
        const jobCompany = assignment.pipeline?.job.company || assignment.batch?.job.company || ""
        const candidateOrBatch =
          assignment.pipeline?.candidate.name ||
          assignment.batch?.batchName ||
          (assignment.batch?.batchNumber ? `Batch ${assignment.batch.batchNumber}` : "")
        const stepName = assignment.workflowStep.stepName || ""

        return [jobTitle, jobCompany, candidateOrBatch, stepName].some((field) =>
          field.toLowerCase().includes(query)
        )
      })
    }

    setFilteredAssignments(filtered)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800"
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800"
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return CheckCircle2
      case "IN_PROGRESS":
        return Clock
      case "PENDING":
        return Clock
      default:
        return Briefcase
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
          Error Loading Assignments
        </h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchAssignments} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === "PENDING").length,
    inProgress: assignments.filter(a => a.status === "IN_PROGRESS").length,
    completed: assignments.filter(a => a.status === "COMPLETED").length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Assignments</h2>
        <p className="text-muted-foreground mt-2">
          Manage your interview assignments and provide feedback
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All assignments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently reviewing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground mt-1">Finished reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Assignments</CardTitle>
          <CardDescription>Filter and search through your assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by job, candidate, or step..."
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
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredAssignments.length > 0 ? (
            <div className="space-y-4">
              {filteredAssignments.map((assignment) => {
                const StatusIcon = getStatusIcon(assignment.status)
                const isBatch = assignment.type === "batch"
                const displayName = isBatch
                  ? assignment.batch?.batchName || (assignment.batch?.batchNumber ? `Batch ${assignment.batch.batchNumber}` : "Batch assignment")
                  : assignment.pipeline?.candidate.name || "Unnamed candidate"
                const jobTitle = assignment.pipeline?.job.title || assignment.batch?.job.title || "Untitled role"
                const jobCompany = assignment.pipeline?.job.company || assignment.batch?.job.company || ""
                const destination = isBatch
                  ? `/interviewer/batches/${assignment.batch?.id}`
                  : `/interviewer/assignments/${assignment.id}`
                const description = isBatch
                  ? `${assignment.batch?.candidateCount || 0} candidate(s)`
                  : assignment.pipeline?.candidate.email
                return (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusIcon className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{displayName}</p>
                        {isBatch && (
                          <Badge variant="outline" className="text-xs">
                            Batch
                          </Badge>
                        )}
                        <Badge className={getStatusColor(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {jobTitle}
                        {jobCompany ? ` • ${jobCompany}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Step {assignment.stepOrder}: {assignment.workflowStep.stepName}
                        {description ? ` • ${description}` : ""}
                      </p>
                    </div>
                    <Link href={destination}>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {searchQuery || statusFilter !== "all" 
                  ? "No assignments match your filters" 
                  : "No assignments yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batches Section */}
      <BatchesSection />
    </div>
  )
}

function BatchesSection() {
  const [batches, setBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBatches()
  }, [])

  async function fetchBatches() {
    try {
      const res = await fetch("/api/interviewer/batches?status=IN_PROGRESS")
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches || [])
      }
    } catch (error) {
      console.error("Error fetching batches:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bulk Hiring Batches</CardTitle>
          <CardDescription>Evaluate candidates in batches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (batches.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Hiring Batches</CardTitle>
        <CardDescription>Evaluate candidates in batches</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {batch.batchName || `Batch ${batch.batchNumber}`}
                  </p>
                  <Badge className="bg-blue-100 text-blue-800">
                    {batch.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {batch.job.title} • {batch.job.company}
                </p>
                <p className="text-xs text-muted-foreground">
                  Step {batch.workflowStep.stepOrder}: {batch.workflowStep.stepName} • {batch.candidateCount} candidate(s)
                </p>
              </div>
              <Link href={`/interviewer/batches/${batch.id}`}>
                <Button variant="ghost" size="sm">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
