"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Navbar } from "@/components/Navbar"
import { JobDetails } from "@/components/JobDetails"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MandatoryAssessmentRedirect } from "@/components/candidate/useMandatoryAssessmentRedirect"

interface JobLocation {
  city: string
  country: string | null
}

interface Job {
  id: string
  title: string
  company: string
  shortDescription: string
  description: string
  city?: string
  country?: string
  locations?: JobLocation[]
  employmentType: string
  employmentShift: string | null
  minimumExperience: string | null
  certification?: string
  minimumSalary?: string
  benefits?: string
  totalPositions?: number
  jobCode?: string
  postFrom: string
  postTo: string
  skills: string[]
  minimumEducation?: string
  createdBy: string
  creatorEmail: string
}

interface Application {
  id: string
  status: string
  appliedAt: string
  pipelineId?: string | null
}

export default function JobDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const [job, setJob] = useState<Job | null>(null)
  const [hasApplied, setHasApplied] = useState(false)
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      if (status === "unauthenticated") {
        // For unauthenticated users, fetch job details from public API
        fetchPublicJobDetails()
      } else if (status === "authenticated") {
        // For authenticated users, use the existing flow
        fetchJobDetails()
      }
    }
  }, [status, router, params.id])

  const fetchJobDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/jobs/${params.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          router.push("/jobs")
          return
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || `Failed to fetch job: ${response.statusText}`
        )
      }

      const data = await response.json()
      setJob(data.job)
      setHasApplied(data.hasApplied)
      setApplication(data.application)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch job details"
      console.error("Error fetching job:", err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchPublicJobDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/jobs/public`)
      if (!response.ok) {
        throw new Error("Failed to fetch job details")
      }

      const data = await response.json()
      const jobData = data.jobs?.find((j: any) => j.id === params.id)

      if (!jobData) {
        router.push("/")
        return
      }

      // Transform public job data to match expected format
      setJob({
        id: jobData.id,
        title: jobData.title,
        company: jobData.company,
        shortDescription: jobData.shortDescription,
        description: jobData.description,
        locations: jobData.locations,
        employmentType: jobData.employmentType,
        employmentShift: jobData.employmentShift,
        minimumExperience: jobData.minimumExperience,
        minimumSalary: jobData.minimumSalary,
        benefits: jobData.benefits,
        totalPositions: jobData.totalPositions,
        postFrom: jobData.postFrom,
        postTo: jobData.postTo,
        skills: jobData.skills,
        createdBy: "",
        creatorEmail: ""
      })

    } catch (error) {
      console.error("Error fetching public job details:", error)
      setError((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while checking authentication
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Error Loading Job
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={fetchJobDetails} variant="outline">
                Try Again
              </Button>
              <Button onClick={() => router.push("/jobs")} variant="outline">
                Back to Jobs
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!job) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <MandatoryAssessmentRedirect />
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <JobDetails
          job={{
            ...job,
            postFrom: new Date(job.postFrom),
            postTo: new Date(job.postTo),
          }}
          hasApplied={hasApplied}
          application={application}
          isPublic={status === "unauthenticated"}
        />
      </main>
    </div>
  )
}
