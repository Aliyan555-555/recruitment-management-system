"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Navbar } from "@/components/Navbar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Edit2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  Linkedin,
  Github,
  ExternalLink,
  FileText,
  Calendar,
  User,
} from "lucide-react"
import Link from "next/link"

interface ProfileData {
  user: {
    id: string
    firstname: string
    lastname: string
    email: string
    phone1?: string
    phone2?: string
    city?: string
    country?: string
    institution?: string
    department?: string
    educations: Array<{
      id: string
      degreeTitle: string
      educationLevel: { name: string }
      institute?: string
      majorSubject?: string
      grade?: string
      passingYear?: string
    }>
    skills: Array<{
      id: string
      skillName: string
      level: number
    }>
    experiences: Array<{
      id: string
      jobTitle: string
      company?: string
      location?: string
      startDate?: string
      endDate?: string
      isCurrent: boolean
    }>
    profileDetails: {
      title?: string
      professionalGrade?: string
      linkedinUrl?: string
      portfolioUrl?: string
      githubUrl?: string
      websiteUrl?: string
      bio?: string
      availability?: string
      expectedSalary?: string
      noticePeriod?: string
      languages?: string
      certifications?: string
      achievements?: string
    } | null
    jobPreference: {
      firstPriority?: string
      secondPriority?: string
      thirdPriority?: string
      summary?: string
    } | null
  }
}

// Utility helpers
const initials = (first?: string, last?: string) => {
  return `${(first || "").charAt(0) || ""}${(last || "").charAt(0) || ""}`.toUpperCase()
}

const formatRange = (start?: string, end?: string, isCurrent?: boolean) => {
  if (!start && !end && !isCurrent) return "N/A"
  const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short" }
  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, opts) : "")
  return `${fmt(start)} - ${isCurrent ? "Present" : fmt(end) || "N/A"}`
}

const SkillPill: React.FC<{ name: string; level: number }> = ({ name, level }) => {
  const pct = Math.min(100, Math.max(0, Math.round((level / 10) * 100)))
  return (
    <div className="w-full md:w-1/2 lg:w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-xs text-muted-foreground">{level}/10</span>
      </div>
      <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#fb923c,#f97316)" }} />
      </div>
    </div>
  )
}

