"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Briefcase, Users, Clock, TrendingUp, ArrowRight, Loader2, FileText, CheckCircle2 } from "lucide-react"
import { Calendar } from "@/components/admin/Calendar"

interface DashboardStats {
  totalJobs: number
  activeCandidates: number
  pendingInterviews: number
  completionRate: number
}

interface RecentPipeline {
  id: string
  candidateName: string
  candidateEmail: string
  jobTitle: string
  jobCompany: string
  status: string
  currentStep: number
  totalSteps: number
  completedSteps: number
  progressPercent: number
  startedAt: string
}

interface RecentJob {
  id: string
  title: string
  company: string
  applicationCount: number
  createdAt: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeCandidates: 0,
    pendingInterviews: 0,
    completionRate: 0,
  })
  const [recentPipelines, setRecentPipelines] = useState<RecentPipeline[]>([])
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/admin/dashboard", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || `Failed to fetch dashboard data: ${response.statusText}`
        )
      }

      const data = await response.json()
      setStats(data.stats)
      setRecentPipelines(data.recentPipelines || [])
      setRecentJobs(data.recentJobs || [])
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch dashboard data"
      console.error("Error fetching dashboard data:", err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
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

  const StatCard = ({ 
    title, 
    value, 
    description, 
    href, 
    icon: Icon 
  }: {
    title: string
    value: string | number
    description: string
    href?: string
    icon: React.ElementType
  }) => {
    const content = (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </CardContent>
      </Card>
    )

    if (href) {
      return (
        <Link href={href} className="block">
          {content}
        </Link>
      )
    }

    return content
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
          Error Loading Dashboard
        </h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchDashboardData} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-2">
          Overview of your recruitment system
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Jobs"
          value={stats.totalJobs}
          description="Active job postings"
          href="/admin/jobs"
          icon={Briefcase}
        />
        <StatCard
          title="Active Candidates"
          value={stats.activeCandidates}
          description="Candidates in pipeline"
          href="/admin/candidates"
          icon={Users}
        />
        <StatCard
          title="Pending Interviews"
          value={stats.pendingInterviews}
          description="Awaiting interviewer feedback"
          icon={Clock}
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          description="Successful applications"
          icon={TrendingUp}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Candidates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Candidates</CardTitle>
                <CardDescription>Latest pipeline activity</CardDescription>
              </div>
              <Link href="/admin/candidates">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentPipelines.length > 0 ? (
              <div className="space-y-4">
                {recentPipelines.map((pipeline) => (
                  <div
                    key={pipeline.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{pipeline.candidateName}</p>
                        <Badge className={getStatusColor(pipeline.status)}>
                          {pipeline.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {pipeline.jobTitle} • {pipeline.jobCompany}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(0, pipeline.progressPercent))}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {pipeline.totalSteps > 0
                            ? `${pipeline.currentStep}/${pipeline.totalSteps}`
                            : pipeline.status === "COMPLETED"
                              ? "Completed"
                              : "No steps"}
                        </span>
                      </div>
                    </div>
                    <Link href={`/admin/candidates/${pipeline.id}`}>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No candidates yet</p>
                <Link href="/admin/jobs/create">
                  <Button variant="outline" className="mt-4" size="sm">
                    Create a job posting
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Jobs</CardTitle>
                <CardDescription>Latest job postings</CardDescription>
              </div>
              <Link href="/admin/jobs">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentJobs.length > 0 ? (
              <div className="space-y-4">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{job.title}</p>
                        <Badge variant="secondary">{job.applicationCount} applications</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {job.company} • {new Date(job.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Link href={`/admin/jobs/${job.id}`}>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No jobs yet</p>
                <Link href="/admin/jobs/create">
                  <Button variant="outline" className="mt-4" size="sm">
                    Create New Job
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin/jobs/create">
              <Button className="w-full" size="lg">
                <Briefcase className="mr-2 h-5 w-5" />
                Create New Job
              </Button>
            </Link>
            <Link href="/admin/candidates">
              <Button variant="outline" className="w-full" size="lg">
                <Users className="mr-2 h-5 w-5" />
                Manage Candidates
              </Button>
            </Link>
            <Link href="/admin/interviewers">
              <Button variant="outline" className="w-full" size="lg">
                <FileText className="mr-2 h-5 w-5" />
                View Interviewers
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Interview Calendar */}
      <Calendar />
    </div>
  )
}
