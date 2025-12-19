"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

interface Experience {
  id: string
  jobTitle: string
  company: string | null
  location: string | null
  startDate: string | null
  endDate: string | null
  isCurrent: boolean
}

interface Education {
  id: string
  educationLevel: string
  degreeTitle: string
  institute: string | null
  instituteName?: string
  majorSubject: string | null
  grade: string | null
  passingYear: string | null
  country: string | null
}

interface Skill {
  id: string
  skillName: string
  level: number
}

interface ProfileDetails {
  title: string | null
  fatherName: string | null
  religion: string | null
  nationality: string | null
  dateOfBirth: string | null
  cnic: string | null
  gender: string | null
  maritalStatus: string | null
  preferredCity: string | null
  postalCode: string | null
  professionalGrade: string | null
  linkedinUrl: string | null
  portfolioUrl: string | null
  githubUrl: string | null
  websiteUrl: string | null
  bio: string | null
  availability: string | null
  expectedSalary: string | null
  noticePeriod: string | null
  languages: string | null
  certifications: string | null
  achievements: string | null
  references: string | null
}

interface JobPreference {
  firstPriority: string | null
  secondPriority: string | null
  thirdPriority: string | null
  summary: string | null
}

interface PipelineData {
  id: string
  candidate: {
    id: string
    name: string
    firstname: string
    lastname: string
    email: string
    phone: string | null
    phone2: string | null
    address: string | null
    city: string | null
    country: string | null
    location: string
    institution: string | null
    department: string | null
    experiences: Experience[]
    educations: Education[]
    skills: Skill[]
    profileDetails: ProfileDetails | null
    jobPreference: JobPreference | null
  }
  job: {
    id: string
    title: string
    company: string
    description: string | null
    industry: string | null
    employmentType: string
    minimumExperience: string | null
    minimumSalary: string | null
  }
  application: {
    status: string
    appliedAt: string
  }
  status: string
  currentStep: number
  startedAt: string
  completedAt?: string
  steps: Array<{
    id: string
    stepName: string
    stepOrder: number
    status: string
    isRequired: boolean
    isSkippable: boolean
    interviewer: { name: string; email: string } | null
    feedback: string | null
    startedAt?: string
    completedAt?: string
    interviews: Array<{
      interviewerName: string
      feedback: string | null
      rating: number | null
      recommendation: string | null
      submittedAt: string | null
    }>
  }>
}

