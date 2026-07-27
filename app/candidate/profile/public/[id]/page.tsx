"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Mail, Phone, MapPin, Briefcase, GraduationCap, Award, Globe, Linkedin, Github, ExternalLink, FileText, Calendar, User, AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { SkillPercentageBadge } from "@/components/candidate/VerifiedLevelBadge"
import { Button } from "@/components/ui/button"

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
      verifiedLevel?: string | null
      skillPercentage?: number | null
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
      setError(null)
      const response = await fetch(`/api/candidate/profile/${candidateId}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `Failed to fetch profile (${response.status})`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      setProfile(data)
    } catch (err: any) {
      setError(err.message || "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-lg">Loading candidate profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    const isNotFound = error?.toLowerCase().includes("not found") || error?.toLowerCase().includes("doesn't exist")
    const isUnauthorized = error?.toLowerCase().includes("unauthorized")

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="border-2 border-destructive/20 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-2xl text-foreground">
                {isNotFound ? "Profile Not Found" : isUnauthorized ? "Access Denied" : "Error Loading Profile"}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {error || "The candidate profile could not be loaded."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isNotFound && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    <strong>Possible reasons:</strong>
                  </p>
                  <ul className="list-disc list-inside text-sm text-yellow-600/90 dark:text-yellow-400/90 mt-2 space-y-1">
                    <li>The candidate ID may be incorrect</li>
                    <li>The profile may have been removed or deactivated</li>
                    <li>The candidate may not have completed their profile setup</li>
                  </ul>
                </div>
              )}
              {isUnauthorized && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    You need to be logged in as an admin or staff member to view candidate profiles.
                  </p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={() => window.history.back()}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
                <Link href="/admin/jobs" className="flex-1">
                  <Button className="w-full">
                    View Jobs
                  </Button>
                </Link>
              </div>
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
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      {/* Cover Photo Area */}
      <div className="bg-card shadow-sm pb-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative h-60 md:h-80 rounded-b-xl overflow-hidden bg-gray-900">
            {/* Banner Image */}
            <img
              src="/ats_banner.png"
              alt="Cover"
              className="w-full h-full object-cover opacity-90"
            />
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-10 px-4 pb-4 gap-4 md:gap-6">
            <div className="relative">
              <div className="h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-card bg-muted flex items-center justify-center overflow-hidden shadow-md">
                <User className="h-16 w-16 text-muted-foreground" />
              </div>
              {/* Online Status Dot */}
              <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-green-500 border-4 border-card"></div>
            </div>

            <div className="flex-1 text-center md:text-left mb-2 md:mb-0">
              <h1 className="text-3xl font-bold text-foreground">{fullName}</h1>
              {profileDetails?.title && (
                <p className="text-muted-foreground font-medium">{profileDetails.title}</p>
              )}
              <div className="flex justify-center md:justify-start gap-3 mt-1 text-sm text-muted-foreground">
                {user.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {user.city}, {user.country}
                  </span>
                )}
                {profileDetails?.professionalGrade && (
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <Award className="h-3 w-3" /> {profileDetails.professionalGrade} Candidate
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 min-w-40 justify-center md:justify-end">
              {/* Buttons removed as per request */}
            </div>
          </div>

          <div className="flex border-t border-border px-4 mt-2">
            <div className="flex gap-1">
              {["About"].map((tab, i) => (
                <button
                  key={tab}
                  className={`px-4 py-3 font-semibold text-sm border-b-2 hover:bg-muted transition-colors border-primary text-primary`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Sidebar (Intro) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Intro Card */}
            <Card className="shadow-sm bg-card border-border">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground">Intro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileDetails?.bio && (
                  <p className="text-center text-sm text-muted-foreground mb-4">{profileDetails.bio}</p>
                )}
                <div className="space-y-3">
                  {profileDetails?.title && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Briefcase className="h-5 w-5 text-muted-foreground/70" />
                      <span className="text-sm">Works as <span className="font-semibold text-foreground">{profileDetails.title}</span></span>
                    </div>
                  )}
                  {user.institution && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <GraduationCap className="h-5 w-5 text-muted-foreground/70" />
                      <span className="text-sm">Studied at <span className="font-semibold text-foreground">{user.institution}</span></span>
                    </div>
                  )}
                  {(user.city || user.country) && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <MapPin className="h-5 w-5 text-muted-foreground/70" />
                      <span className="text-sm">Lives in <span className="font-semibold text-foreground">{[user.city, user.country].filter(Boolean).join(", ")}</span></span>
                    </div>
                  )}
                  {profileDetails?.websiteUrl && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Globe className="h-5 w-5 text-muted-foreground/70" />
                      <a href={profileDetails.websiteUrl} target="_blank" className="text-sm text-primary hover:underline">{profileDetails.websiteUrl}</a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Skills Card (Photos style) */}
            {user.skills.length > 0 && (
              <Card className="shadow-sm bg-card border-border">
                <CardHeader className="flex flex-row justify-between items-center pb-2">
                  <CardTitle className="text-xl font-bold text-foreground">Skills</CardTitle>
                  <Button variant="ghost" className="text-primary hover:bg-primary/10">See all skills</Button>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill) => (
                      <div key={skill.id} className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground border-0">
                          {skill.skillName}
                        </Badge>
                        <SkillPercentageBadge percentage={skill.skillPercentage} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Feed (Content) */}
          <div className="lg:col-span-7 space-y-4">

            {/* About / Bio "Post" - if not in sidebar or to emphasize */}
            {profileDetails?.bio && (
              <div className="bg-card rounded-xl shadow-sm border border-border p-4">
                <div className="flex items-center justify-between mb-2 border-b border-border pb-2">
                  <h2 className="text-xl font-bold text-foreground">About</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{profileDetails.bio}</p>
              </div>
            )}

            {/* Experience "Posts" */}
            {user.experiences.length > 0 && (
              <div className="bg-card rounded-xl shadow-sm border border-border p-4">
                <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
                  <h2 className="text-xl font-bold text-foreground">Experience</h2>
                </div>
                <div className="space-y-6">
                  {user.experiences.map((exp) => (
                    <div key={exp.id} className="flex gap-4 group">
                      <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                        <Briefcase className="h-6 w-6 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground text-lg">{exp.jobTitle}</h3>
                        <p className="text-muted-foreground font-medium">{exp.company}</p>
                        {exp.location && <p className="text-muted-foreground/80 text-sm">{exp.location}</p>}
                        <p className="text-sm text-muted-foreground/70 mt-1">
                          {exp.startDate} - {exp.isCurrent ? "Present" : exp.endDate || "N/A"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education "Posts" */}
            {user.educations.length > 0 && (
              <div className="bg-card rounded-xl shadow-sm border border-border p-4">
                <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
                  <h2 className="text-xl font-bold text-foreground">Education</h2>
                </div>
                <div className="space-y-6">
                  {user.educations.map((edu) => (
                    <div key={edu.id} className="flex gap-4 group">
                      <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                        <GraduationCap className="h-6 w-6 text-indigo-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground text-lg">{edu.institute}</h3>
                        <p className="text-foreground/80 font-medium">{edu.degreeTitle}</p>
                        <p className="text-muted-foreground text-sm">
                          {edu.educationLevel.name} {edu.majorSubject && `• ${edu.majorSubject}`}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          {edu.passingYear && <span>Class of {edu.passingYear}</span>}
                          {edu.grade && <span className="text-indigo-500 font-medium">Grade: {edu.grade}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact/Social Mock Post */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-4">
              <div className="flex items-start gap-4 mb-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-bold text-foreground">{fullName}</p>
                  <p className="text-xs text-muted-foreground">Full Contact Information</p>
                </div>
              </div>
              <div className="pl-0 md:pl-14">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {user.email && (
                    <a href={`mailto:${user.email}`} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Mail className="h-4 w-4" />
                      </div>
                      <span className="truncate text-foreground">{user.email}</span>
                    </a>
                  )}
                  {user.phone1 && (
                    <a href={`tel:${user.phone1}`} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                        <Phone className="h-4 w-4" />
                      </div>
                      <span className="text-foreground">{user.phone1}</span>
                    </a>
                  )}
                  {profileDetails?.linkedinUrl && (
                    <a href={profileDetails.linkedinUrl} target="_blank" className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="h-8 w-8 rounded-full bg-[#0077b5]/10 flex items-center justify-center text-[#0077b5]">
                        <Linkedin className="h-4 w-4" />
                      </div>
                      <span className="text-foreground">LinkedIn</span>
                    </a>
                  )}
                  {profileDetails?.githubUrl && (
                    <a href={profileDetails.githubUrl} target="_blank" className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-foreground">
                        <Github className="h-4 w-4" />
                      </div>
                      <span className="text-foreground">GitHub</span>
                    </a>
                  )}
                  {profileDetails?.portfolioUrl && (
                    <a href={profileDetails.portfolioUrl} target="_blank" className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="h-8 w-8 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500">
                        <Globe className="h-4 w-4" />
                      </div>
                      <span className="text-foreground">Portfolio</span>
                    </a>
                  )}
                  {profileDetails?.websiteUrl && (
                    <a href={profileDetails.websiteUrl} target="_blank" className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <Globe className="h-4 w-4" />
                      </div>
                      <span className="text-foreground">Website</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Details (Availability etc) if not fitting elsewhere */}
            {profileDetails?.availability && (
              <div className="bg-card rounded-xl shadow-sm border border-border p-4">
                <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" /> Availability
                </h3>
                <p className="text-emerald-600 bg-emerald-500/10 inline-block px-3 py-1 rounded-full text-sm font-medium border border-emerald-500/20">
                  {profileDetails.availability}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

