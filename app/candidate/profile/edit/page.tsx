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
import { Loader2, Save, ArrowLeft, CheckCircle2 } from "lucide-react"
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
    } catch (err: any) {
      setError(err.message || "Failed to load profile")
    } finally {
      setLoading(false)
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

