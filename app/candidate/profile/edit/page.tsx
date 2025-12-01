"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Navbar } from "@/components/Navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save, ArrowLeft, CheckCircle2, Plus, Edit2, Trash2, X } from "lucide-react"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function EditProfilePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Basic Info
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone1, setPhone1] = useState("")
  const [phone2, setPhone2] = useState("")
  const [institution, setInstitution] = useState("")
  const [department, setDepartment] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [country, setCountry] = useState("")

  // Profile Details
  const [title, setTitle] = useState("")
  const [professionalGrade, setProfessionalGrade] = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [portfolioUrl, setPortfolioUrl] = useState("")
  const [githubUrl, setGithubUrl] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [bio, setBio] = useState("")
  const [availability, setAvailability] = useState("")
  const [expectedSalary, setExpectedSalary] = useState("")
  const [noticePeriod, setNoticePeriod] = useState("")
  const [languages, setLanguages] = useState("")
  const [certifications, setCertifications] = useState("")
  const [achievements, setAchievements] = useState("")
  const [references, setReferences] = useState("")

  // Job Preference
  const [firstPriority, setFirstPriority] = useState("")
  const [secondPriority, setSecondPriority] = useState("")
  const [thirdPriority, setThirdPriority] = useState("")
  const [summary, setSummary] = useState("")

  // Skills
  const [skills, setSkills] = useState<Array<{ id: string; skillName: string; level: number }>>([])
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)
  const [newSkill, setNewSkill] = useState({ skillName: "", level: 5 })
  const [editingSkill, setEditingSkill] = useState({ skillName: "", level: 5 })
  const [showAddSkill, setShowAddSkill] = useState(false)

  // Experiences
  const [experiences, setExperiences] = useState<Array<{
    id: string
    jobTitle: string
    company?: string
    location?: string
    startDate?: string
    endDate?: string
    isCurrent: boolean
  }>>([])
  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null)
  const [newExperience, setNewExperience] = useState({
    jobTitle: "",
    company: "",
    location: "",
    startDate: "",
    endDate: "",
    isCurrent: false
  })
  const [editingExperience, setEditingExperience] = useState({
    jobTitle: "",
    company: "",
    location: "",
    startDate: "",
    endDate: "",
    isCurrent: false
  })
  const [showAddExperience, setShowAddExperience] = useState(false)

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
      const user = data.user

      // Basic Info
      setFirstName(user.firstname || "")
      setLastName(user.lastname || "")
      setEmail(user.email || "")
      setPhone1(user.phone1 || "")
      setPhone2(user.phone2 || "")
      setInstitution(user.institution || "")
      setDepartment(user.department || "")
      setAddress(user.address || "")
      setCity(user.city || "")
      setCountry(user.country || "")

      // Profile Details
      if (user.profileDetails) {
        setTitle(user.profileDetails.title || "")
        setProfessionalGrade(user.profileDetails.professionalGrade || "")
        setLinkedinUrl(user.profileDetails.linkedinUrl || "")
        setPortfolioUrl(user.profileDetails.portfolioUrl || "")
        setGithubUrl(user.profileDetails.githubUrl || "")
        setWebsiteUrl(user.profileDetails.websiteUrl || "")
        setBio(user.profileDetails.bio || "")
        setAvailability(user.profileDetails.availability || "")
        setExpectedSalary(user.profileDetails.expectedSalary || "")
        setNoticePeriod(user.profileDetails.noticePeriod || "")
        setLanguages(user.profileDetails.languages || "")
        setCertifications(user.profileDetails.certifications || "")
        setAchievements(user.profileDetails.achievements || "")
        setReferences(user.profileDetails.references || "")
      }

      // Job Preference
      if (user.jobPreference) {
        setFirstPriority(user.jobPreference.firstPriority || "")
        setSecondPriority(user.jobPreference.secondPriority || "")
        setThirdPriority(user.jobPreference.thirdPriority || "")
        setSummary(user.jobPreference.summary || "")
      }

      // Skills
      if (user.skills) {
        setSkills(user.skills.map((skill: any) => ({
          id: skill.id.toString(),
          skillName: skill.skillName,
          level: skill.level
        })))
      }

      // Experiences
      if (user.experiences) {
        setExperiences(user.experiences.map((exp: any) => ({
          id: exp.id.toString(),
          jobTitle: exp.jobTitle,
          company: exp.company || "",
          location: exp.location || "",
          startDate: exp.startDate || "",
          endDate: exp.endDate || "",
          isCurrent: exp.isCurrent || false
        })))
      }
    } catch (err: any) {
      setError(err.message || "Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  // Skills handlers
  const handleAddSkill = async () => {
    if (!newSkill.skillName.trim()) {
      setError("Skill name is required")
      return
    }

    try {
      const response = await fetch("/api/profile/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillName: newSkill.skillName.trim(),
          level: newSkill.level
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to add skill")
      }

      const skill = await response.json()
      setSkills([...skills, skill])
      setNewSkill({ skillName: "", level: 5 })
      setShowAddSkill(false)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to add skill")
    }
  }

  const handleEditSkill = (skill: { id: string; skillName: string; level: number }) => {
    setEditingSkillId(skill.id)
    setEditingSkill({ skillName: skill.skillName, level: skill.level })
  }

  const handleUpdateSkill = async () => {
    if (!editingSkillId || !editingSkill.skillName.trim()) {
      setError("Skill name is required")
      return
    }

    try {
      const response = await fetch(`/api/profile/skills/${editingSkillId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillName: editingSkill.skillName.trim(),
          level: editingSkill.level
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update skill")
      }

      const updatedSkill = await response.json()
      setSkills(skills.map(s => s.id === editingSkillId ? updatedSkill : s))
      setEditingSkillId(null)
      setEditingSkill({ skillName: "", level: 5 })
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to update skill")
    }
  }

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm("Are you sure you want to delete this skill?")) return

    try {
      const response = await fetch(`/api/profile/skills/${skillId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete skill")
      }

      setSkills(skills.filter(s => s.id !== skillId))
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to delete skill")
    }
  }

  // Experience handlers
  const handleAddExperience = async () => {
    if (!newExperience.jobTitle.trim()) {
      setError("Job title is required")
      return
    }

    try {
      const response = await fetch("/api/profile/experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: newExperience.jobTitle.trim(),
          company: newExperience.company.trim() || undefined,
          location: newExperience.location.trim() || undefined,
          startDate: newExperience.startDate.trim() || undefined,
          endDate: newExperience.isCurrent ? undefined : (newExperience.endDate.trim() || undefined),
          isCurrent: newExperience.isCurrent
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to add experience")
      }

      const experience = await response.json()
      setExperiences([...experiences, experience])
      setNewExperience({
        jobTitle: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        isCurrent: false
      })
      setShowAddExperience(false)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to add experience")
    }
  }

  const handleEditExperience = (exp: typeof experiences[0]) => {
    setEditingExperienceId(exp.id)
    setEditingExperience({
      jobTitle: exp.jobTitle,
      company: exp.company || "",
      location: exp.location || "",
      startDate: exp.startDate || "",
      endDate: exp.endDate || "",
      isCurrent: exp.isCurrent
    })
  }

  const handleUpdateExperience = async () => {
    if (!editingExperienceId || !editingExperience.jobTitle.trim()) {
      setError("Job title is required")
      return
    }

    try {
      const response = await fetch(`/api/profile/experience/${editingExperienceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: editingExperience.jobTitle.trim(),
          company: editingExperience.company.trim() || undefined,
          location: editingExperience.location.trim() || undefined,
          startDate: editingExperience.startDate.trim() || undefined,
          endDate: editingExperience.isCurrent ? undefined : (editingExperience.endDate.trim() || undefined),
          isCurrent: editingExperience.isCurrent
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update experience")
      }

      const updatedExp = await response.json()
      setExperiences(experiences.map(e => e.id === editingExperienceId ? updatedExp : e))
      setEditingExperienceId(null)
      setEditingExperience({
        jobTitle: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        isCurrent: false
      })
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to update experience")
    }
  }

  const handleDeleteExperience = async (expId: string) => {
    if (!confirm("Are you sure you want to delete this experience?")) return

    try {
      const response = await fetch(`/api/profile/experience/${expId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete experience")
      }

      setExperiences(experiences.filter(e => e.id !== expId))
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to delete experience")
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone1,
          phone2,
          institution,
          department,
          address,
          city,
          country,
          profileDetails: {
            title,
            professionalGrade,
            linkedinUrl,
            portfolioUrl,
            githubUrl,
            websiteUrl,
            bio,
            availability,
            expectedSalary,
            noticePeriod,
            languages,
            certifications,
            achievements,
            references
          },
          jobPreference: {
            firstPriority,
            secondPriority,
            thirdPriority,
            summary
          }
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save profile")
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/candidate/profile")
      }, 1500)
    } catch (err: any) {
      setError(err.message || "Failed to save profile")
    } finally {
      setSaving(false)
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/candidate/profile">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Edit Profile</h1>
            <p className="text-muted-foreground mt-1">Update your professional information</p>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="mb-6 border-green-500 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <p>Profile saved successfully!</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Your personal and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="title">Professional Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Senior Software Engineer"
                  />
                </div>
                <div>
                  <Label htmlFor="phone1">Primary Phone</Label>
                  <Input
                    id="phone1"
                    type="tel"
                    value={phone1}
                    onChange={(e) => setPhone1(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone2">Alternate Phone</Label>
                  <Input
                    id="phone2"
                    type="tel"
                    value={phone2}
                    onChange={(e) => setPhone2(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="institution">Institution</Label>
                  <Input
                    id="institution"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g., PK, US"
                  />
                </div>
                <div>
                  <Label htmlFor="professionalGrade">Professional Grade</Label>
                  <Select value={professionalGrade} onValueChange={setProfessionalGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Entry Level">Entry Level</SelectItem>
                      <SelectItem value="Junior">Junior</SelectItem>
                      <SelectItem value="Mid Level">Mid Level</SelectItem>
                      <SelectItem value="Senior">Senior</SelectItem>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="Principal">Principal</SelectItem>
                      <SelectItem value="Architect">Architect</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Director">Director</SelectItem>
                      <SelectItem value="Executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write a brief professional summary..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Professional Links */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Links</CardTitle>
              <CardDescription>Your online presence and portfolios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
                <div>
                  <Label htmlFor="githubUrl">GitHub URL</Label>
                  <Input
                    id="githubUrl"
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/yourusername"
                  />
                </div>
                <div>
                  <Label htmlFor="portfolioUrl">Portfolio URL</Label>
                  <Input
                    id="portfolioUrl"
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://yourportfolio.com"
                  />
                </div>
                <div>
                  <Label htmlFor="websiteUrl">Personal Website</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Skills</CardTitle>
                  <CardDescription>Manage your technical and professional skills</CardDescription>
                </div>
                {!showAddSkill && !editingSkillId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddSkill(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Skill
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Skill Form */}
              {showAddSkill && !editingSkillId && (
                <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Add New Skill</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddSkill(false)
                        setNewSkill({ skillName: "", level: 5 })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="newSkillName">Skill Name *</Label>
                      <Input
                        id="newSkillName"
                        value={newSkill.skillName}
                        onChange={(e) => setNewSkill({ ...newSkill, skillName: e.target.value })}
                        placeholder="e.g., JavaScript, Python"
                      />
                    </div>
                    <div>
                      <Label htmlFor="newSkillLevel">Level (1-10) *</Label>
                      <Input
                        id="newSkillLevel"
                        type="number"
                        min="1"
                        max="10"
                        value={newSkill.level}
                        onChange={(e) => setNewSkill({ ...newSkill, level: parseInt(e.target.value) || 5 })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddSkill} size="sm">
                      Add Skill
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddSkill(false)
                        setNewSkill({ skillName: "", level: 5 })
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Skills List */}
              <div className="space-y-3">
                {skills.length === 0 && !showAddSkill && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No skills added yet. Click &quot;Add Skill&quot; to get started.
                  </p>
                )}
                {skills.map((skill) => (
                  <div key={skill.id} className="p-4 border rounded-lg">
                    {editingSkillId === skill.id ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Edit Skill</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingSkillId(null)
                              setEditingSkill({ skillName: "", level: 5 })
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="editSkillName">Skill Name *</Label>
                            <Input
                              id="editSkillName"
                              value={editingSkill.skillName}
                              onChange={(e) => setEditingSkill({ ...editingSkill, skillName: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="editSkillLevel">Level (1-10) *</Label>
                            <Input
                              id="editSkillLevel"
                              type="number"
                              min="1"
                              max="10"
                              value={editingSkill.level}
                              onChange={(e) => setEditingSkill({ ...editingSkill, level: parseInt(e.target.value) || 5 })}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleUpdateSkill} size="sm">
                            Update Skill
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingSkillId(null)
                              setEditingSkill({ skillName: "", level: 5 })
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{skill.skillName}</p>
                          <p className="text-sm text-muted-foreground">Level: {skill.level}/10</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSkill(skill)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSkill(skill.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Work Experience</CardTitle>
                  <CardDescription>Add your professional work experience</CardDescription>
                </div>
                {!showAddExperience && !editingExperienceId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddExperience(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Experience
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Experience Form */}
              {showAddExperience && !editingExperienceId && (
                <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Add New Experience</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddExperience(false)
                        setNewExperience({
                          jobTitle: "",
                          company: "",
                          location: "",
                          startDate: "",
                          endDate: "",
                          isCurrent: false
                        })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="newJobTitle">Job Title *</Label>
                      <Input
                        id="newJobTitle"
                        value={newExperience.jobTitle}
                        onChange={(e) => setNewExperience({ ...newExperience, jobTitle: e.target.value })}
                        placeholder="e.g., Software Engineer"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newCompany">Company</Label>
                        <Input
                          id="newCompany"
                          value={newExperience.company}
                          onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })}
                          placeholder="Company name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newLocation">Location</Label>
                        <Input
                          id="newLocation"
                          value={newExperience.location}
                          onChange={(e) => setNewExperience({ ...newExperience, location: e.target.value })}
                          placeholder="City, Country"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newStartDate">Start Date</Label>
                        <Input
                          id="newStartDate"
                          type="month"
                          value={newExperience.startDate}
                          onChange={(e) => setNewExperience({ ...newExperience, startDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="newEndDate">End Date</Label>
                        <Input
                          id="newEndDate"
                          type="month"
                          value={newExperience.endDate}
                          onChange={(e) => setNewExperience({ ...newExperience, endDate: e.target.value })}
                          disabled={newExperience.isCurrent}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="newIsCurrent"
                        checked={newExperience.isCurrent}
                        onChange={(e) => {
                          setNewExperience({ ...newExperience, isCurrent: e.target.checked, endDate: "" })
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="newIsCurrent" className="cursor-pointer">
                        I currently work here
                      </Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddExperience} size="sm">
                      Add Experience
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddExperience(false)
                        setNewExperience({
                          jobTitle: "",
                          company: "",
                          location: "",
                          startDate: "",
                          endDate: "",
                          isCurrent: false
                        })
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Experiences List */}
              <div className="space-y-3">
                {experiences.length === 0 && !showAddExperience && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No experience added yet. Click &quot;Add Experience&quot; to get started.
                  </p>
                )}
                {experiences.map((exp) => (
                  <div key={exp.id} className="p-4 border rounded-lg">
                    {editingExperienceId === exp.id ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Edit Experience</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingExperienceId(null)
                              setEditingExperience({
                                jobTitle: "",
                                company: "",
                                location: "",
                                startDate: "",
                                endDate: "",
                                isCurrent: false
                              })
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="editJobTitle">Job Title *</Label>
                            <Input
                              id="editJobTitle"
                              value={editingExperience.jobTitle}
                              onChange={(e) => setEditingExperience({ ...editingExperience, jobTitle: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="editCompany">Company</Label>
                              <Input
                                id="editCompany"
                                value={editingExperience.company}
                                onChange={(e) => setEditingExperience({ ...editingExperience, company: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="editLocation">Location</Label>
                              <Input
                                id="editLocation"
                                value={editingExperience.location}
                                onChange={(e) => setEditingExperience({ ...editingExperience, location: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="editStartDate">Start Date</Label>
                              <Input
                                id="editStartDate"
                                type="month"
                                value={editingExperience.startDate}
                                onChange={(e) => setEditingExperience({ ...editingExperience, startDate: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="editEndDate">End Date</Label>
                              <Input
                                id="editEndDate"
                                type="month"
                                value={editingExperience.endDate}
                                onChange={(e) => setEditingExperience({ ...editingExperience, endDate: e.target.value })}
                                disabled={editingExperience.isCurrent}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="editIsCurrent"
                              checked={editingExperience.isCurrent}
                              onChange={(e) => {
                                setEditingExperience({ ...editingExperience, isCurrent: e.target.checked, endDate: "" })
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="editIsCurrent" className="cursor-pointer">
                              I currently work here
                            </Label>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleUpdateExperience} size="sm">
                            Update Experience
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingExperienceId(null)
                              setEditingExperience({
                                jobTitle: "",
                                company: "",
                                location: "",
                                startDate: "",
                                endDate: "",
                                isCurrent: false
                              })
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{exp.jobTitle}</p>
                          {exp.company && (
                            <p className="text-sm text-muted-foreground">{exp.company}</p>
                          )}
                          {exp.location && (
                            <p className="text-sm text-muted-foreground">{exp.location}</p>
                          )}
                          {(exp.startDate || exp.endDate) && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {exp.startDate || "N/A"} - {exp.isCurrent ? "Present" : (exp.endDate || "N/A")}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditExperience(exp)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExperience(exp.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Job Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Job Preferences</CardTitle>
              <CardDescription>What you&quot;re looking for in your next role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="firstPriority">First Priority</Label>
                <Input
                  id="firstPriority"
                  value={firstPriority}
                  onChange={(e) => setFirstPriority(e.target.value)}
                  placeholder="e.g., Career growth, Work-life balance"
                />
              </div>
              <div>
                <Label htmlFor="secondPriority">Second Priority</Label>
                <Input
                  id="secondPriority"
                  value={secondPriority}
                  onChange={(e) => setSecondPriority(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="thirdPriority">Third Priority</Label>
                <Input
                  id="thirdPriority"
                  value={thirdPriority}
                  onChange={(e) => setThirdPriority(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Describe your job preferences and career goals"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href="/candidate/profile">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

