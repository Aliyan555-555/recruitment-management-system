"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, Save, Upload, FileText } from "lucide-react"
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
  level: number
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

  // Skills State
  const [skills, setSkills] = useState<Skill[]>(user.skills)
  const [newSkillName, setNewSkillName] = useState("")
  const [newSkillLevel, setNewSkillLevel] = useState("5")

  // CV State
  const [cvs, setCvs] = useState<CV[]>(user.cvs)
  const [cvUploading, setCvUploading] = useState(false)

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
    setLoading(true)
    try {
      const response = await fetch("/api/profile/education", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          degreeTitle: "New Degree",
          educationLevelId: "1"
        })
      })

      if (response.ok) {
        const newEdu = await response.json()
        setEducations([...educations, newEdu])
      }
    } catch (error) {
      console.error("Error adding education:", error)
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
          level: parseInt(newSkillLevel)
        })
      })

      if (response.ok) {
        const newSkill = await response.json()
        setSkills([...skills, newSkill])
        setNewSkillName("")
        setNewSkillLevel("5")
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

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB")
      return
    }

    setCvUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/profile/cv", {
        method: "POST",
        body: formData
      })

      if (response.ok) {
        const newCv = await response.json()
        setCvs([newCv, ...cvs])
      }
    } catch (error) {
      console.error("Error uploading CV:", error)
    } finally {
      setCvUploading(false)
    }
  }

  const handleDeleteCv = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/profile/cv/${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        setCvs(cvs.filter(c => c.id !== id))
      }
    } catch (error) {
      console.error("Error deleting CV:", error)
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
          <CardDescription>Add your educational qualifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {educations.map((edu) => (
            <Card key={edu.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold">{edu.degreeTitle}</h4>
                    {edu.educationLevel && (
                      <Badge variant="secondary">{edu.educationLevel.name}</Badge>
                    )}
                    {edu.institute && <p className="text-sm text-muted-foreground">{edu.institute}</p>}
                    {edu.majorSubject && <p className="text-sm text-muted-foreground">{edu.majorSubject}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteEducation(edu.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button onClick={handleAddEducation} disabled={loading} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Education
          </Button>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
          <CardDescription>Showcase your professional skills</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Skill name (e.g., JavaScript)"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddSkill()}
            />
            <Select value={newSkillLevel} onValueChange={setNewSkillLevel}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Beginner</SelectItem>
                <SelectItem value="3">Intermediate</SelectItem>
                <SelectItem value="5">Advanced</SelectItem>
                <SelectItem value="7">Expert</SelectItem>
                <SelectItem value="10">Master</SelectItem>
              </SelectContent>
            </Select>
              <Button onClick={handleAddSkill} disabled={loading}>
                <Plus className="h-4 w-4" />
              </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge key={skill.id} variant="secondary" className="flex items-center gap-2 px-3 py-1">
                <span>{skill.skillName}</span>
                <span className="text-xs">({skill.level}/10)</span>
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

      {/* CV/Resume */}
      <Card>
        <CardHeader>
          <CardTitle>CV/Resume</CardTitle>
          <CardDescription>Upload and manage your resumes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <Label htmlFor="cv-upload" className="cursor-pointer">
                  <Button asChild>
                    <span>Upload CV</span>
                  </Button>
                  <input
                    id="cv-upload"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleCvUpload}
                    disabled={cvUploading}
                  />
                </Label>
                <p className="text-xs text-muted-foreground mt-2">
                  PDF, DOC, or DOCX (Max 5MB)
                </p>
              </div>
            </div>
          </div>

          {cvs.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Your CVs:</h4>
              {cvs.map((cv) => (
                <div key={cv.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">{cv.filename}</span>
                    <Badge variant="outline">{cv.status}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCv(cv.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

