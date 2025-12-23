"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MapPin,
  Calendar,
  DollarSign,
  Briefcase,
  BookOpen,
  Award,
  CheckCircle2,
  Users,
  X,
  AlertCircle,
  Building2,
  Clock,
  GraduationCap,
  Globe,
  Share2,
  Bookmark
} from "lucide-react"
import { useRouter } from "next/navigation"

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
  postFrom: Date
  postTo: Date
  skills: string[]
  minimumEducation?: string
  createdBy: string
  creatorEmail: string
}

interface Application {
  id: string
  status: string
  appliedAt: string
}

export function JobDetails({
  job,
  hasApplied = false,
  application = null,
  isPublic = false
}: {
  job: Job
  hasApplied?: boolean
  application?: Application | null
  isPublic?: boolean
}) {
  const router = useRouter()
  const [applying, setApplying] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleApply = async () => {
    if (isPublic) {
      router.push(`/register?jobId=${job.id}`)
      return
    }

    setApplying(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/jobs/${job.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      })

      if (response.ok) {
        router.push(`/jobs/${job.id}/apply/success`)
      } else {
        const data = await response.json()
        setErrorMessage(data.error || "Failed to apply. Please try again.")
      }
    } catch (error) {
      console.error("Apply error:", error)
      setErrorMessage("Failed to submit application. Please check your connection and try again.")
    } finally {
      setApplying(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="relative bg-card rounded-2xl p-8 shadow-sm border border-border overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-[0.02]">
          <Briefcase className="w-64 h-64 text-foreground" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 transition-colors">
                  {job.employmentType}
                </Badge>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                  {job.title}
                </h1>
                <div className="flex items-center gap-2 text-lg text-muted-foreground font-medium">
                  <Building2 className="h-5 w-5" />
                  {job.company}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {job.locations && job.locations.length > 0 ? (
                  job.locations.map((loc, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {loc.city}, {loc.country}
                    </div>
                  ))
                ) : job.city && job.country ? (
                  <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {job.city}, {job.country}
                  </div>
                ) : null}

                <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Posted {formatDate(job.postFrom)}
                </div>

                {job.minimumSalary && (
                  <div className="flex items-center gap-1.5 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 px-3 py-1.5 rounded-full font-medium">
                    <DollarSign className="h-4 w-4" />
                    {job.minimumSalary}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" size="icon" className="rounded-full">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full">
                <Bookmark className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Status Notifications */}
          {hasApplied && application && (
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-900/20 shadow-none">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900 dark:text-green-300">Application Submitted</h3>
                    <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                      Applied on {formatDate(new Date(application.appliedAt))} • Status: <span className="font-medium">{application.status}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {errorMessage && (
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/20 shadow-none animate-in slide-in-from-top-2">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 dark:text-red-300">Application Error</h3>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">{errorMessage}</p>
                  </div>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Job Description */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              About the Role
            </h2>
            <Card className="border-border shadow-sm">
              <CardContent className="pt-6">
                {job.description ? (
                  <div
                    className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary"
                    dangerouslySetInnerHTML={{ __html: job.description }}
                  />
                ) : (
                  <p className="text-muted-foreground italic">No description provided</p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Requirements & Qualifications */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Requirements
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {job.minimumEducation && (
                <Card className="bg-muted/50 border-border shadow-none">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-card rounded-lg border border-border">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Education</p>
                        <p className="font-semibold text-foreground mt-0.5">{job.minimumEducation}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {job.minimumExperience && (
                <Card className="bg-muted/50 border-border shadow-none">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-card rounded-lg border border-border">
                        <Briefcase className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Experience</p>
                        <p className="font-semibold text-foreground mt-0.5">{job.minimumExperience}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {job.certification && (
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    Required Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{job.certification}</p>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Benefits */}
          {job.benefits && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Benefits & Perks
              </h2>
              <Card className="border-border shadow-sm bg-gradient-to-br from-card to-blue-50/10 dark:to-blue-900/10">
                <CardContent className="pt-6">
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{job.benefits}</p>
                </CardContent>
              </Card>
            </section>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Apply Card - Sticky on Desktop */}
          <div className="sticky top-24 space-y-6">
            {!hasApplied && new Date(job.postTo) >= new Date() ? (
              <Card className="border-blue-100 dark:border-blue-900 bg-card shadow-lg shadow-blue-900/5 overflow-hidden">
                <div className="h-2 bg-primary w-full" />
                <CardHeader>
                  <CardTitle>Ready to Apply?</CardTitle>
                  <CardDescription>
                    Submit your application before {formatDate(job.postTo)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={handleApply}
                    disabled={applying}
                    className="w-full h-12 text-base font-semibold shadow-blue-200 hover:shadow-blue-300 transition-all"
                  >
                    {applying ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </div>
                    ) : (
                      "Apply Now"
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    By applying, you agree to share your profile information with {job.company}.
                  </p>
                </CardContent>
              </Card>
            ) : hasApplied ? (
              <Card className="bg-muted/50 border-border">
                <CardContent className="pt-6 text-center space-y-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Already Applied</h3>
                    <p className="text-sm text-muted-foreground">
                      You have already submitted an application for this position.
                    </p>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => router.push('/jobs')}>
                    Browse Other Jobs
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-muted/50 border-border">
                <CardContent className="pt-6 text-center">
                  <p className="font-medium text-foreground">Applications Closed</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This position is no longer accepting new applications.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Job Overview */}
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Job Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border last:border-0 last:pb-0">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Posted
                  </span>
                  <span className="text-sm font-medium text-foreground">{formatDate(job.postFrom)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border last:border-0 last:pb-0">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Shift
                  </span>
                  <span className="text-sm font-medium text-foreground">{job.employmentShift || "Standard"}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border last:border-0 last:pb-0">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" /> Vacancies
                  </span>
                  <span className="text-sm font-medium text-foreground">{job.totalPositions || "Not specified"}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border last:border-0 last:pb-0">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Location
                  </span>
                  <span className="text-sm font-medium text-foreground text-right">
                    {job.locations?.[0]?.city || job.city || "Remote"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Required Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {job.skills.length > 0 ? (
                    job.skills.map((skill, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="bg-muted text-foreground hover:bg-muted/80 transition-colors px-3 py-1"
                      >
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No specific skills listed</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
