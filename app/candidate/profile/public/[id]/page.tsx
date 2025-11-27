"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Mail, Phone, MapPin, Briefcase, GraduationCap, Award, Globe, Linkedin, Github, ExternalLink, FileText, Calendar, User } from "lucide-react"

interface PublicProfileData {
  user: {
    id: string
    firstname: string
    lastname: string
    email?: string
    phone1?: string
    city?: string
    country?: string
    institution?: string
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
    } | null
  }
}

export default function PublicProfilePage() {
  const params = useParams()
  const candidateId = params?.id as string
  const [profile, setProfile] = useState<PublicProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (candidateId) {
      fetchPublicProfile()
    }
  }, [candidateId])

  const fetchPublicProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/candidate/profile/${candidateId}`)
      
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

  if (loading) {
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
              <CardDescription>{error || "Profile not found"}</CardDescription>
            </CardHeader>
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Candidate Profile</h1>
          <p className="text-muted-foreground mt-1">Public profile view</p>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.institution && (
                  <div>
                    <p className="text-sm font-medium">Institution</p>
                    <p className="text-sm text-muted-foreground">{user.institution}</p>
                  </div>
                )}
                {profileDetails?.professionalGrade && (
                  <div>
                    <p className="text-sm font-medium">Professional Grade</p>
                    <p className="text-sm text-muted-foreground">{profileDetails.professionalGrade}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

