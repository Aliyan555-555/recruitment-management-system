"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Users, FileCheck, TrendingUp, Calendar, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { useDashboardStore } from "@/store/useDashboardStore"
import { useJobsStore } from "@/store/useJobsStore"
import { JobCardSkeleton } from "@/components/JobCardSkeleton"
import type { Job } from "@/store/useJobsStore"

export default function HomePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { stats, recentApplications, upcomingInterviews, loading, error, fetchDashboardData } = useDashboardStore()
  const { jobs, fetchJobs } = useJobsStore()

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const userRole = session.user.role

      // Redirect based on role
      if (userRole === "ADMIN") {
        router.push("/admin/dashboard")
        return
      } else if (userRole === "INTERVIEWER") {
        router.push("/interviewer/dashboard")
        return
      }

      // Only fetch data for CANDIDATE users on home page
      if (userRole === "CANDIDATE") {
        fetchDashboardData()
        fetchJobs()
      }
    }
  }, [status, session, router, fetchDashboardData, fetchJobs])

  // Show loading state while checking authentication or redirecting
  if (status === "loading" || (status === "authenticated" && session?.user?.role && session.user.role !== "CANDIDATE")) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    )
  }

  // Show public landing page if not authenticated
  if (!session) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main>
          <div className="relative isolate px-6 pt-14 lg:px-8">
            <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
              <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-secondary opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
            </div>

            <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
              <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                  Professional Recruitment Management System
                </h1>
                <p className="mt-6 text-lg leading-8 text-muted-foreground">
                  Streamline your hiring process with our comprehensive recruitment platform. 
                  Manage applications, schedule interviews, and find the perfect candidates.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Link href="/register">
                    <Button size="lg">
                      Get Started
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="lg">
                      Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Briefcase className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>Job Management</CardTitle>
                  <CardDescription>
                    Post jobs, manage applications, and track candidates through the entire hiring process.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Users className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>Candidate Tracking</CardTitle>
                  <CardDescription>
                    Keep track of all candidates, their skills, education, and interview performance.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <FileCheck className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>Interview Scheduling</CardTitle>
                  <CardDescription>
                    Schedule and manage screening, focus group, and final interviews efficiently.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Authenticated user dashboard
  const recentJobs = jobs.slice(0, 3)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">
            Welcome back, {session.user?.name || "User"}!
          </h1>
          <p className="text-xl text-muted-foreground">
            Manage your recruitment journey from one place
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.activeJobs}</div>
                  <p className="text-xs text-muted-foreground">Available positions</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.applications}</div>
                  <p className="text-xs text-muted-foreground">Your applications</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Interviews</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.interviews}</div>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.successRate}%</div>
                  <p className="text-xs text-muted-foreground">Application success</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with your recruitment journey</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/jobs" className="block">
                <Button className="w-full" size="lg">
                  <Briefcase className="mr-2 h-5 w-5" />
                  Browse Jobs
                </Button>
              </Link>
              <Link href="/profile" className="block">
                <Button variant="outline" className="w-full" size="lg">
                  Complete Your Profile
                </Button>
              </Link>
              {stats.applications > 0 && (
                <Link href="/applications" className="block">
                  <Button variant="outline" className="w-full" size="lg">
                    <FileCheck className="mr-2 h-5 w-5" />
                    View Applications
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest actions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : recentApplications.length > 0 ? (
                <div className="space-y-3">
                  {recentApplications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{app.jobTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {app.jobCompany} • {new Date(app.appliedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {app.status === "COMPLETED" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : app.status === "REJECTED" ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                    </div>
                  ))}
                  <Link href="/applications">
                    <Button variant="outline" className="w-full mt-2" size="sm">
                      View All Applications
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recent activity
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Interviews */}
        {upcomingInterviews.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Upcoming Interviews</CardTitle>
              <CardDescription>Your scheduled interview sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingInterviews.map((interview) => (
                  <div
                    key={interview.slotId}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{interview.jobTitle}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {interview.stepName} • {interview.jobCompany}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(interview.startsAt).toLocaleString()}
                      </p>
                    </div>
                    {interview.meetingLink && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer">
                          Join Meeting
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Job Opportunities</CardTitle>
              <CardDescription>Latest job postings available</CardDescription>
            </div>
            <Link href="/jobs">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <JobCardSkeleton key={i} />
                ))}
              </div>
            ) : recentJobs.length > 0 ? (
              <div className="space-y-4">
                {recentJobs.map((job: Job) => (
                  <Card key={job.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{job.title}</CardTitle>
                          <CardDescription>{job.company}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {job.shortDescription && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {job.shortDescription}
                        </p>
                      )}
                      <Link href={`/jobs/${job.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No jobs available at the moment
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
