"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPin, Calendar, DollarSign, Briefcase, BookOpen, Award, CheckCircle2, Users } from "lucide-react"
import { useRouter } from "next/navigation"

interface JobLocation {
  city: string
  country: string | null
}

interface Job {
  id: string
  title: string
  company: string
  shortDescription: string
  description: string
  city?: string
  country?: string
  locations?: JobLocation[]
  employmentType: string
  employmentShift: string | null
  minimumExperience: string | null
  certification?: string
  minimumSalary?: string
  benefits?: string
  totalPositions?: number
  jobCode?: string
  postFrom: Date
  postTo: Date
  skills: string[]
  minimumEducation?: string
  createdBy: string
  creatorEmail: string
}

interface Application {
  id: string
  status: string
  appliedAt: bigint
  cv: {
    id: string
    filename: string
  }
}

interface UserCv {
  id: string
  filename: string
  filepath: string
}

export function JobDetails({
  job,
  hasApplied,
  application,
  userCvs
}: {
  job: Job
  hasApplied: boolean
  application: Application | null
  userCvs: UserCv[]
}) {
  const router = useRouter()
  const [selectedCv, setSelectedCv] = useState(userCvs[0]?.id || "")
  const [applying, setApplying] = useState(false)

  const handleApply = async () => {
    if (!selectedCv) {
      alert("Please select a CV to apply with")
      return
    }

    setApplying(true)
    try {
      const response = await fetch(`/api/jobs/${job.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId: selectedCv })
      })

      if (response.ok) {
        router.refresh()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to apply")
      }
    } catch (error) {
      console.error("Apply error:", error)
      alert("Failed to submit application")
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
          <p className="text-xl text-muted-foreground mt-2">{job.company}</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {job.employmentType}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {job.locations && job.locations.length > 0 ? (
          job.locations.map((loc, idx) => (
            <Badge key={idx} variant="outline" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {loc.city}, {loc.country}
            </Badge>
          ))
        ) : job.city && job.country ? (
          <Badge variant="outline" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {job.city}, {job.country}
          </Badge>
        ) : null}
        <Badge variant="outline" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Apply by {new Date(job.postTo).toLocaleDateString()}
        </Badge>
        {job.minimumSalary && (
          <Badge variant="outline" className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {job.minimumSalary}
          </Badge>
        )}
      </div>

      {hasApplied && application && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">Application Submitted</h3>
                <p className="text-sm text-green-700">
                  You applied on {new Date(Number(application.appliedAt)).toLocaleDateString()}
                </p>
                <p className="text-sm text-green-700">
                  Status: <Badge>{application.status}</Badge>
                </p>
                <p className="text-sm text-green-700 mt-1">
                  CV used: {application.cv.filename}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      <Card>
        <CardHeader>
          <CardTitle>Job Description</CardTitle>
        </CardHeader>
        <CardContent>
          {job.description ? (
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{job.description}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">No description provided</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {job.minimumEducation && (
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">Minimum Education</p>
                  <p className="text-sm text-muted-foreground">{job.minimumEducation}</p>
                </div>
              </div>
            )}
            {job.minimumExperience && (
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">Experience Required</p>
                  <p className="text-sm text-muted-foreground">{job.minimumExperience}</p>
                </div>
              </div>
            )}
            {job.employmentShift && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">Shift</p>
                  <p className="text-sm text-muted-foreground">{job.employmentShift}</p>
                </div>
              </div>
            )}
            {job.totalPositions && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-semibold">Total Positions</p>
                  <p className="text-sm text-muted-foreground">{job.totalPositions}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {job.skills.length > 0 ? (
                job.skills.map((skill, idx) => (
                  <Badge key={idx} variant="secondary">{skill}</Badge>
                ))
              ) : (
                <p className="text-muted-foreground">No specific skills required</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {job.certification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{job.certification}</p>
          </CardContent>
        </Card>
      )}

      {job.benefits && (
        <Card>
          <CardHeader>
            <CardTitle>Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{job.benefits}</p>
          </CardContent>
        </Card>
      )}

      {!hasApplied && new Date(job.postTo) >= new Date() && (
        <Card>
          <CardHeader>
            <CardTitle>Apply for this Position</CardTitle>
            <CardDescription>Select a CV to apply with</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userCvs.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label>Select CV/Resume</Label>
                  <Select value={selectedCv} onValueChange={setSelectedCv}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {userCvs.map((cv) => (
                        <SelectItem key={cv.id} value={cv.id}>
                          {cv.filename}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleApply} disabled={applying} className="w-full">
                  {applying ? "Submitting..." : "Submit Application"}
                </Button>
              </>
            ) : (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">
                  You need to upload a CV before you can apply
                </p>
                <a href="/profile" className="text-primary hover:underline">
                  Go to profile to upload CV
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Posted by {job.createdBy} on {new Date(job.postFrom).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