export default function CandidatePipelineDetailPage() {
  const params = useParams()
  const [pipeline, setPipeline] = useState<PipelineData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPipeline() {
      try {
        const res = await fetch(`/api/admin/pipelines/${params.id}`)
        const data = await res.json()
        setPipeline(data.pipeline)
      } catch (error) {
        console.error("Error fetching pipeline:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPipeline()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-card rounded-xl shadow-lg border border-border p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground font-medium">Loading candidate details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!pipeline) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-card rounded-xl shadow-lg border border-border p-12 text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-semibold text-foreground mb-2">Pipeline not found</h3>
            <Link href="/admin/candidates" className="text-blue-600 dark:text-blue-400 hover:underline">
              ← Back to Candidates
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-muted text-muted-foreground"
      case "IN_PROGRESS":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300"
      case "COMPLETED":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300"
      case "SKIPPED":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300"
      case "REJECTED":
        return "bg-destructive/10 text-destructive"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getSkillLevel = (level: number) => {
    const levels = ["Beginner", "Elementary", "Intermediate", "Advanced", "Expert"]
    return levels[level - 1] || "Unknown"
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/candidates"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Candidates
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {pipeline.candidate.name}
              </h1>
              <p className="text-muted-foreground">Candidate Profile & Pipeline Details</p>
            </div>
            <span className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(pipeline.status)}`}>
              {pipeline.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Candidate Information */}
          <div className="lg:col-span-1 space-y-6">
            {/* Basic Info */}
            <div className="bg-card rounded-xl shadow-lg border border-border p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">Contact Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                  <p className="mt-1 text-sm text-foreground">{pipeline.candidate.email}</p>
                </div>
                {pipeline.candidate.phone && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</label>
                    <p className="mt-1 text-sm text-foreground">{pipeline.candidate.phone}</p>
                  </div>
                )}
                {pipeline.candidate.phone2 && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone 2</label>
                    <p className="mt-1 text-sm text-foreground">{pipeline.candidate.phone2}</p>
                  </div>
                )}
                {pipeline.candidate.address && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</label>
                    <p className="mt-1 text-sm text-foreground">{pipeline.candidate.address}</p>
                  </div>
                )}
                {pipeline.candidate.location && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</label>
                    <p className="mt-1 text-sm text-foreground">{pipeline.candidate.location}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Details */}
            {pipeline.candidate.profileDetails && (
              <div className="bg-card rounded-xl shadow-lg border border-border p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Personal Details</h3>
                </div>
                <div className="space-y-4">
                  {pipeline.candidate.profileDetails.dateOfBirth && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date of Birth</label>
                      <p className="mt-1 text-sm text-foreground">{pipeline.candidate.profileDetails.dateOfBirth}</p>
                    </div>
                  )}
                  {pipeline.candidate.profileDetails.gender && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gender</label>
                      <p className="mt-1 text-sm text-foreground">{pipeline.candidate.profileDetails.gender}</p>
                    </div>
                  )}
                  {pipeline.candidate.profileDetails.nationality && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nationality</label>
                      <p className="mt-1 text-sm text-foreground">{pipeline.candidate.profileDetails.nationality}</p>
                    </div>
                  )}
                  {pipeline.candidate.profileDetails.cnic && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CNIC</label>
                      <p className="mt-1 text-sm text-foreground">{pipeline.candidate.profileDetails.cnic}</p>
                    </div>
                  )}
                  {pipeline.candidate.profileDetails.maritalStatus && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Marital Status</label>
                      <p className="mt-1 text-sm text-foreground">{pipeline.candidate.profileDetails.maritalStatus}</p>
                    </div>
                  )}
                  {pipeline.candidate.profileDetails.professionalGrade && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Professional Grade</label>
                      <p className="mt-1 text-sm text-foreground">{pipeline.candidate.profileDetails.professionalGrade}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Social Links */}
            {pipeline.candidate.profileDetails && (
              pipeline.candidate.profileDetails.linkedinUrl ||
              pipeline.candidate.profileDetails.portfolioUrl ||
              pipeline.candidate.profileDetails.githubUrl ||
              pipeline.candidate.profileDetails.websiteUrl
            ) && (
                <div className="bg-card rounded-xl shadow-lg border border-border p-6">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Social Links</h3>
                  </div>
                  <div className="space-y-3">
                    {pipeline.candidate.profileDetails.linkedinUrl && (
                      <a href={pipeline.candidate.profileDetails.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                        </svg>
                        LinkedIn Profile
                      </a>
                    )}
                    {pipeline.candidate.profileDetails.githubUrl && (
                      <a href={pipeline.candidate.profileDetails.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        GitHub Profile
                      </a>
                    )}
                    {pipeline.candidate.profileDetails.portfolioUrl && (
                      <a href={pipeline.candidate.profileDetails.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Portfolio
                      </a>
                    )}
                    {pipeline.candidate.profileDetails.websiteUrl && (
                      <a href={pipeline.candidate.profileDetails.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:text-green-300 text-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        Website
                      </a>
                    )}
                  </div>
                </div>
              )}

            {/* Career Preferences */}
            {pipeline.candidate.profileDetails && (
              pipeline.candidate.profileDetails.expectedSalary ||
              pipeline.candidate.profileDetails.noticePeriod ||
              pipeline.candidate.profileDetails.availability
            ) && (
                <div className="bg-card rounded-xl shadow-lg border border-border p-6">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Career Preferences</h3>
                  </div>
                  <div className="space-y-4">
                    {pipeline.candidate.profileDetails.expectedSalary && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expected Salary</label>
                        <p className="mt-1 text-sm text-foreground">{pipeline.candidate.profileDetails.expectedSalary}</p>
                      </div>
                    )}
                    {pipeline.candidate.profileDetails.noticePeriod && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notice Period</label>
                        <p className="mt-1 text-sm text-foreground">{pipeline.candidate.profileDetails.noticePeriod}</p>
                      </div>
                    )}
                    {pipeline.candidate.profileDetails.availability && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Availability</label>
                        <p className="mt-1 text-sm text-foreground">{pipeline.candidate.profileDetails.availability}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>

          {/* Right Column - Professional Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Application Info */}
            <div className="bg-card rounded-xl shadow-lg border border-border p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">Job Application</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Position</label>
                  <p className="mt-1 text-sm font-semibold text-foreground">{pipeline.job.title}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</label>
                  <p className="mt-1 text-sm text-foreground">{pipeline.job.company}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Applied On</label>
                  <p className="mt-1 text-sm text-foreground">
                    {new Date(Number(pipeline.application.appliedAt) * 1000).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Bio */}
            {pipeline.candidate.profileDetails?.bio && (
              <div className="bg-card rounded-xl shadow-lg border border-border p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Professional Summary</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{pipeline.candidate.profileDetails.bio}</p>
              </div>
            )}

            {/* Experience */}
            {pipeline.candidate.experiences.length > 0 && (
              <div className="bg-card rounded-xl shadow-lg border border-border p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Work Experience</h3>
                </div>
                <div className="space-y-4">
                  {pipeline.candidate.experiences.map((exp) => (
                    <div key={exp.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <h4 className="font-semibold text-foreground">{exp.jobTitle}</h4>
                      {exp.company && <p className="text-sm text-muted-foreground mt-1">{exp.company}</p>}
                      {exp.location && <p className="text-sm text-muted-foreground mt-1">{exp.location}</p>}
                      <p className="text-xs text-muted-foreground mt-2">
                        {exp.startDate || 'N/A'} - {exp.isCurrent ? 'Present' : (exp.endDate || 'N/A')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {pipeline.candidate.educations.length > 0 && (
              <div className="bg-card rounded-xl shadow-lg border border-border p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Education</h3>
                </div>
                <div className="space-y-4">
                  {pipeline.candidate.educations.map((edu) => (
                    <div key={edu.id} className="border-l-4 border-purple-500 pl-4 py-2">
                      <h4 className="font-semibold text-foreground">{edu.degreeTitle}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{edu.educationLevel}</p>
                      {(edu.institute || edu.instituteName) && (
                        <p className="text-sm text-muted-foreground mt-1">{edu.instituteName || edu.institute}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {edu.majorSubject && <span>Major: {edu.majorSubject}</span>}
                        {edu.grade && <span>Grade: {edu.grade}</span>}
                        {edu.passingYear && <span>Year: {edu.passingYear}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {pipeline.candidate.skills.length > 0 && (
              <div className="bg-card rounded-xl shadow-lg border border-border p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Skills & Expertise</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pipeline.candidate.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/10 text-green-800 dark:text-green-300 rounded-full text-sm font-medium border border-green-200 dark:border-green-800"
                    >
                      {skill.skillName}
                      <span className="text-xs bg-green-200 dark:bg-green-800 px-2 py-0.5 rounded-full">
                        {getSkillLevel(skill.level)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Job Preferences */}
            {pipeline.candidate.jobPreference && (
              <div className="bg-card rounded-xl shadow-lg border border-border p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Job Preferences</h3>
                </div>
                <div className="space-y-4">
                  {pipeline.candidate.jobPreference.firstPriority && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">1st Priority</label>
                      <p className="mt-1 text-sm text-foreground">{pipeline.candidate.jobPreference.firstPriority}</p>
                    </div>
                  )}
                  {pipeline.candidate.jobPreference.secondPriority && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">2nd Priority</label>
                      <p className="mt-1 text-sm text-foreground">{pipeline.candidate.jobPreference.secondPriority}</p>
                    </div>
                  )}
                  {pipeline.candidate.jobPreference.thirdPriority && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">3rd Priority</label>
                      <p className="mt-1 text-sm text-foreground">{pipeline.candidate.jobPreference.thirdPriority}</p>
                    </div>
                  )}
                  {pipeline.candidate.jobPreference.summary && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Summary</label>
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{pipeline.candidate.jobPreference.summary}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pipeline Steps */}
            <div className="bg-card rounded-xl shadow-lg border border-border p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">Pipeline Steps</h3>
              </div>
              <div className="space-y-4">
                {pipeline.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">{step.stepName}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Step {step.stepOrder} {step.isRequired ? "• Required" : "• Optional"}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(step.status)}`}>
                        {step.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {step.interviewer && (
                      <div className="mb-2 text-sm">
                        <span className="text-muted-foreground">Interviewer:</span>{" "}
                        <span className="font-medium text-foreground">{step.interviewer.name}</span>
                        <span className="text-muted-foreground"> ({step.interviewer.email})</span>
                      </div>
                    )}

                    {step.interviews.length > 0 && (
                      <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                        <h5 className="text-sm font-semibold text-foreground mb-2">Interview Feedback</h5>
                        {step.interviews.map((interview, idx) => (
                          <div key={idx} className="space-y-1 text-sm">
                            {interview.rating && (
                              <p className="text-muted-foreground">
                                <span className="font-medium">Rating:</span> {interview.rating}/5
                              </p>
                            )}
                            {interview.recommendation && (
                              <p className="text-muted-foreground">
                                <span className="font-medium">Recommendation:</span> {interview.recommendation}
                              </p>
                            )}
                            {interview.feedback && (
                              <p className="text-muted-foreground whitespace-pre-wrap mt-2">
                                <span className="font-medium">Feedback:</span><br />
                                {interview.feedback}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
