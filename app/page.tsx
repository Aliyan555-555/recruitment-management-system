"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { JobsLandingHero } from "@/components/JobsLandingHero"
import { PublicJobCard } from "@/components/PublicJobCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Briefcase, Users, FileCheck, TrendingUp, Calendar, Clock, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useDashboardStore } from "@/store/useDashboardStore"
import { useJobsStore } from "@/store/useJobsStore"
import { JobCardSkeleton } from "@/components/JobCardSkeleton"
import type { Job } from "@/store/useJobsStore"
import { useMandatoryAssessmentRedirect } from "@/components/candidate/useMandatoryAssessmentRedirect"

interface PublicJob {
  id: string
  title: string
  company: string
  shortDescription: string
  description: string
  industry: string
  employmentType: string
  employmentShift?: string
  totalPositions?: number
  minimumExperience?: string
  minimumSalary?: string
  benefits?: string
  postFrom: string
  postTo: string
  jobType: string
  jobStatus: string
  createdAt: string
  locations: Array<{
    city: string
    country: string
  }>
  skills: string[]
  educationRequirements: Array<{
    level: string
    field?: string
    isRequired: boolean
  }>
  applicationCount: number
}

export default function HomePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  useMandatoryAssessmentRedirect(status === "authenticated" && session?.user?.role === "CANDIDATE")
  const { stats, recentApplications, upcomingInterviews, loading: dashboardLoading, error, fetchDashboardData } = useDashboardStore()
  const { jobs, loading: jobsLoading, fetchJobs } = useJobsStore()

  // Public jobs state
  const [publicJobs, setPublicJobs] = useState<PublicJob[]>([])
  const [publicJobsLoading, setPublicJobsLoading] = useState(true)
  const [publicJobsError, setPublicJobsError] = useState<string | null>(null)

  // Organization state for footer
  const [orgData, setOrgData] = useState<{
    name: string
    description: string
    email: string
    phone: string
    address: string
  } | null>(null)
  const [orgDataLoading, setOrgDataLoading] = useState(true)

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

  // Fetch public jobs and organization data for unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") {
      fetchPublicJobs()
      fetchOrganizationData()
    }
  }, [status])

  const fetchOrganizationData = async () => {
    try {
      setOrgDataLoading(true)
      const response = await fetch('/api/organization')
      if (response.ok) {
        const data = await response.json()
        if (data && !data.error) {
          setOrgData({
            name: data.name || '',
            description: data.description || '',
            email: data.contactEmail || data.email || '',
            phone: data.contactPhone || data.phone || '',
            address: data.address || ''
          })
        }
      }
    } catch (error) {
      console.error('Error fetching organization data:', error)
    } finally {
      setOrgDataLoading(false)
    }
  }

  const fetchPublicJobs = async (filters?: {
    search: string
    department: string
    location: string
  }) => {
    try {
      // Only show loading skeleton if we don't have any jobs yet
      if (publicJobs.length === 0) {
        setPublicJobsLoading(true)
      }
      setPublicJobsError(null)

      const params = new URLSearchParams()
      if (filters?.search) params.set('search', filters.search)
      if (filters?.department && filters.department !== 'all') params.set('department', filters.department)
      if (filters?.location && filters.location !== 'all') params.set('location', filters.location)

      const response = await fetch(`/api/jobs/public?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setPublicJobs(data.jobs)
      } else {
        setPublicJobsError(data.error || "Failed to fetch jobs")
      }
    } catch (error) {
      console.error("Error fetching public jobs:", error)
      setPublicJobsError("Failed to fetch jobs. Please try again.")
    } finally {
      setPublicJobsLoading(false)
    }
  }

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
    // Show loader until organization data is loaded
    if (orgDataLoading) {
      return (
        <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
          {/* <Navbar /> */}
          <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        <Navbar />

        {/* Hero Section */}
        <div className="relative isolate overflow-hidden">
          {/* Background Patterns */}
          <div className="absolute inset-0 -z-10">
            {/* Gradient Blob */}
            <div className="absolute inset-x-0 -top-40 transform-gpu overflow-hidden blur-3xl sm:-top-80">
              <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary/30 to-purple-500/30 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
            </div>

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" style={{
              backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
              backgroundSize: '4rem 4rem'
            }} />

            {/* Animated Bubbles */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-10 left-10 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
              <div className="absolute top-20 right-10 w-72 h-72 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
              <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />
            </div>

            {/* Dot Pattern */}
            <div className="absolute right-0 top-0 -z-10 opacity-20 dark:opacity-10">
              <svg width="404" height="784" fill="none" viewBox="0 0 404 784" className="text-primary">
                <defs>
                  <pattern id="dot-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="2" fill="currentColor" />
                  </pattern>
                </defs>
                <rect width="404" height="784" fill="url(#dot-pattern)" />
              </svg>
            </div>
          </div>

          <div className="mx-auto h-screen max-w-7xl px-6   lg:flex lg:items-center lg:justify-center lg:px-8 lg:gap-x-10">
            <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0">

              <h1 className="mt-10 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                Recruitment <span className="text-primary">Elevated.</span>
                <br />
                Talent <span className="text-purple-600">Unleashed.</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Experience a recruitment platform built for the modern era. Connect with top-tier talent and world-class organizations through our intelligent matchmaking system.
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <Link href="/jobs">
                  <Button size="lg" className="h-12 px-8 text-lg shadow-lg hover:shadow-primary/25 transition-all">
                    Browse Positions
                  </Button>
                </Link>
                <Link href="/register" className="text-sm font-semibold leading-6 text-foreground hover:text-primary transition-colors">
                  Create Account <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            {/* Hero Image */}
            <div className="mx-auto mt-16 flex justify-center lg:justify-start sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:flex-none">
              <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl">
                <img
                  src="/banner.png"
                  alt="Recruitment Platform"
                  className="w-full h-auto rounded-2xl object-cover"
                />
              </div>
            </div>
          </div>


        </div>

        {/* Search & Jobs Listing Section */}
        <div className="bg-muted/30 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            {/* Search Section */}
            <div className="relative z-10 -mt-32 mb-12">
              <div className="rounded-xl bg-background shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10 p-2 md:p-4">
                <JobsLandingHero
                  onSearch={fetchPublicJobs}
                  totalJobs={publicJobs.length}
                  compact={true}
                />
              </div>
            </div>

            <div className="mx-auto max-w-2xl lg:mx-0">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Featured Opportunities</h2>
              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Discover roles that match your ambition.
              </p>
            </div>

            <div className="mx-auto mt-16 max-w-2xl lg:mx-0 lg:max-w-none">
              {publicJobsError && (
                <div className="mb-6 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <p className="text-sm text-destructive">{publicJobsError}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchPublicJobs()}
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </div>
              )}

              {publicJobsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-64 bg-card animate-pulse rounded-xl border border-border" />
                  ))}
                </div>
              ) : publicJobs.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {publicJobs.map((job) => (
                    <PublicJobCard key={job.id} job={job} />
                  ))}

                  <div className="mt-10 flex justify-center">
                    <Button onClick={() => fetchPublicJobs()} variant="secondary" size="lg">
                      Load More Positions
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 bg-card rounded-2xl border border-border shadow-sm">
                  <Briefcase className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No positions found
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    We couldn't find any jobs matching your current criteria. Try adjusting your filters.
                  </p>
                  <Button onClick={() => fetchPublicJobs()}>
                    Refresh Listings
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Premium CTA */}
        <div className="relative isolate px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-50" />
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to take the next step?
              <br />
              Join the elite today.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Unlock full access to premium listings, salary insights, and direct recruiter messaging. Your future starts here.
            </p>
            <div className="mt-10 flex items-center justify-center">
              <Link href="/register">
                <Button size="lg" className="px-8 bg-foreground text-background hover:bg-foreground/90">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
            {orgDataLoading ? (
              <div className="h-5 w-64 bg-muted animate-pulse rounded mx-auto" />
            ) : (
              <p className="text-sm text-center text-muted-foreground">
                © {new Date().getFullYear()} {orgData?.name || ''}. All rights reserved.
              </p>
            )}
          </div>
        </footer>
      </div>
    )
  }

  // Authenticated user dashboard
  const now = new Date()
  const filteredActiveJobs = jobs.filter(
    (job) => new Date(job.postTo) >= now && job.jobStatus === "ACTIVE",
  )
  const recentJobs = filteredActiveJobs.slice(0, 3)

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />

      {/* Dashboard Header */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Welcome back, <span className="text-primary">{session?.user?.name?.split(' ')[0] || "User"}</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Here is what's happening with your job applications today.
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Error loading dashboard</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              className="ml-auto"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-foreground">
                    {filteredActiveJobs.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Available positions
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
              <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                <FileCheck className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardLoading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-foreground">{stats.applications}</div>
                  <p className="text-xs text-muted-foreground mt-1">Your applications</p>
                </>
              )}
            </CardContent>
          </Card>



          <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardLoading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-foreground">{stats.successRate}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Application success</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Jobs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Recent Opportunities</h2>
                  <p className="text-sm text-muted-foreground">Jobs that match your profile</p>
                </div>
                <Link href="/jobs">
                  <Button variant="ghost" className="hover:bg-transparent hover:text-primary p-0 h-auto font-medium">
                    View All <span aria-hidden="true" className="ml-1">→</span>
                  </Button>
                </Link>
              </div>

              {jobsLoading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((i) => (
                    <JobCardSkeleton key={i} />
                  ))}
                </div>
              ) : recentJobs.length > 0 ? (
                <div className="grid gap-4">
                  {recentJobs.map((job: Job) => (
                    <Card key={job.id} className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 border-border/50">


                      <CardHeader>
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{job.title}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <span className="font-medium text-foreground/80">{job.company}</span>
                              {(job.city || (job.locations && job.locations.length > 0 && job.locations[0].city)) && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                  {job.city || job.locations![0].city}
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          <Badge variant={job.employmentType === 'FULL_TIME' ? 'default' : 'secondary'}>
                            {job.employmentType?.replace('_', ' ') || 'Part Time'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {job.shortDescription || job.description}
                        </p>
                        <div className="flex items-center gap-4 pt-2">
                          <Link href={`/jobs/${job.id}`} className="flex-1">
                            <Button className="w-full shadow-sm" size="sm">View Details</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                  <Briefcase className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <h3 className="text-lg font-medium">No jobs found</h3>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/jobs" className="block">
                  <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5 hover:text-primary hover:border-primary/20">
                    <Briefcase className="mr-2 h-4 w-4" />
                    Browse Jobs
                  </Button>
                </Link>
                <Link href="/candidate/profile" className="block">
                  <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5 hover:text-primary hover:border-primary/20">
                    <Users className="mr-2 h-4 w-4" />
                    Profile
                  </Button>
                </Link>
                <Link href="/applications" className="block">
                  <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5 hover:text-primary hover:border-primary/20">
                    <FileCheck className="mr-2 h-4 w-4" />
                    Applications
                  </Button>
                </Link>
              </CardContent>
            </Card>



            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {recentApplications.length > 0 ? (
                  <div className="space-y-4">
                    {recentApplications.slice(0, 4).map((app) => (
                      <div key={app.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                        <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${app.status === 'COMPLETED' ? 'bg-green-500' :
                          app.status === 'REJECTED' ? 'bg-red-500' : 'bg-blue-500'
                          }`} />
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium leading-none">
                            Applied for {app.jobTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {app.jobCompany} • {new Date(app.appliedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No recent activity
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
