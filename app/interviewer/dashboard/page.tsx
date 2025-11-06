"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  ArrowRight, 
  Loader2, 
  Calendar,
  User
} from "lucide-react"

interface DashboardStats {
  totalAssignments: number
  pendingAssignments: number
  inProgressAssignments: number
  completedAssignments: number
  completionRate: number
}

interface RecentAssignment {
  id: string
  status: string
  stepOrder: number
  workflowStep: {
    id: string
    stepName: string
    stepOrder: number
  }
  pipeline: {
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
  createdAt: string
}

interface UpcomingInterview {
  id: string
  startsAt: string
  endsAt: string
  stepName: string
  bookings: Array<{
    id: string
    candidateName: string
    candidateEmail: string
  }>
}

export default function InterviewerDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalAssignments: 0,
    pendingAssignments: 0,
    inProgressAssignments: 0,
    completedAssignments: 0,
    completionRate: 0,
  })
  const [recentAssignments, setRecentAssignments] = useState<RecentAssignment[]>([])
  const [upcomingInterviews, setUpcomingInterviews] = useState<UpcomingInterview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/interviewer/dashboard", {
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
      setRecentAssignments(data.recentAssignments || [])
      setUpcomingInterviews(data.upcomingInterviews || [])
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
      case "PENDING":
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
          Overview of your interview assignments and schedule
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Assignments"
          value={stats.totalAssignments}
          description="All assigned interviews"
          href="/interviewer/assignments"
          icon={Briefcase}
        />
        <StatCard
          title="Pending"
          value={stats.pendingAssignments}
          description="Awaiting your action"
          href="/interviewer/assignments?status=PENDING"
          icon={Clock}
        />
        <StatCard
          title="In Progress"
          value={stats.inProgressAssignments}
          description="Currently reviewing"
          href="/interviewer/assignments?status=IN_PROGRESS"
          icon={TrendingUp}
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          description="Successfully completed"
          icon={CheckCircle2}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Assignments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Assignments</CardTitle>
                <CardDescription>Latest interview assignments</CardDescription>
              </div>
              <Link href="/interviewer/assignments">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentAssignments.length > 0 ? (
              <div className="space-y-4">
                {recentAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{assignment.pipeline.candidate.name}</p>
                        <Badge className={getStatusColor(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {assignment.pipeline.job.title} • {assignment.pipeline.job.company}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Step {assignment.stepOrder}: {assignment.workflowStep.stepName}
                      </p>
                    </div>
                    <Link href={`/interviewer/assignments/${assignment.id}`}>
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
                <p>No assignments yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Interviews */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Interviews</CardTitle>
                <CardDescription>Next 7 days schedule</CardDescription>
              </div>
              <Link href="/interviewer/calendar">
                <Button variant="outline" size="sm">
                  View Calendar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingInterviews.length > 0 ? (
              <div className="space-y-4">
                {upcomingInterviews.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {new Date(slot.startsAt).toLocaleDateString()}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {new Date(slot.startsAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })} - {new Date(slot.endsAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {slot.stepName}
                      </p>
                      {slot.bookings.length > 0 ? (
                        <div className="space-y-1">
                          {slot.bookings.map((booking) => (
                            <div key={booking.id} className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">
                                {booking.candidateName}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No bookings yet
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming interviews</p>
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
            <Link href="/interviewer/assignments">
              <Button className="w-full" size="lg">
                <Briefcase className="mr-2 h-5 w-5" />
                View Assignments
              </Button>
            </Link>
            <Link href="/interviewer/calendar">
              <Button variant="outline" className="w-full" size="lg">
                <Calendar className="mr-2 h-5 w-5" />
                Manage Calendar
              </Button>
            </Link>
            <Link href="/interviewer/assignments?status=PENDING">
              <Button variant="outline" className="w-full" size="lg">
                <Clock className="mr-2 h-5 w-5" />
                Pending Reviews
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
