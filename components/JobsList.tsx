"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Briefcase, MapPin, Calendar, Users } from "lucide-react"
import Link from "next/link"

interface JobLocation {
  city: string
  country: string
}

interface Job {
  id: string
  title: string
  company: string
  description?: string
  city?: string
  country?: string
  locations?: JobLocation[]
  shortDescription: string;
  employmentType: string
  postFrom: Date
  postTo: Date
  skills: string[]
  minimumEducation?: string
  createdBy: string
  applicationCount: number
}

export function JobsList({ jobs }: { jobs: Job[] }) {

  return (
    <div className="space-y-4">
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No jobs available</h3>
              <p className="text-muted-foreground">
                Check back later for new opportunities
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        jobs.map((job) => (
          <Card key={job.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{job.title}</CardTitle>
                  <CardDescription className="text-lg">{job.company}</CardDescription>
                </div>
                <Badge variant="secondary">{job.employmentType}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {job.shortDescription && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {job.shortDescription }
                </p>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {job.locations && job.locations.length > 0 ? (
                  job.locations.slice(0, 3).map((loc, idx) => (
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
                  Until {new Date(job.postTo).toLocaleDateString()}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {job.applicationCount} applications
                </Badge>
              </div>

              {job.skills.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Required Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.slice(0, 5).map((skill, idx) => (
                      <Badge key={idx} variant="secondary">{skill}</Badge>
                    ))}
                    {job.skills.length > 5 && (
                      <Badge variant="secondary">+{job.skills.length - 5} more</Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Posted by {job.createdBy}
                </p>
                <Link href={`/jobs/${job.id}`}>
                  <Button>View Details</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

