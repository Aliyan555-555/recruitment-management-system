"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Clock, Users, Briefcase, Calendar, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface PublicJobCardProps {
  job: {
    id: string
    title: string
    company: string
    shortDescription: string
    employmentType: string
    employmentShift?: string
    totalPositions?: number
    minimumExperience?: string
    minimumSalary?: string
    locations: Array<{
      city: string
      country: string
    }>
    skills: string[]
    educationRequirements: Array<{
      level: string
      field?: string
      isRequired: boolean
    }>
    applicationCount: number
    postTo: string
    jobType: string
  }
}

export function PublicJobCard({ job }: PublicJobCardProps) {
  const router = useRouter()
  const [isApplying, setIsApplying] = useState(false)

  const handleApply = () => {
    setIsApplying(true)
    // Redirect to registration with job context
    router.push(`/register?jobId=${job.id}`)
  }

  const handleViewDetails = () => {
    router.push(`/jobs/${job.id}`)
  }

  const formatEmploymentType = (type: string) => {
    switch (type) {
      case "Permanent": return "Full-time"
      case "PartTime": return "Part-time"
      case "Contract": return "Contract"
      default: return type
    }
  }

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case "BULK": return "bg-orange-100 text-orange-800"
      default: return "bg-blue-100 text-blue-800"
    }
  }

  const daysLeft = Math.ceil(
    (new Date(job.postTo).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-primary/20 hover:border-l-primary">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-xl group-hover:text-primary transition-colors">
                {job.title}
              </CardTitle>
              {job.jobType === "BULK" && (
                <Badge variant="secondary" className={getJobTypeColor(job.jobType)}>
                  Bulk Hiring
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Building className="h-4 w-4" />
              <CardDescription className="text-base font-medium">
                {job.company}
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {job.locations.length > 0 && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{job.locations[0].city}</span>
                  {job.locations.length > 1 && (
                    <span className="text-xs">+{job.locations.length - 1} more</span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatEmploymentType(job.employmentType)}</span>
              </div>

              {job.totalPositions && job.totalPositions > 1 && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{job.totalPositions} positions</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-right">
            {daysLeft > 0 && (
              <div className="text-sm text-muted-foreground mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                {daysLeft} days left
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              {job.applicationCount} applicants
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Job Description */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {job.shortDescription}
        </p>

        {/* Requirements Preview */}
        <div className="space-y-2">
          {job.minimumExperience && (
            <div className="text-sm">
              <span className="font-medium text-foreground">Experience: </span>
              <span className="text-muted-foreground">{job.minimumExperience}</span>
            </div>
          )}

          {job.educationRequirements.length > 0 && (
            <div className="text-sm">
              <span className="font-medium text-foreground">Education: </span>
              <span className="text-muted-foreground">
                {job.educationRequirements[0].level}
                {job.educationRequirements[0].field && ` in ${job.educationRequirements[0].field}`}
              </span>
            </div>
          )}

        </div>

        {/* Skills */}
        {job.skills.length > 0 && (
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Required Skills:</p>
            <div className="flex flex-wrap gap-1">
              {job.skills.slice(0, 4).map((skill) => (
                <Badge key={skill} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {job.skills.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{job.skills.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleApply}
            disabled={isApplying || daysLeft <= 0}
            className="flex-1"
            size="lg"
          >
            {isApplying ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : daysLeft <= 0 ? (
              "Application Closed"
            ) : (
              <>
                <Briefcase className="h-4 w-4 mr-2" />
                Apply Now
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleViewDetails}
            size="lg"
          >
            View Details
          </Button>
        </div>

        {/* Urgency Indicator */}
        {daysLeft <= 3 && daysLeft > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <p className="text-sm font-medium text-orange-800">
              ⚡ Application deadline in {daysLeft} day{daysLeft !== 1 ? 's' : ''}!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
