"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import DOMPurify from "isomorphic-dompurify"

interface JobDetails {
  id: string
  title: string
  company: string
  description: string
  postFrom: string
  postTo: string
  status: boolean
  jobType?: "NORMAL" | "BULK"
  jobStatus?: "ACTIVE" | "ADMIN_SHORTLISTING" | "CLOSED"
  city?: string
  country?: string
  locations?: Array<{ city: string; country: string }>
  employmentType: string
  minimumExperience?: string
  minimumSalary?: string
  skills: Array<{ skillName: string }>
  workflow: {
    steps: Array<{
      id: string
      stepName: string
      stepOrder: number
      isRequired: boolean
      isSkippable: boolean
      interviewer: {
        id: string
        firstname: string
        lastname: string
        email: string
      } | null
    }>
  } | null
  _count: {
    applications: number
  }
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [job, setJob] = useState<JobDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchJob() {
      try {
        const res = await fetch(`/api/admin/jobs/${params.id}`)
        if (res.status === 404) {
          router.replace("/admin/jobs")
          return
        }
        if (res.ok) {
          const data = await res.json()
          setJob(data.job)
        }
      } catch (error) {
        console.error("Error fetching job:", error)
        router.replace("/admin/jobs")
      } finally {
        setLoading(false)
      }
    }

    fetchJob()
  }, [params.id, router])

  if (loading) {
    return <div>Loading job details...</div>
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h2>
          <p className="text-gray-600 mb-6">
            The job you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/admin/jobs"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-block"
          >
            ← Back to Jobs List
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/jobs"
          className="text-primary hover:underline mb-2 inline-block"
        >
          ← Back to Jobs
        </Link>
        <h2 className="text-2xl font-bold text-foreground">{job.title}</h2>
      </div>

      {/* Job Details */}
      <div className="bg-card rounded-lg shadow p-6 mb-6 border border-border">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-foreground">Job Information</h3>
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full ${job.status
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
          >
            {job.status ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground">Company</label>
            <p className="font-medium text-foreground">{job.company}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Employment Type</label>
            <p className="font-medium text-foreground">{job.employmentType}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Posting Period</label>
            <p className="font-medium text-foreground">
              {new Date(job.postFrom).toLocaleDateString()} - {new Date(job.postTo).toLocaleDateString()}
            </p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Total Applications</label>
            <p className="font-medium text-foreground">{job._count.applications}</p>
          </div>
          {job.minimumExperience && (
            <div>
              <label className="text-sm text-muted-foreground">Experience Required</label>
              <p className="font-medium text-foreground">{job.minimumExperience}</p>
            </div>
          )}
          {job.minimumSalary && (
            <div>
              <label className="text-sm text-muted-foreground">Salary Range</label>
              <p className="font-medium text-foreground">{job.minimumSalary}</p>
            </div>
          )}
          {job.locations && job.locations.length > 0 ? (
            <div>
              <label className="text-sm text-muted-foreground">Locations</label>
              <p className="font-medium text-foreground">
                {job.locations.map(loc => `${loc.city}, ${loc.country}`).join(' | ')}
              </p>
            </div>
          ) : job.city && job.country ? (
            <div>
              <label className="text-sm text-muted-foreground">Location</label>
              <p className="font-medium text-foreground">
                {job.city}, {job.country}
              </p>
            </div>
          ) : null}
        </div>

        {job.description && (
          <div className="prose-lg mt-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.description) }}></div>
        )}

        {job.skills.length > 0 && (
          <div className="mt-4">
            <label className="text-sm text-muted-foreground block mb-2">Required Skills</label>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                >
                  {skill.skillName}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Workflow */}
      {job.workflow && (
        <div className="bg-card rounded-lg shadow p-6 mb-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Interview Workflow ({job.workflow.steps.length} steps)
          </h3>
          <div className="space-y-3">
            {job.workflow.steps.map((step) => (
              <div
                key={step.id}
                className="border border-border rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-foreground">
                      Step {step.stepOrder}: {step.stepName}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {step.isRequired ? "Required" : "Optional"}
                      {step.isSkippable && " • Skippable"}
                    </p>
                    {step.interviewer && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Assigned to: {step.interviewer.firstname} {step.interviewer.lastname}
                        <span className="text-muted-foreground/80"> ({step.interviewer.email})</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href={`/admin/candidates?jobId=${job.id}`}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          View Candidates ({job._count.applications})
        </Link>
        <Link
          href={`/admin/jobs/${job.id}/ai-shortlist`}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-colors"
        >
          ✨ Run AI Shortlisting
        </Link>
      </div>
    </div>
  )
}

