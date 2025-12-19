"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Clock, Users, Briefcase, Calendar, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  const daysLeft = Math.ceil(
    (new Date(job.postTo).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <Card className="group relative overflow-hidden border border-border/50 bg-card hover:bg-accent/5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">
                {job.title}
              </CardTitle>
              {job.jobType === "BULK" && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-0">
                  Bulk Hiring
                </Badge>
              )}
              {daysLeft <= 3 && daysLeft > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  Urgent
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-4 w-4 shrink-0" />
              <span className="font-medium text-foreground/80">{job.company}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-md text-xs font-medium">
              <Users className="h-3 w-3" />
              {job.applicationCount} Applied
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* Key Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {job.locations.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-muted-foreground/80">Location</span>
                <span className="font-medium text-foreground line-clamp-1">
                  {job.locations[0].city}
                  {job.locations.length > 1 && ` +${job.locations.length - 1}`}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground/80">Type</span>
              <span className="font-medium text-foreground">{formatEmploymentType(job.employmentType)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground/80">Experience</span>
              <span className="font-medium text-foreground">{job.minimumExperience || "Not specified"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground/80">Deadline</span>
              <span className={`font-medium ${daysLeft <= 3 ? 'text-destructive' : 'text-foreground'}`}>
                {daysLeft > 0 ? `${daysLeft} days left` : 'Closed'}
              </span>
            </div>
          </div>
        </div>

        {/* Skills & Description */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {job.shortDescription}
          </p>

          {job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {job.skills.slice(0, 3).map((skill) => (
                <Badge key={skill} variant="secondary" className="rounded-md font-normal bg-secondary/50 hover:bg-secondary">
                  {skill}
                </Badge>
              ))}
              {job.skills.length > 3 && (
                <span className="text-xs text-muted-foreground self-center px-1">
                  +{job.skills.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border/50 mt-4">
          <Button
            variant="ghost"
            onClick={handleViewDetails}
            size="sm"
            className="hover:bg-secondary transition-colors"
          >
            View Details
          </Button>

          <Button
            onClick={handleApply}
            disabled={isApplying || daysLeft <= 0}
            className="shadow-sm hover:shadow-md transition-all px-6"
            size="sm"
          >
            {isApplying ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : daysLeft <= 0 ? (
              "Closed"
            ) : (
              "Apply Now"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
