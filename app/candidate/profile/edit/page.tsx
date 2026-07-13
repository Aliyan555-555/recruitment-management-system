"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Trash2, Edit2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import {
  SkillAssessmentStatus,
  SkillAssessmentStatusList,
} from "@/components/candidate/SkillAssessmentActions"
import {
  TITLES,
  RELIGION_OPTIONS,
  NATIONALITY_OPTIONS,
  PAKISTANI_CITIES,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  DEPARTMENT_OPTIONS,
  PASSING_YEAR_OPTIONS,
} from "@/lib/countries"
import { formatCnic, formatPakPhone, formatPostalCode } from "@/app/register/utils"
import { NATIONALITY_TO_COUNTRY_CODE, COUNTRY_CODE_TO_NATIONALITY } from "@/lib/nationalityMap"
import {
  normalizeSkillName,
  sanitizeSkillInput,
  SKILL_ERRORS,
  validateAndNormalizeSkillName,
} from "@/lib/skills"

export default function EditProfilePage() {
  const router = useRouter()
  // const { toast } = useToast() // Removed hook
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [educationLevels, setEducationLevels] = useState<Array<{ id: string; name: string }>>([])

  // Personal Info State
  const [title, setTitle] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [fatherName, setFatherName] = useState("")
  const [email, setEmail] = useState("") // Read-only
  const [username, setUsername] = useState("") // Read-only
  const [religion, setReligion] = useState("")
  const [phone1, setPhone1] = useState("")
  const [phone2, setPhone2] = useState("")
  const [nationality, setNationality] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [cnic, setCnic] = useState("")
  const [gender, setGender] = useState("")
  const [maritalStatus, setMaritalStatus] = useState("")
  const [preferredCity, setPreferredCity] = useState("")
  const [homeAddress, setHomeAddress] = useState("")
  const [city, setCity] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [institution, setInstitution] = useState("")
  const [department, setDepartment] = useState("")

  // Education State
  const [educations, setEducations] = useState<Array<{
    id: string
    educationLevelId: string
    educationLevelName?: string
    degreeTitle: string
    institute: string
    majorSubject: string
    grade: string
    passingYear: string
  }>>([])
  const [newEducation, setNewEducation] = useState({
    educationLevelId: "",
    degreeTitle: "",
    institute: "",
    majorSubject: "",
    grade: "",
    passingYear: ""
  })
  const [showAddEducation, setShowAddEducation] = useState(false)
  const [editingEducationId, setEditingEducationId] = useState<string | null>(null)

  // Experience State
  const [experiences, setExperiences] = useState<Array<{
    id: string
    jobTitle: string
    company: string
    location: string
    startDate: string
    endDate: string
    isCurrent: boolean
  }>>([])
  const [newExperience, setNewExperience] = useState({
    jobTitle: "",
    company: "",
    location: "",
    startDate: "",
    endDate: "",
    isCurrent: false
  })
  const [showAddExperience, setShowAddExperience] = useState(false)
  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null)

  // Skills State
  const [skillAssessmentStatuses, setSkillAssessmentStatuses] = useState<SkillAssessmentStatus[]>([])
  const [loadingAssessmentStatuses, setLoadingAssessmentStatuses] = useState(false)
  const [newSkillName, setNewSkillName] = useState("")
  const [showAddSkill, setShowAddSkill] = useState(false)

  // Job Preferences State
  const [firstPriority, setFirstPriority] = useState("")
  const [secondPriority, setSecondPriority] = useState("")
  const [thirdPriority, setThirdPriority] = useState("")
  const [summary, setSummary] = useState("")

  type DegreeOption = { value: string; label: string }

  // Priority Options (Matching Signup)
  const priorityOptions = [
    "IT",
    "Admin",
    "HR",
    "Finance",
    "Operations",
    "Not Applicable",
  ]

  const degreeOptions = useMemo<DegreeOption[]>(() => {
    if (!educationLevels.length) return []
    return educationLevels.map((level) => ({
      value: level.id.toString(),
      label: level.name ?? level.id.toString(),
    }))
  }, [educationLevels])

  useEffect(() => {
    if (!educationLevels.length) return
    if (newEducation.educationLevelId) return
    const firstId = educationLevels[0]?.id?.toString()
    if (firstId) {
      setNewEducation((prev) => ({ ...prev, educationLevelId: firstId }))
    }
  }, [educationLevels, newEducation.educationLevelId])

  const maxDob = useMemo(() => {
    const today = new Date()
    const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
    return eighteenYearsAgo.toISOString().split("T")[0]
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch Education Levels
        const levelsResponse = await fetch("/api/profile/education-levels")
        if (levelsResponse.ok) {
          const data = await levelsResponse.json()
          setEducationLevels(data.levels || [])
        }

        // Fetch Profile
        const profileResponse = await fetch("/api/profile")
        if (!profileResponse.ok) {
          throw new Error("Failed to fetch profile")
        }
        const data = await profileResponse.json()
        const user = data.user

        // Populate Personal Info
        setTitle(user.profileDetails?.title || "")
        setFirstName(user.firstname || "")
        setLastName(user.lastname || "")
        setFatherName(user.profileDetails?.fatherName || "")
        setEmail(user.email || "")
        setUsername(user.username || "")
        setReligion(user.profileDetails?.religion || "")
        setPhone1(user.phone1 || "")
        setPhone2(user.phone2 || "")
        const rawNationality = user.profileDetails?.nationality || ""
        setNationality(COUNTRY_CODE_TO_NATIONALITY[rawNationality] || rawNationality)
        setDateOfBirth(user.profileDetails?.dateOfBirth || "")
        setCnic(user.profileDetails?.cnic || "")
        setGender(user.profileDetails?.gender || "")
        setMaritalStatus(user.profileDetails?.maritalStatus || "")
        setPreferredCity(user.profileDetails?.preferredCity || "")
        setHomeAddress(user.address || "")
        setCity(user.city || "")
        setPostalCode(user.profileDetails?.postalCode || "")
        setInstitution(user.institution || "")
        setDepartment(user.department || "")

        // Populate Education
        if (user.educations) {
          setEducations(user.educations.map((edu: any) => ({
            id: edu.id,
            educationLevelId: edu.educationLevelId?.toString?.() ?? String(edu.educationLevelId ?? ""),
            educationLevelName: edu.educationLevel?.name,
            degreeTitle: edu.degreeTitle,
            institute: edu.institute || "",
            majorSubject: edu.majorSubject || "",
            grade: edu.grade || "",
            passingYear: edu.passingYear || ""
          })))
        }

        // Populate Experience
        if (user.experiences) {
          setExperiences(user.experiences.map((exp: any) => ({
            id: exp.id,
            jobTitle: exp.jobTitle,
            company: exp.company || "",
            location: exp.location || "",
            startDate: exp.startDate || "",
            endDate: exp.endDate || "",
            isCurrent: exp.isCurrent
          })))
        }

        // Skills load via assessment status endpoint
        if (user.jobPreference) {
          setFirstPriority(user.jobPreference.firstPriority || "")
          setSecondPriority(user.jobPreference.secondPriority || "")
          setThirdPriority(user.jobPreference.thirdPriority || "")
          setSummary(user.jobPreference.summary || "")
        }

        const statusRes = await fetch("/api/assessments/skills/status")
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          setSkillAssessmentStatuses(statusData.skills || [])
        }

      } catch (err: any) {
        setError(err.message || "An error occurred")
        toast.error("Error", {
          description: "Failed to load profile data",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const fetchAssessmentStatuses = async () => {
    try {
      setLoadingAssessmentStatuses(true)
      const res = await fetch("/api/assessments/skills/status")
      if (!res.ok) return
      const data = await res.json()
      setSkillAssessmentStatuses(data.skills || [])
    } catch {
      // Non-blocking: skills editing still works without assessment status.
    } finally {
      setLoadingAssessmentStatuses(false)
    }
  }

  useEffect(() => {
    fetchAssessmentStatuses()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const payload = {
        firstName,
        lastName,
        phone1,
        phone2,
        institution,
        department,
        address: homeAddress,
        city,
        country: NATIONALITY_TO_COUNTRY_CODE[nationality] || (nationality.length === 2 ? nationality : undefined),

        profileDetails: {
          title,
          fatherName,
          religion,
          nationality,
          dateOfBirth,
          cnic,
          gender,
          maritalStatus,
          preferredCity,
          postalCode,
        },
        jobPreference: {
          firstPriority,
          secondPriority,
          thirdPriority,
          summary
        }
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save profile")
      }

      setSuccess(true)
      toast.success("Success", {
        description: "Profile updated successfully",
      })
      window.scrollTo(0, 0)
    } catch (err: any) {
      setError(err.message || "Failed to save profile")
      toast.error("Error", {
        description: err.message || "Failed to save profile",
      })
    } finally {
      setSaving(false)
    }
  }

  // --- Education Handlers ---
  const handleAddEducation = async () => {
    if (!educationLevels.length) {
      toast.error("Education levels not loaded", { description: "Please retry after levels load." })
      return
    }
    if (!newEducation.degreeTitle || !newEducation.educationLevelId) {
      toast.error("Validation Error", { description: "Degree title and level are required" })
      return
    }
    try {
      const res = await fetch("/api/profile/education", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEducation)
      })
      if (!res.ok) throw new Error("Failed to add education")
      const edu = await res.json()
      setEducations([edu, ...educations])
      setNewEducation({ educationLevelId: "", degreeTitle: "", institute: "", majorSubject: "", grade: "", passingYear: "" })
      setShowAddEducation(false)
    } catch (err) {
      toast.error("Error", { description: "Failed to add education" })
    }
  }

  const handleDeleteEducation = async (id: string) => {
    if (!confirm("Are you sure?")) return
    try {
      const res = await fetch(`/api/profile/education/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setEducations(educations.filter(e => e.id !== id))
    } catch (err) {
      toast.error("Error", { description: "Failed to delete education" })
    }
  }

  // --- Experience Handlers ---
  const handleAddExperience = async () => {
    if (!newExperience.jobTitle || !newExperience.company) {
      toast.error("Validation Error", { description: "Job title and company are required" })
      return
    }
    try {
      const res = await fetch("/api/profile/experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newExperience)
      })
      if (!res.ok) throw new Error("Failed to add experience")
      const exp = await res.json()
      setExperiences([exp, ...experiences])
      setNewExperience({ jobTitle: "", company: "", location: "", startDate: "", endDate: "", isCurrent: false })
      setShowAddExperience(false)
    } catch (err) {
      toast.error("Error", { description: "Failed to add experience" })
    }
  }

  const handleDeleteExperience = async (id: string) => {
    if (!confirm("Are you sure?")) return
    try {
      const res = await fetch(`/api/profile/experience/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setExperiences(experiences.filter(e => e.id !== id))
    } catch (err) {
      toast.error("Error", { description: "Failed to delete experience" })
    }
  }

  // --- Skills Handlers ---
  const handleAddSkill = async () => {
    const validation = validateAndNormalizeSkillName(newSkillName)
    if (!validation.valid) {
      toast.error("Validation Error", { description: validation.error })
      return
    }

    const isDuplicate = skillAssessmentStatuses.some(
      (skill) => normalizeSkillName(skill.skillName) === validation.normalized,
    )

    if (isDuplicate) {
      toast.error("Validation Error", { description: SKILL_ERRORS.DUPLICATE })
      return
    }

    try {
      const res = await fetch("/api/profile/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName: validation.normalized })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to add skill")
      }
      setNewSkillName("")
      setShowAddSkill(false)
      await fetchAssessmentStatuses()
    } catch (err: any) {
      toast.error("Error", { description: err.message || "Failed to add skill" })
    }
  }

  const handleDeleteSkill = async (userSkillId: string) => {
    try {
      const res = await fetch(`/api/profile/skills/${userSkillId}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete skill")
      }
      await fetchAssessmentStatuses()
    } catch (err: any) {
      toast.error("Error", { description: err.message || "Failed to delete skill" })
    }
  }


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/candidate/profile">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Edit Profile</h1>
      </div>

      <div className="space-y-8">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Select value={title} onValueChange={setTitle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {TITLES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Father Name</Label>
                <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} disabled className="bg-muted" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={username} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Religion</Label>
                <Select value={religion} onValueChange={setReligion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELIGION_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input value={phone1} onChange={(e) => setPhone1(formatPakPhone(e.target.value))} placeholder="03XX-XXXXXXX" />
              </div>
              <div className="space-y-2">
                <Label>Alternative Number</Label>
                <Input value={phone2} onChange={(e) => setPhone2(formatPakPhone(e.target.value))} placeholder="03XX-XXXXXXX" />
              </div>
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Select value={nationality} onValueChange={setNationality}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {NATIONALITY_OPTIONS.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" max={maxDob} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CNIC</Label>
                <Input value={cnic} onChange={(e) => setCnic(formatCnic(e.target.value))} placeholder="#####-#######-#" />
              </div>
              <div className="space-y-2">
                <Label>Preferred City</Label>
                <Select value={preferredCity} onValueChange={setPreferredCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAKISTANI_CITIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Marital Status</Label>
                <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARITAL_STATUS_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Postal Code</Label>
                <Input value={postalCode} onChange={(e) => setPostalCode(formatPostalCode(e.target.value))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Home Address</Label>
              <Textarea value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAKISTANI_CITIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Education */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Education</CardTitle>
              <CardDescription>Manage your educational background.</CardDescription>
            </div>
            {!showAddEducation && (
              <Button size="sm" onClick={() => setShowAddEducation(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Education
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {showAddEducation && (
              <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Degree Level</Label>
                    <Select
                      value={newEducation.educationLevelId}
                      onValueChange={(val) => setNewEducation((prev) => ({ ...prev, educationLevelId: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Level" />
                      </SelectTrigger>
                      <SelectContent>
                        {degreeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Degree Title</Label>
                    <Input value={newEducation.degreeTitle} onChange={e => setNewEducation(prev => ({ ...prev, degreeTitle: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Institute</Label>
                    <Input value={newEducation.institute} onChange={e => setNewEducation(prev => ({ ...prev, institute: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Major Subject</Label>
                    <Input value={newEducation.majorSubject} onChange={e => setNewEducation(prev => ({ ...prev, majorSubject: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Grade / CGPA</Label>
                    <Input value={newEducation.grade} onChange={e => setNewEducation(prev => ({ ...prev, grade: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Passing Year</Label>
                    <Select value={newEducation.passingYear} onValueChange={val => setNewEducation(prev => ({ ...prev, passingYear: val }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {PASSING_YEAR_OPTIONS.map(y => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddEducation}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddEducation(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {educations.map(edu => (
              <div key={edu.id} className="p-4 border rounded-lg flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{edu.degreeTitle}</h4>
                  <p className="text-sm text-muted-foreground">
                    {(edu.educationLevelName ||
                      degreeOptions.find((opt) => opt.value === edu.educationLevelId)?.label ||
                      "Degree level")}{edu.institute ? ` at ${edu.institute}` : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">{edu.majorSubject} • {edu.passingYear}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => handleDeleteEducation(edu.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Experience & Skills */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Work Experience</CardTitle>
              <CardDescription>Add your professional experience.</CardDescription>
            </div>
            {!showAddExperience && (
              <Button size="sm" onClick={() => setShowAddExperience(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Experience
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {showAddExperience && (
              <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input value={newExperience.jobTitle} onChange={e => setNewExperience(prev => ({ ...prev, jobTitle: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input value={newExperience.company} onChange={e => setNewExperience(prev => ({ ...prev, company: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={newExperience.location} onChange={e => setNewExperience(prev => ({ ...prev, location: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={newExperience.startDate} onChange={e => setNewExperience(prev => ({ ...prev, startDate: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" disabled={newExperience.isCurrent} value={newExperience.endDate} onChange={e => setNewExperience(prev => ({ ...prev, endDate: e.target.value }))} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="current" checked={newExperience.isCurrent} onChange={e => setNewExperience(prev => ({ ...prev, isCurrent: e.target.checked }))} />
                  <Label htmlFor="current">I currently work here</Label>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddExperience}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddExperience(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {experiences.map(exp => (
              <div key={exp.id} className="p-4 border rounded-lg flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{exp.jobTitle}</h4>
                  <p className="text-sm text-muted-foreground">{exp.company} • {exp.location}</p>
                  <p className="text-xs text-muted-foreground">{exp.startDate} - {exp.isCurrent ? "Present" : exp.endDate}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => handleDeleteExperience(exp.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Skills</CardTitle>
              <CardDescription>Add your technical skills and verify them with AI assessments.</CardDescription>
            </div>
            {!showAddSkill && (
              <Button size="sm" onClick={() => setShowAddSkill(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Skill
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {showAddSkill && (
              <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="skill-name">Skill Name</Label>
                  <Input
                    id="skill-name"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(sanitizeSkillInput(e.target.value))}
                    placeholder="e.g. REACT, PYTHON, NODE.JS"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddSkill()
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Skills are stored in uppercase without spaces. Proficiency is set after you pass the AI assessment.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddSkill}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddSkill(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <SkillAssessmentStatusList
              skills={skillAssessmentStatuses}
              loading={loadingAssessmentStatuses}
              onDelete={handleDeleteSkill}
            />
          </CardContent>
        </Card>

        {/* Job Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Job Preferences</CardTitle>
            <CardDescription>Set your job priorities.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["First", "Second", "Third"].map((ord, idx) => {
                const val = idx === 0 ? firstPriority : idx === 1 ? secondPriority : thirdPriority
                const setVal = idx === 0 ? setFirstPriority : idx === 1 ? setSecondPriority : setThirdPriority
                return (
                  <div key={idx} className="space-y-2">
                    <Label>{ord} Priority</Label>
                    <Select value={val} onValueChange={setVal}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
            </div>
            <div className="space-y-2">
              <Label>Summary</Label>
              <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Share details about your ideal role." />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.push("/candidate/profile")}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
