"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/Navbar"
interface Application {
  id: string
  jobTitle: string
  jobCompany: string
  appliedAt: number
  status: string
  pipeline?: {
    id: string
    currentStep: number
    totalSteps: number
    completedSteps: number
    progressPercent?: number
    overallStatus: string
    steps: Array<{
      stepName: string
      stepOrder: number
      status: string
    }>
  }
}

export default function ApplicationsPage() {
  const { data: session, status } = useSession()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "authenticated") {
      fetchApplications()
    }
  }, [status])

  async function fetchApplications() {
    try {
      const res = await fetch("/api/applications")
      if (res.ok) {
        const data = await res.json()
        setApplications(data.applications || [])
      }
    } catch (error) {
      console.error("Error fetching applications:", error)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    redirect("/login")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      case "COMPLETED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      case "REJECTED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
      case "ON_HOLD":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
      case "SUBMITTED":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500"
      case "IN_PROGRESS":
        return "bg-blue-500"
      case "PENDING":
        return "bg-gray-300"
      case "SKIPPED":
        return "bg-yellow-500"
      case "REJECTED":
        return "bg-red-500"
      default:
        return "bg-gray-300"
    }
  }

  const getPipelineProgress = (pipeline: NonNullable<Application["pipeline"]>) => {
    if (typeof pipeline.progressPercent === "number") {
      return Math.min(100, Math.max(0, Math.round(pipeline.progressPercent)))
    }

    const totalSteps = pipeline.totalSteps || pipeline.steps.length
    if (!totalSteps) {
      return pipeline.overallStatus === "COMPLETED" ? 100 : 0
    }

    const completed = pipeline.completedSteps ?? pipeline.steps.filter(step => step.status === "COMPLETED").length

    return Math.min(100, Math.max(0, Math.round((completed / totalSteps) * 100)))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Applications</h1>
              <p className="text-muted-foreground mt-1">Track the status of your job applications</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg shadow-sm border border-border">
              <span className="text-muted-foreground font-medium">Total:</span>
              <span className="text-foreground font-bold">{applications.length}</span>
            </div>
          </div>
        </div>

        {applications.length === 0 ? (
          <div className="bg-card rounded-xl shadow-lg border border-border p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">No applications yet</p>
            <p className="text-muted-foreground mb-6">Start applying to jobs to track your progress here.</p>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Available Jobs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {applications.map((application) => (
              <div key={application.id} className="bg-card rounded-xl shadow-lg border border-border overflow-hidden transition-all duration-200 hover:shadow-xl">
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-foreground mb-1">
                            {application.jobTitle}
                          </h3>
                          <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="font-medium">{application.jobCompany}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Applied: {new Date(application.appliedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-4 py-2 text-sm font-bold rounded-lg shadow-sm ${getStatusColor(
                        application.pipeline?.overallStatus || application.status
                      )}`}
                    >
                      {(application.pipeline?.overallStatus || application.status).replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Pipeline Progress */}
                {application?.pipeline && (
                  <div className="p-6 bg-muted/30">
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span className="text-sm font-semibold text-foreground">Application Progress</span>
                        </div>
                        <span className="text-sm font-bold text-blue-600">
                          Step {Math.min(application.pipeline.currentStep, Math.max(application.pipeline.totalSteps, 1))} of {application.pipeline.totalSteps || application.pipeline.steps.length || 1}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden shadow-inner">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 shadow-md flex items-center justify-end pr-2"
                          style={{
                            width: `${getPipelineProgress(application.pipeline)}%`,
                          }}
                        >
                          <span className="text-xs text-white font-bold">
                            {getPipelineProgress(application.pipeline)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-3">
                      {application.pipeline.steps.map((step, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 bg-card rounded-lg border border-border hover:border-primary hover:shadow-sm transition-all">
                          <div className="flex-shrink-0 relative">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all ${getStepStatusColor(step.status)
                                }`}
                            >
                              {step.status === "COMPLETED" ? (
                                <svg
                                  className="w-5 h-5 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : step.status === "IN_PROGRESS" ? (
                                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                              ) : step.status === "PENDING" ? (
                                <span className="text-white text-sm font-bold">
                                  {step.stepOrder}
                                </span>
                              ) : step.status === "REJECTED" ? (
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              ) : (
                                <span className="text-white text-sm font-medium">
                                  {step.stepOrder}
                                </span>
                              )}
                            </div>
                            {index < (application?.pipeline?.steps?.length || 0) - 1 && (
                              <div className={`absolute left-1/2 transform -translate-x-1/2 w-0.5 h-8 -bottom-8 ${step.status === "COMPLETED" ? "bg-green-400" : "bg-gray-200"
                                }`}></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground mb-1">
                              {step.stepName}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${step.status === "COMPLETED" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" :
                                  step.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" :
                                    step.status === "REJECTED" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" :
                                      step.status === "SKIPPED" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" :
                                        "bg-muted text-muted-foreground"
                                }`}>
                                {step.status.replace(/_/g, " ")}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-border">
                      <Link
                        href={`/applications/${application.pipeline.id}`}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                      >
                        <span>View Detailed Progress</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                )}

                {/* No Pipeline Yet */}
                {!application.pipeline && (
                  <div className="p-6 bg-primary/5 rounded-lg border border-primary/20 mx-6 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">Application Under Review</p>
                        <p className="text-sm text-muted-foreground">
                          Your application is being reviewed. You&apos;ll see progress updates here once the review process begins.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

