"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { AlertTriangle, ArrowLeft, Loader2, Pencil, Send } from "lucide-react"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ProfileUser {
  firstname: string
  lastname: string
  email: string
  phone1?: string | null
  phone2?: string | null
  address?: string | null
  city?: string | null
  educations: Array<{
    id: string
    degreeTitle: string
    educationLevel?: { name: string } | null
    institute?: string | null
    instituteRef?: { name: string } | null
    majorSubject?: string | null
    grade?: string | null
    passingYear?: string | number | null
  }>
  skills: Array<{ id: string; skillName: string; verifiedLevel?: string | null }>
  experiences: Array<{
    id: string
    jobTitle: string
    company?: string | null
    location?: string | null
    startDate?: string | null
    endDate?: string | null
    isCurrent?: boolean
  }>
  profileDetails: {
    title?: string | null
    fatherName?: string | null
    nationality?: string | null
    dateOfBirth?: string | null
    gender?: string | null
    preferredCity?: string | null
    bio?: string | null
    languages?: string | null
    certifications?: string | null
    achievements?: string | null
    expectedSalary?: string | null
    noticePeriod?: string | null
  } | null
  jobPreference: {
    firstPriority?: string | null
    secondPriority?: string | null
    thirdPriority?: string | null
    summary?: string | null
  } | null
}

interface ApplyContext {
  job: { title: string; company: string } | null
  lastRejection: { jobTitle: string; company: string; rejectedAt: string } | null
  profileChangedSinceRejection: boolean | null
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground break-words">{value}</dd>
    </div>
  )
}

export default function ApplyReviewPage() {
  const params = useParams()
  const router = useRouter()
  const { status: authStatus } = useSession()
  const jobId = params?.id as string

  const [user, setUser] = useState<ProfileUser | null>(null)
  const [context, setContext] = useState<ApplyContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [profileRes, contextRes] = await Promise.all([
        fetch("/api/profile"),
        fetch(`/api/profile/apply-context?jobId=${encodeURIComponent(jobId)}`),
      ])
      if (!profileRes.ok) throw new Error("Could not load your profile")
      setUser((await profileRes.json()).user)
      if (contextRes.ok) setContext(await contextRes.json())
    } catch (error: any) {
      setLoadError(error.message || "Could not load your profile")
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace(`/login?jobId=${jobId}`)
      return
    }
    if (authStatus === "authenticated") load()
  }, [authStatus, jobId, load, router])

  const confirmAndApply = async () => {
    setApplying(true)
    setApplyError(null)
    try {
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        router.push(`/jobs/${jobId}/apply/success`)
        return
      }
      if (data.code === "QUICK_TEST_REQUIRED" && data.redirectTo) {
        router.push(data.redirectTo)
        return
      }
      setApplyError(data.error || "Failed to apply. Please try again.")
    } catch {
      setApplyError("Failed to submit application. Please check your connection and try again.")
    } finally {
      setApplying(false)
    }
  }

  const editHref = `/candidate/profile/edit?returnTo=${encodeURIComponent(`/jobs/${jobId}/apply/review`)}`
  const details = user?.profileDetails
  const preference = user?.jobPreference
  const jobTitle = context?.job ? `${context.job.title} at ${context.job.company}` : "this job"

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link
          href={`/jobs/${jobId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to job
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Review your profile before applying</h1>
          <p className="text-muted-foreground mt-1">
            This is exactly what the hiring team will see for {jobTitle}. Update anything that is out of date,
            then confirm.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your profile...
          </div>
        )}

        {loadError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        {context?.lastRejection && (
          <div
            className={`flex gap-3 rounded-md border p-4 text-sm ${
              context.profileChangedSinceRejection === false
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-blue-200 bg-blue-50 text-blue-900"
            }`}
          >
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">
                {context.profileChangedSinceRejection === false
                  ? "Your profile hasn't changed since your last rejected application"
                  : "You have updated your profile since your last rejected application"}
              </p>
              <p className="mt-1">
                Your earlier application for {context.lastRejection.jobTitle} at {context.lastRejection.company} was
                not successful on{" "}
                {new Date(Number(context.lastRejection.rejectedAt) * 1000).toLocaleDateString()}.
                {context.profileChangedSinceRejection === false &&
                  " If you have gained experience, certifications or new skills since then, add them now so this application is judged on your current profile."}
              </p>
            </div>
          </div>
        )}

        {user && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>
                  {[details?.title, user.firstname, user.lastname].filter(Boolean).join(" ")}
                </CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Phone" value={user.phone1} />
                  <Field label="Alternate phone" value={user.phone2} />
                  <Field label="Father name" value={details?.fatherName} />
                  <Field label="Date of birth" value={details?.dateOfBirth} />
                  <Field label="Gender" value={details?.gender} />
                  <Field label="Nationality" value={details?.nationality} />
                  <Field label="City" value={user.city} />
                  <Field label="Preferred city" value={details?.preferredCity} />
                  <Field label="Address" value={user.address} />
                  <Field label="Expected salary" value={details?.expectedSalary} />
                  <Field label="Notice period" value={details?.noticePeriod} />
                </dl>
                {details?.bio && <p className="mt-4 text-sm text-foreground whitespace-pre-line">{details.bio}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Education</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.educations.length === 0 && <p className="text-sm text-muted-foreground">No education added.</p>}
                {user.educations.map((edu) => (
                  <div key={edu.id} className="rounded-md border border-border p-3">
                    <p className="font-medium text-foreground">{edu.degreeTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {[edu.educationLevel?.name, edu.instituteRef?.name ?? edu.institute, edu.majorSubject]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[edu.grade && `Grade: ${edu.grade}`, edu.passingYear && `Passed: ${edu.passingYear}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Experience</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.experiences.length === 0 && (
                  <p className="text-sm text-muted-foreground">No experience added.</p>
                )}
                {user.experiences.map((exp) => (
                  <div key={exp.id} className="rounded-md border border-border p-3">
                    <p className="font-medium text-foreground">{exp.jobTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {[exp.company, exp.location].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {exp.startDate ?? "?"} - {exp.isCurrent ? "Present" : (exp.endDate ?? "?")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skills &amp; certifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {user.skills.length === 0 && <p className="text-sm text-muted-foreground">No skills added.</p>}
                  {user.skills.map((skill) => (
                    <Badge key={skill.id} variant={skill.verifiedLevel ? "default" : "secondary"}>
                      {skill.skillName}
                      {skill.verifiedLevel ? ` · ${skill.verifiedLevel}` : ""}
                    </Badge>
                  ))}
                </div>
                <dl className="grid grid-cols-1 gap-4">
                  <Field label="Certifications" value={details?.certifications} />
                  <Field label="Languages" value={details?.languages} />
                  <Field label="Achievements" value={details?.achievements} />
                </dl>
              </CardContent>
            </Card>

            {preference && (preference.firstPriority || preference.summary) && (
              <Card>
                <CardHeader>
                  <CardTitle>Job preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="First priority" value={preference.firstPriority} />
                    <Field label="Second priority" value={preference.secondPriority} />
                    <Field label="Third priority" value={preference.thirdPriority} />
                  </dl>
                  {preference.summary && (
                    <p className="mt-4 text-sm text-foreground whitespace-pre-line">{preference.summary}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {applyError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {applyError}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" asChild disabled={applying}>
                <Link href={editHref}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Update my profile
                </Link>
              </Button>
              <Button onClick={confirmAndApply} disabled={applying}>
                {applying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {applying ? "Submitting..." : "Confirm & Apply"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
