"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Save, Upload, FileText, Edit2, X } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Education {
  id: string
  degreeTitle: string
  educationLevelId: string
  institute?: string
  instituteId?: string
  majorSubject?: string
  grade?: string
  passingYear?: string
  country?: string
  educationLevel?: { name: string }
}

interface Skill {
  id: string
  skillName: string
}

interface CV {
  id: string
  filename: string
  filepath: string
  status: string
}

interface User {
  id: string
  username: string
  firstname: string
  lastname: string
  email: string
  phone1?: string
  phone2?: string
  institution?: string
  department?: string
  address?: string
  city?: string
  country?: string
  educations: Education[]
  skills: Skill[]
  cvs: CV[]
}

export function ProfileForm({ user }: { user: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Basic Info State
  const [firstName, setFirstName] = useState(user.firstname || "")
  const [lastName, setLastName] = useState(user.lastname || "")
  const [email, setEmail] = useState(user.email || "")
  const [phone1, setPhone1] = useState(user.phone1 || "")
  const [phone2, setPhone2] = useState(user.phone2 || "")
  const [institution, setInstitution] = useState(user.institution || "")
  const [department, setDepartment] = useState(user.department || "")
  const [address, setAddress] = useState(user.address || "")
  const [city, setCity] = useState(user.city || "")
  const [country, setCountry] = useState(user.country || "")

  // Education State
  const [educations, setEducations] = useState<Education[]>(user.educations)
  const [educationLevels, setEducationLevels] = useState<Array<{ id: string; name: string }>>([])
  const [editingEducationId, setEditingEducationId] = useState<string | null>(null)
  const [newEducation, setNewEducation] = useState<Partial<Education>>({
    degreeTitle: "",
    educationLevelId: "",
    institute: "",
    majorSubject: "",
    grade: "",
    passingYear: "",
    country: ""
  })

  // Skills State
  const [skills, setSkills] = useState<Skill[]>(user.skills)
  const [newSkillName, setNewSkillName] = useState("")

  // CV State
  const [cvs, setCvs] = useState<CV[]>([])
  const [cvUploading, setCvUploading] = useState(false)

  const updateEducationValue = (id: string, changes: Partial<Education>) => {
    setEducations(prev =>
      prev.map((education) =>
        education.id === id ? { ...education, ...changes } : education
      )
    )
  }

  // Load education levels on mount
  useEffect(() => {
    const fetchEducationLevels = async () => {
      try {
        const response = await fetch("/api/profile/education-levels")
        if (response.ok) {
          const data = await response.json()
          setEducationLevels(data.levels || [])
        }
      } catch (error) {
        console.error("Error fetching education levels:", error)
      }
    }
    fetchEducationLevels()
  }, [])

  const handleSaveProfile = async () => {
    setLoading(true)
    setSuccess(false)

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone1: phone1.trim() || "",
          phone2: phone2.trim() || "",
          institution: institution.trim() || "",
          department: department.trim() || "",
          address: address.trim() || "",
          city: city.trim() || "",
          country: country.trim() || ""
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Update local state with saved values
        if (data.user) {
          setFirstName(data.user.firstname || "")
          setLastName(data.user.lastname || "")
          setPhone1(data.user.phone1 || "")
          setPhone2(data.user.phone2 || "")
          setInstitution(data.user.institution || "")
          setDepartment(data.user.department || "")
          setAddress(data.user.address || "")
          setCity(data.user.city || "")
          setCountry(data.user.country || "")
        }
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          router.refresh()
        }, 2000)
      }
    } catch (error) {
      console.error("Error saving profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddEducation = async () => {
    if (!newEducation.degreeTitle || !newEducation.educationLevelId) {
      alert("Please fill in Degree Title and Education Level")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/profile/education", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          degreeTitle: newEducation.degreeTitle.trim(),
          educationLevelId: newEducation.educationLevelId,
          institute: newEducation.institute?.trim() || undefined,
          majorSubject: newEducation.majorSubject?.trim() || undefined,
          grade: newEducation.grade?.trim() || undefined,
          passingYear: newEducation.passingYear?.trim() || undefined,
          country: newEducation.country?.trim() || undefined
        })
      })

      if (response.ok) {
        const newEdu = await response.json()
        setEducations([...educations, newEdu])
        setNewEducation({
          degreeTitle: "",
          educationLevelId: "",
          institute: "",
          majorSubject: "",
          grade: "",
          passingYear: "",
          country: ""
        })
      } else {
        const error = await response.json()
        alert(error.error || "Failed to add education")
      }
    } catch (error) {
      console.error("Error adding education:", error)
      alert("Failed to add education. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEducation = async (id: string, updatedData: Partial<Education>) => {
    if (!updatedData.degreeTitle?.trim() || !updatedData.educationLevelId) {
      alert("Degree Title and Education Level are required")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/profile/education/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          degreeTitle: updatedData.degreeTitle.trim(),
          educationLevelId: updatedData.educationLevelId,
          institute: updatedData.institute?.trim() || undefined,
          majorSubject: updatedData.majorSubject?.trim() || undefined,
          grade: updatedData.grade?.trim() || undefined,
          passingYear: updatedData.passingYear?.trim() || undefined,
          country: updatedData.country?.trim() || undefined
        })
      })

      if (response.ok) {
        const updated = await response.json()
        setEducations(educations.map(edu => edu.id === id ? updated : edu))
        setEditingEducationId(null)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to update education")
      }
    } catch (error) {
      console.error("Error updating education:", error)
      alert("Failed to update education. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEducation = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/profile/education/${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setEducations(educations.filter(e => e.id !== id))
      }
    } catch (error) {
      console.error("Error deleting education:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSkill = async () => {
    if (!newSkillName.trim()) return

    setLoading(true)
    try {
      const response = await fetch("/api/profile/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillName: newSkillName,
        })
      })

      if (response.ok) {
        const newSkill = await response.json()
        setSkills([...skills, newSkill])
        setNewSkillName("")
      }
    } catch (error) {
      console.error("Error adding skill:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSkill = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/profile/skills/${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setSkills(skills.filter(s => s.id !== id))
      }
    } catch (error) {
      console.error("Error deleting skill:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" value={email} disabled />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone1">Phone 1</Label>
              <Input
                id="phone1"
                value={phone1}
                onChange={(e) => setPhone1(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone2">Phone 2</Label>
              <Input
                id="phone2"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="institution">Institution</Label>
              <Input
                id="institution"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Profile"}
          </Button>
          {success && (
            <p className="text-sm text-green-600">Profile saved successfully!</p>
          )}
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <CardTitle>Education</CardTitle>
          <CardDescription>Add and manage your educational qualifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Existing Educations */}
          {educations.map((edu) => (
            <Card key={edu.id} className="border-2">
              <CardContent className="pt-6">
                {editingEducationId === edu.id ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold">Edit Education</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingEducationId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`degree-${edu.id}`}>Degree Title *</Label>
                        <Input
                          id={`degree-${edu.id}`}
                          value={edu.degreeTitle}
                          onChange={(event) =>
                            updateEducationValue(edu.id, { degreeTitle: event.target.value })
                          }
                          placeholder="e.g., Bachelor of Science"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`level-${edu.id}`}>Education Level *</Label>
                        <Select
                          value={edu.educationLevelId}
                          onValueChange={(value) => updateEducationValue(edu.id, { educationLevelId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            {educationLevels.map((level) => (
                              <SelectItem key={level.id} value={level.id}>
                                {level.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`institute-${edu.id}`}>Institution</Label>
                        <Input
                          id={`institute-${edu.id}`}
                          value={edu.institute || ""}
                          onChange={(event) =>
                            updateEducationValue(edu.id, { institute: event.target.value })
                          }
                          placeholder="e.g., Harvard University"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`major-${edu.id}`}>Major/Subject</Label>
                        <Input
                          id={`major-${edu.id}`}
                          value={edu.majorSubject || ""}
                          onChange={(event) =>
                            updateEducationValue(edu.id, { majorSubject: event.target.value })
                          }
                          placeholder="e.g., Computer Science"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`grade-${edu.id}`}>Grade/GPA</Label>
                        <Input
                          id={`grade-${edu.id}`}
                          value={edu.grade || ""}
                          onChange={(event) =>
                            updateEducationValue(edu.id, { grade: event.target.value })
                          }
                          placeholder="e.g., 3.8/4.0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`year-${edu.id}`}>Passing Year</Label>
                        <Input
                          id={`year-${edu.id}`}
                          value={edu.passingYear || ""}
                          onChange={(event) =>
                            updateEducationValue(edu.id, { passingYear: event.target.value })
                          }
                          placeholder="e.g., 2020"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`country-edu-${edu.id}`}>Country</Label>
                        <Input
                          id={`country-edu-${edu.id}`}
                          value={edu.country || ""}
                          onChange={(event) =>
                            updateEducationValue(edu.id, { country: event.target.value })
                          }
                          placeholder="e.g., United States"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => {
                          const currentEducation = educations.find((educationItem) => educationItem.id === edu.id)
                          if (currentEducation) {
                            handleUpdateEducation(edu.id, currentEducation)
                          }
                        }}
                        disabled={loading}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditingEducationId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <h4 className="font-semibold text-lg">{edu.degreeTitle}</h4>
                        {edu.educationLevel && (
                          <Badge variant="secondary">{edu.educationLevel.name}</Badge>
                        )}
                        {edu.institute && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Institution:</span> {edu.institute}
                          </p>
                        )}
                        {edu.majorSubject && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Major:</span> {edu.majorSubject}
                          </p>
                        )}
                        {(edu.grade || edu.passingYear || edu.country) && (
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {edu.grade && <span><span className="font-medium">Grade:</span> {edu.grade}</span>}
                            {edu.passingYear && <span><span className="font-medium">Year:</span> {edu.passingYear}</span>}
                            {edu.country && <span><span className="font-medium">Country:</span> {edu.country}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingEducationId(edu.id)}
                          disabled={loading}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEducation(edu.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Add New Education Form */}
          <Card className="border-dashed border-2">
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-4">Add New Education</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-degree">Degree Title *</Label>
                  <Input
                    id="new-degree"
                    value={newEducation.degreeTitle || ""}
                    onChange={(e) => setNewEducation({ ...newEducation, degreeTitle: e.target.value })}
                    placeholder="e.g., Bachelor of Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-level">Education Level *</Label>
                  <Select
                    value={newEducation.educationLevelId || ""}
                    onValueChange={(value) => setNewEducation({ ...newEducation, educationLevelId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationLevels.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-institute">Institution</Label>
                  <Input
                    id="new-institute"
                    value={newEducation.institute || ""}
                    onChange={(e) => setNewEducation({ ...newEducation, institute: e.target.value })}
                    placeholder="e.g., Harvard University"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-major">Major/Subject</Label>
                  <Input
                    id="new-major"
                    value={newEducation.majorSubject || ""}
                    onChange={(e) => setNewEducation({ ...newEducation, majorSubject: e.target.value })}
                    placeholder="e.g., Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-grade">Grade/GPA</Label>
                  <Input
                    id="new-grade"
                    value={newEducation.grade || ""}
                    onChange={(e) => setNewEducation({ ...newEducation, grade: e.target.value })}
                    placeholder="e.g., 3.8/4.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-year">Passing Year</Label>
                  <Input
                    id="new-year"
                    value={newEducation.passingYear || ""}
                    onChange={(e) => setNewEducation({ ...newEducation, passingYear: e.target.value })}
                    placeholder="e.g., 2020"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-country">Country</Label>
                  <Input
                    id="new-country"
                    value={newEducation.country || ""}
                    onChange={(e) => setNewEducation({ ...newEducation, country: e.target.value })}
                    placeholder="e.g., United States"
                  />
                </div>
              </div>
              <Button 
                onClick={handleAddEducation} 
                disabled={loading || !newEducation.degreeTitle || !newEducation.educationLevelId} 
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Education
              </Button>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
          <CardDescription>Add skills by name — verify proficiency with AI assessments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Skill name (e.g., JavaScript)"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddSkill()}
            />
            <Button onClick={handleAddSkill} disabled={loading}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge key={skill.id} variant="secondary" className="flex items-center gap-2 px-3 py-1">
                <span>{skill.skillName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => handleDeleteSkill(skill.id)}
                  disabled={loading}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Profile-based Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Applications use your Profile</CardTitle>
          <CardDescription>CV uploads are deprecated. We use your profile data (education, experience, skills).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Keep your profile up to date. When you apply, your profile information is sent instead of a CV file.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

