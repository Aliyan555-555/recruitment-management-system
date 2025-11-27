"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { JobApplicationSuccess } from "@/components/JobApplicationSuccess"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface JobDetails {
  id: string
  title: string
  company: string
  jobType: string
  employmentType?: string
}

interface ApplicationDetails {
  id: string
  appliedAt: string
  steps: Array<{
    id: string
    title: string
    description: string
    timeline?: string
  }>
  supportContacts?: {
    recruiterName?: string
    email?: string
    phone?: string
    responseTime?: string
  }
  quickActions?: Array<{
    id: string
    label: string
    action: "login" | "jobs" | "jobDetails" | "custom"
    href?: string
    variant?: "default" | "secondary" | "outline" | "ghost"
    icon?: "track" | "browse" | "details"
  }>
  tips?: string[]
}

export default function JobApplicationSuccessPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params?.id as string
  
  const [job, setJob] = useState<JobDetails | null>(null)
  const [application, setApplication] = useState<ApplicationDetails | null>(null)
  const [candidateName, setCandidateName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch job details from public API
        const jobResponse = await fetch(`/api/jobs/public/${jobId}`)
        if (jobResponse.ok) {
          const jobData = await jobResponse.json()
          const jobDetails = jobData.job

          if (!jobDetails) {
            setError("Job not found")
            return
          }

          setJob({
            id: jobDetails.id,
            title: jobDetails.title,
            company: jobDetails.company,
            jobType: jobDetails.jobType,
            employmentType: jobDetails.employmentType
          })

          const timelineSteps = jobDetails.workflowSteps?.map((step: any) => ({
            id: step.id,
            title: step.title,
            description: step.description,
            timeline: step.timeline
          })) || []

          const tips: string[] = []
          if (jobDetails.employmentType) {
            tips.push(`Highlight your availability for ${jobDetails.employmentType?.toLowerCase()} roles.`)
          }
          if (jobDetails.skills?.length) {
            tips.push(`Call out experience with: ${jobDetails.skills.slice(0, 3).join(", ")}.`)
          }
          if (!tips.length) {
            tips.push("Review the job description carefully before interviews.")
          }

          setApplication({
            id: `APP-${Date.now()}`,
            appliedAt: new Date().toISOString(),
            steps: timelineSteps,
            supportContacts: {
              recruiterName: `${jobDetails.company} Talent Team`,
              email: `careers@${jobDetails.company?.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
              phone: "+92 (21) 111-010-010",
              responseTime: "We typically respond within 2-3 business days."
            },
            quickActions: [
              {
                id: "login",
                label: "Sign In to Track Status",
                action: "login",
                icon: "track"
              },
              {
                id: "browse",
                label: "Browse More Jobs",
                action: "jobs",
                variant: "outline",
                icon: "browse"
              },
              {
                id: "details",
                label: "View Job Details",
                action: "jobDetails",
                variant: "ghost",
                icon: "details"
              }
            ],
            tips
          })
        } else {
          setError("Failed to load job details")
          return
        }
        
        setCandidateName("New Candidate")

      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load application details")
      } finally {
        setLoading(false)
      }
    }

    if (jobId) {
      fetchData()
    } else {
      setError("Invalid job ID")
      setLoading(false)
    }
  }, [jobId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading application details...</p>
        </div>
      </div>
    )
  }

  if (error || !job || !application) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || "Failed to load application details"}</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Button onClick={() => router.push("/")}>
              Return to Home
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <JobApplicationSuccess
      job={job}
      application={application}
      candidateName={candidateName}
      nextSteps={application.steps}
      supportContacts={application.supportContacts}
      quickActions={application.quickActions}
      tips={application.tips}
    />
  )
}
