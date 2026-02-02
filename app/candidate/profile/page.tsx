"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Navbar } from "@/components/Navbar"
import { toast } from "@/lib/toast"
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
    avatar?: string
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
      nationality?: string
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
  const [isUploading, setIsUploading] = useState(false)

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB")
      return
    }

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      })

      if (!uploadRes.ok) throw new Error("Failed to upload image")

      const { path } = await uploadRes.json()

      // Update profile with new image path
      const updateRes = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: path }),
      })

      if (!updateRes.ok) throw new Error("Failed to update profile")

      // Update local state
      if (profile) {
        setProfile({
          ...profile,
          user: {
            ...profile.user,
            avatar: path
          }
        })
      }

      toast.success("Profile picture updated successfully!")
      // Refresh to update Navbar session
      setTimeout(() => window.location.reload(), 500)
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to update profile picture")
    } finally {
      setIsUploading(false)
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
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      {/* Cover Photo Area - Matching Public Profile */}
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
            <div className="relative group">
              <div className="h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-card bg-muted flex items-center justify-center overflow-hidden shadow-md relative">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                ) : user.firstname || user.lastname ? (
                  <span className="text-4xl md:text-5xl font-bold text-muted-foreground">
                    {initials(user.firstname, user.lastname)}
                  </span>
                ) : (
                  <User className="h-16 w-16 text-muted-foreground" />
                )}

                {/* Upload Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <label htmlFor="avatar-upload" className="cursor-pointer p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                    {isUploading ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Edit2 className="h-6 w-6 text-white" />
                    )}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </div>
              </div>
              {/* Online Status Dot */}
              <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-green-500 border-4 border-card z-10"></div>
            </div>

            <div className="flex-1 text-center md:text-left mb-2 md:mb-0">
              <h1 className="text-3xl font-bold text-foreground">{fullName}</h1>
              {profileDetails?.title && (
                <p className="text-muted-foreground font-medium">{profileDetails.title}</p>
              )}
              <div className="flex justify-center md:justify-start gap-3 mt-1 text-sm text-muted-foreground">
                {(user.city || user.country || profileDetails?.nationality) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {[user.city, user.country || profileDetails?.nationality].filter(Boolean).join(", ")}
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
              <Link href="/candidate/profile/edit">
                <Button className="shadow-sm">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
              <Link href="/applications">
                <Button variant="outline" className="shadow-sm">View Applications</Button>
              </Link>
            </div>
          </div>

          <div className="flex border-t border-border px-4 mt-2">
            <div className="flex gap-1">
              {["Profile", "Preferences"].map((tab) => (
                <button
                  key={tab}
                  className={`px-4 py-3 font-semibold text-sm border-b-2 hover:bg-muted transition-colors ${tab === "Profile" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
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

          {/* Left Sidebar (Intro, Skills, Contact) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Intro Card */}
            <Card className="shadow-sm bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Intro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profileDetails?.bio ? (
                  <p className="text-center text-sm text-muted-foreground mb-4 whitespace-pre-line">{profileDetails.bio}</p>
                ) : (
                  <p className="text-center text-sm text-muted-foreground italic mb-4">No bio added.</p>
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
                  {(user.city || user.country || profileDetails?.nationality) && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <MapPin className="h-5 w-5 text-muted-foreground/70" />
                      <span className="text-sm">Lives in <span className="font-semibold text-foreground">{[user.city, user.country || profileDetails?.nationality].filter(Boolean).join(", ")}</span></span>
                    </div>
                  )}
                  {profileDetails?.websiteUrl && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Globe className="h-5 w-5 text-muted-foreground/70" />
                      <a href={profileDetails.websiteUrl} target="_blank" className="text-sm text-primary hover:underline truncate">{profileDetails.websiteUrl}</a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Skills Card */}
            <Card className="shadow-sm bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {user.skills.length > 0 ? (
                    user.skills.map((skill) => (
                      <Badge key={skill.id} variant="secondary" className="px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground border-0">
                        {skill.skillName} • {skill.level}/10
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No skills added.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="shadow-sm bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Contact Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <span className="text-foreground truncate">{user.email}</span>
                </div>
                {user.phone1 && (
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground">{user.phone1}</span>
                  </div>
                )}
                {profileDetails?.linkedinUrl && (
                  <a href={profileDetails.linkedinUrl} target="_blank" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-primary hover:underline">
                    <Linkedin className="h-5 w-5" />
                    <span>LinkedIn Profile</span>
                  </a>
                )}
                {profileDetails?.githubUrl && (
                  <a href={profileDetails.githubUrl} target="_blank" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-primary hover:underline">
                    <Github className="h-5 w-5" />
                    <span>GitHub Profile</span>
                  </a>
                )}
                {profileDetails?.portfolioUrl && (
                  <a href={profileDetails.portfolioUrl} target="_blank" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-primary hover:underline">
                    <Globe className="h-5 w-5" />
                    <span>Portfolio</span>
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Job Preferences Summary */}
            <Card className="shadow-sm bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.jobPreference ? (
                  <div className="space-y-3">
                    {user.jobPreference.firstPriority && (
                      <Badge variant="outline" className="w-full justify-start py-2 px-3 border-primary/20 bg-primary/5 text-primary">
                        1. {user.jobPreference.firstPriority}
                      </Badge>
                    )}
                    {user.jobPreference.secondPriority && (
                      <Badge variant="outline" className="w-full justify-start py-2 px-3">
                        2. {user.jobPreference.secondPriority}
                      </Badge>
                    )}
                    {user.jobPreference.summary && (
                      <p className="text-sm text-muted-foreground mt-2">{user.jobPreference.summary}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No preferences set.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Main Content (Experience, Education, etc) */}
          <div className="lg:col-span-8 space-y-6">

            {/* Experience Section */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" /> Experience
                </h2>
                <Link href="/candidate/profile/edit#experience">
                  <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                    <Edit2 className="h-4 w-4 mr-2" /> Edit
                  </Button>
                </Link>
              </div>

              <div className="space-y-8">
                {user.experiences.length > 0 ? (
                  user.experiences.map((exp) => (
                    <div key={exp.id} className="flex gap-4 group">
                      <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Briefcase className="h-6 w-6 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground text-lg">{exp.jobTitle}</h3>
                        <p className="text-muted-foreground font-medium">{exp.company}</p>
                        {exp.location && <p className="text-muted-foreground/80 text-sm">{exp.location}</p>}
                        <p className="text-sm text-muted-foreground/70 mt-1">
                          {formatRange(exp.startDate, exp.endDate, exp.isCurrent)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-muted/30 rounded-lg dashed-border">
                    <p className="text-muted-foreground mb-4">No experience listed yet.</p>
                    <Link href="/candidate/profile/edit">
                      <Button variant="outline">Add Experience</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Education Section */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" /> Education
                </h2>
                <Link href="/candidate/profile/edit#education">
                  <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                    <Edit2 className="h-4 w-4 mr-2" /> Edit
                  </Button>
                </Link>
              </div>

              <div className="space-y-8">
                {user.educations.length > 0 ? (
                  user.educations.map((edu) => (
                    <div key={edu.id} className="flex gap-4 group">
                      <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
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
                  ))
                ) : (
                  <div className="text-center py-8 bg-muted/30 rounded-lg dashed-border">
                    <p className="text-muted-foreground mb-4">No education listed yet.</p>
                    <Link href="/candidate/profile/edit">
                      <Button variant="outline">Add Education</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Details (Employment / Certs) */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Additional Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profileDetails.expectedSalary && (
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Expected Salary</p>
                    <p className="font-medium text-foreground">{profileDetails.expectedSalary}</p>
                  </div>
                )}
                {profileDetails.noticePeriod && (
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Notice Period</p>
                    <p className="font-medium text-foreground">{profileDetails.noticePeriod}</p>
                  </div>
                )}
                {profileDetails.languages && (
                  <div className="p-4 bg-muted/30 rounded-lg border border-border md:col-span-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Languages</p>
                    <p className="font-medium text-foreground">{profileDetails.languages}</p>
                  </div>
                )}
              </div>

              {(profileDetails.certifications || profileDetails.achievements) && (
                <div className="mt-6 space-y-6">
                  {profileDetails.certifications && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Certifications</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{profileDetails.certifications}</p>
                    </div>
                  )}
                  {profileDetails.achievements && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Achievements</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{profileDetails.achievements}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
