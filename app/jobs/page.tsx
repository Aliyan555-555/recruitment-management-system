"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Navbar } from "@/components/Navbar"
import { JobsList } from "@/components/JobsList"
import { useJobsStore, type Job } from "@/store/useJobsStore"
import { JobsLandingHero } from "@/components/JobsLandingHero"

export default function JobsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { jobs, loading, error, fetchJobs } = useJobsStore()

  useEffect(() => {
    // Redirect if not authenticated
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    // Fetch jobs when authenticated
    if (status === "authenticated") {
      fetchJobs()
    }
  }, [status, router, fetchJobs])

  const now = new Date()
  const filteredActiveJobs = jobs.filter(
    (job) => new Date(job.postTo) >= now && job.jobStatus === "ACTIVE",
  )

  const handleSearch = (filters: { search: string, department: string, location: string }) => {
    fetchJobs(filters)
  }

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Browse Jobs</h1>
            <p className="text-muted-foreground mt-2">
              Find your next career opportunity
            </p>
          </div>
          <JobsList jobs={[]} loading={true} />
        </main>
      </div>
    )
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Browse Jobs</h1>
            <p className="text-muted-foreground mt-2">
              Find your next career opportunity
            </p>
          </div>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Error Loading Jobs
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => fetchJobs()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <JobsLandingHero
            onSearch={handleSearch}
            totalJobs={filteredActiveJobs.length}
            compact={false}
          />
        </div>

        <JobsList jobs={filteredActiveJobs} loading={loading} />
      </main>
    </div>
  )
}
