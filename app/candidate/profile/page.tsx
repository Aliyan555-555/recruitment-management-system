"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Edit2, Mail, Phone, MapPin, Briefcase, GraduationCap, Award, Globe, Linkedin, Github, ExternalLink, FileText, Calendar, User } from "lucide-react"
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
    cvs: Array<{
      id: string
      filename: string
    }>
  }
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

    if (status === "authenticated" && session?.user?.role !== "CANDIDATE") {
      router.push("/")
      return
    }

    if (status === "authenticated") {
      fetchProfile()
    }
  }, [status, session, router])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/profile")
      
      if (!response.ok) {
        throw new Error("Failed to fetch profile")
      }

      const data = await response.json()
      setProfile(data)
    } catch (err: any) {
      setError(err.message || "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <Navbar />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error || "Failed to load profile"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={fetchProfile}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { user } = profile
  const fullName = `${user.firstname} ${user.lastname}`
  const profileDetails = user.profileDetails

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground mt-1">View and manage your professional profile</p>
          </div>
          <Link href="/candidate/profile/edit">
            <Button>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">{fullName}</h2>
                  {profileDetails?.title && (
                    <p className="text-lg text-muted-foreground">{profileDetails.title}</p>
                  )}
                  {profileDetails?.professionalGrade && (
                    <Badge variant="secondary" className="mt-2">
                      {profileDetails.professionalGrade}
                    </Badge>
                  )}
                </div>
                {profileDetails?.bio && (
                  <p className="text-muted-foreground">{profileDetails.bio}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                  )}
                  {user.phone1 && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.phone1}</span>
                    </div>
                  )}
                  {(user.city || user.country) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {[user.city, user.country].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  {profileDetails?.availability && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profileDetails.availability}</span>
                    </div>
                  )}
                </div>
                {(profileDetails?.linkedinUrl || profileDetails?.githubUrl || profileDetails?.portfolioUrl || profileDetails?.websiteUrl) && (
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
                    {profileDetails.websiteUrl && (
                      <a href={profileDetails.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                        <Globe className="h-4 w-4" />
                        Website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Education */}
            {user.educations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user.educations.map((edu) => (
                    <div key={edu.id} className="border-l-2 border-primary pl-4">
                      <h3 className="font-semibold">{edu.degreeTitle}</h3>
                      <p className="text-sm text-muted-foreground">
                        {edu.educationLevel.name}
                        {edu.institute && ` • ${edu.institute}`}
                        {edu.majorSubject && ` • ${edu.majorSubject}`}
                      </p>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        {edu.grade && <span>Grade: {edu.grade}</span>}
                        {edu.passingYear && <span>Year: {edu.passingYear}</span>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Experience */}
            {user.experiences.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Experience
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user.experiences.map((exp) => (
                    <div key={exp.id} className="border-l-2 border-primary pl-4">
                      <h3 className="font-semibold">{exp.jobTitle}</h3>
                      {exp.company && (
                        <p className="text-sm text-muted-foreground">{exp.company}</p>
                      )}
                      {exp.location && (
                        <p className="text-sm text-muted-foreground">{exp.location}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        {exp.startDate && (
                          <span>
                            {exp.startDate} - {exp.isCurrent ? "Present" : exp.endDate || "N/A"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {user.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill) => (
                      <Badge key={skill.id} variant="secondary">
                        {skill.skillName} ({skill.level}/10)
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {profileDetails.certifications}
                      </p>
                    </div>
                  )}
                  {profileDetails.achievements && (
                    <div>
                      <h4 className="font-semibold mb-2">Achievements</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {profileDetails.achievements}
                      </p>
                    </div>
                  )}
                  {profileDetails.languages && (
                    <div>
                      <h4 className="font-semibold mb-2">Languages</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {profileDetails.languages}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Job Preferences */}
            {user.jobPreference && (
              <Card>
                <CardHeader>
                  <CardTitle>Job Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {user.jobPreference.firstPriority && (
                    <div>
                      <p className="text-sm font-medium">First Priority</p>
                      <p className="text-sm text-muted-foreground">{user.jobPreference.firstPriority}</p>
                    </div>
                  )}
                  {user.jobPreference.secondPriority && (
                    <div>
                      <p className="text-sm font-medium">Second Priority</p>
                      <p className="text-sm text-muted-foreground">{user.jobPreference.secondPriority}</p>
                    </div>
                  )}
                  {user.jobPreference.thirdPriority && (
                    <div>
                      <p className="text-sm font-medium">Third Priority</p>
                      <p className="text-sm text-muted-foreground">{user.jobPreference.thirdPriority}</p>
                    </div>
                  )}
                  {user.jobPreference.summary && (
                    <div>
                      <p className="text-sm font-medium">Summary</p>
                      <p className="text-sm text-muted-foreground">{user.jobPreference.summary}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* CVs */}
            {user.cvs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    CVs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {user.cvs.map((cv) => (
                    <div key={cv.id} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{cv.filename}</span>
                      <a
                        href={`/api/profile/cv/${cv.id}`}
                        target="_blank"
                        className="text-primary hover:underline text-sm"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Salary & Notice Period */}
            {(profileDetails?.expectedSalary || profileDetails?.noticePeriod) && (
              <Card>
                <CardHeader>
                  <CardTitle>Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profileDetails.expectedSalary && (
                    <div>
                      <p className="text-sm font-medium">Expected Salary</p>
                      <p className="text-sm text-muted-foreground">{profileDetails.expectedSalary}</p>
                    </div>
                  )}
                  {profileDetails.noticePeriod && (
                    <div>
                      <p className="text-sm font-medium">Notice Period</p>
                      <p className="text-sm text-muted-foreground">{profileDetails.noticePeriod}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