export default function CandidateProfilePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated" && (session as any)?.user?.role !== "CANDIDATE") {
      router.push("/")
      return
    }

    if (status === "authenticated") {
      fetchProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/profile")

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw new Error(text || "Failed to fetch profile")
      }

      const data = await response.json()
      setProfile(data)
    } catch (err: any) {
      setError(err.message || "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <Navbar />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Inline skeleton while page-level loading
  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 w-40 bg-muted rounded mb-6" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-40 bg-muted rounded" />
                <div className="h-56 bg-muted rounded" />
              </div>
              <div className="space-y-4">
                <div className="h-28 bg-muted rounded" />
                <div className="h-20 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error || "Failed to load profile"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button onClick={fetchProfile} variant="ghost">
                  Retry
                </Button>
                <Link href="/">
                  <Button variant="secondary">Go Home</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { user } = profile as ProfileData
  const fullName = `${user.firstname} ${user.lastname}`
  const profileDetails = user.profileDetails || {}

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
              {initials(user.firstname, user.lastname)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{fullName}</h1>
              <p className="text-sm text-muted-foreground">{profileDetails.title || "Candidate"}</p>
              {profileDetails.professionalGrade && (
                <Badge className="mt-2 inline-flex items-center">{profileDetails.professionalGrade}</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/candidate/profile/edit">
              <Button>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </Link>
            <Button variant="ghost" onClick={() => router.push("/applications")}>View Applications</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Main Column */}
          <section className="lg:col-span-2 space-y-6">
            {/* Profile Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileDetails.bio ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{profileDetails.bio}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No bio added yet. Add a short summary to stand out to recruiters.</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a className="text-sm hover:underline" href={`mailto:${user.email}`}>{user.email}</a>
                  </div>

                  {user.phone1 ? (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a className="text-sm hover:underline" href={`tel:${user.phone1}`}>{user.phone1}</a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Phone not provided</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{[user.city, user.country].filter(Boolean).join(", ") || "Location not set"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{profileDetails.availability || "Availability not set"}</span>
                  </div>
                </div>

                {/* Social Links */}
                <div className="flex flex-wrap gap-4 pt-2">
                  {profileDetails.linkedinUrl && (
                    <a href={profileDetails.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {profileDetails.githubUrl && (
                    <a href={profileDetails.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                      <Github className="h-4 w-4" />
                      GitHub
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {profileDetails.portfolioUrl && (
                    <a href={profileDetails.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                      <Globe className="h-4 w-4" />
                      Portfolio
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Education */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Education
                </CardTitle>
                <CardDescription>List of degrees and institutes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.educations.length > 0 ? (
                  user.educations.map((edu) => (
                    <div key={edu.id} className="border-l-2 border-primary pl-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{edu.degreeTitle}</h3>
                        <span className="text-xs text-muted-foreground">{edu.passingYear || "Year N/A"}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {edu.educationLevel?.name}
                        {edu.institute && ` • ${edu.institute}`}
                        {edu.majorSubject && ` • ${edu.majorSubject}`}
                      </p>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        {edu.grade && <span>Grade: {edu.grade}</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No education records — consider adding your highest qualification.</p>
                )}
              </CardContent>
            </Card>

            {/* Experience */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Experience
                </CardTitle>
                <CardDescription>Showcase your most relevant roles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.experiences.length > 0 ? (
                  user.experiences.map((exp) => (
                    <div key={exp.id} className="border-l-2 border-primary pl-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{exp.jobTitle}</h3>
                        <span className="text-xs text-muted-foreground">{formatRange(exp.startDate, exp.endDate, exp.isCurrent)}</span>
                      </div>
                      {exp.company && <p className="text-sm text-muted-foreground">{exp.company}{exp.location && ` • ${exp.location}`}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No experience listed — add internships or projects to strengthen your profile.</p>
                )}
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Skills
                </CardTitle>
                <CardDescription>Quick visual of your abilities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.skills.length > 0 ? (
                    user.skills.map((skill) => (
                      <div key={skill.id}>
                        <SkillPill name={skill.skillName} level={skill.level} />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No skills added yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Additional Info */}
            {(profileDetails?.certifications || profileDetails?.achievements || profileDetails?.languages) && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profileDetails.certifications && (
                    <div>
                      <h4 className="font-semibold mb-2">Certifications</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{profileDetails.certifications}</p>
                    </div>
                  )}
                  {profileDetails.achievements && (
                    <div>
                      <h4 className="font-semibold mb-2">Achievements</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{profileDetails.achievements}</p>
                    </div>
                  )}
                  {profileDetails.languages && (
                    <div>
                      <h4 className="font-semibold mb-2">Languages</h4>
                      <p className="text-sm text-muted-foreground">{profileDetails.languages}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </section>

          {/* Right / Sidebar */}
          <aside className="space-y-6">
            {/* Job Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>Job Preferences</CardTitle>
                <CardDescription>What roles and setups you prefer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.jobPreference ? (
                  <div className="text-sm text-muted-foreground">
                    {user.jobPreference.firstPriority && (
                      <div className="mb-2">
                        <p className="text-xs font-medium">First Priority</p>
                        <p>{user.jobPreference.firstPriority}</p>
                      </div>
                    )}
                    {user.jobPreference.secondPriority && (
                      <div className="mb-2">
                        <p className="text-xs font-medium">Second Priority</p>
                        <p>{user.jobPreference.secondPriority}</p>
                      </div>
                    )}
                    {user.jobPreference.thirdPriority && (
                      <div className="mb-2">
                        <p className="text-xs font-medium">Third Priority</p>
                        <p>{user.jobPreference.thirdPriority}</p>
                      </div>
                    )}
                    {user.jobPreference.summary && (
                      <div>
                        <p className="text-xs font-medium">Summary</p>
                        <p className="text-sm text-muted-foreground">{user.jobPreference.summary}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No job preferences provided.</p>
                )}
              </CardContent>
            </Card>



            {/* Employment details */}
            {(profileDetails?.expectedSalary || profileDetails?.noticePeriod) && (
              <Card>
                <CardHeader>
                  <CardTitle>Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  {profileDetails.expectedSalary && (
                    <div>
                      <p className="text-xs font-medium">Expected Salary</p>
                      <p>{profileDetails.expectedSalary}</p>
                    </div>
                  )}
                  {profileDetails.noticePeriod && (
                    <div>
                      <p className="text-xs font-medium">Notice Period</p>
                      <p>{profileDetails.noticePeriod}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}


          </aside>
        </div>
      </main>
    </div>
  )
}
