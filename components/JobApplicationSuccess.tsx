"use client"

import { useRouter } from "next/navigation"
import { CheckCircle2, Clock, Mail, Phone, ArrowRight, Calendar, Briefcase, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface ApplicationTimelineStep {
  id: string
  title: string
  description: string
  timeline?: string
}

export interface ApplicationSupportInfo {
  recruiterName?: string
  email?: string
  phone?: string
  responseTime?: string
}

export interface ApplicationQuickAction {
  id: string
  label: string
  action: "login" | "jobs" | "jobDetails" | "custom"
  href?: string
  variant?: "default" | "secondary" | "outline" | "ghost"
  icon?: "track" | "browse" | "details"
}

interface JobApplicationSuccessProps {
  job: {
    id: string
    title: string
    company: string
    jobType?: string
    employmentType?: string
  }
  application: {
    id: string
    appliedAt: string
  }
  candidateName: string
  nextSteps?: ApplicationTimelineStep[]
  supportContacts?: ApplicationSupportInfo
  quickActions?: ApplicationQuickAction[]
  tips?: string[]
}

export function JobApplicationSuccess({
  job,
  application,
  candidateName,
  nextSteps,
  supportContacts,
  quickActions,
  tips
}: JobApplicationSuccessProps) {
  const router = useRouter()

  const fallbackSteps: ApplicationTimelineStep[] = [
    {
      id: "review",
      title: "Application Review",
      description: "Our hiring team reviews your profile and submitted documents.",
      timeline: "1-2 business days"
    },
    {
      id: "screening",
      title: "Initial Screening",
      description: "We schedule a brief call to understand your background and expectations.",
      timeline: "3-5 business days"
    },
    {
      id: "technical",
      title: "Technical Interview",
      description: "Discuss your skills in depth with the interviewing panel.",
      timeline: "1-2 weeks"
    },
    {
      id: "final",
      title: "Final Interview",
      description: "Meet decision makers to understand the team culture and expectations.",
      timeline: "2-3 weeks"
    }
  ]

  const stepsToRender = nextSteps?.length ? nextSteps : fallbackSteps

  const companySlug = job.company?.toLowerCase().replace(/[^a-z0-9]/g, "") || "company"
  const supportInfo: ApplicationSupportInfo = {
    recruiterName: supportContacts?.recruiterName ?? `${job.company} Talent Team`,
    email: supportContacts?.email ?? `careers@${companySlug}.com`,
    phone: supportContacts?.phone ?? "+92 (21) 111-010-010",
    responseTime:
      supportContacts?.responseTime ??
      "We typically respond to applications within 2-3 business days."
  }

  const fallbackTips = [
    `Highlight achievements that relate to the ${job.title} role.`,
    `Review ${job.company}'s mission to align your answers during interviews.`,
    `Have measurable outcomes ready when discussing previous experience.`
  ]

  const tipsToRender = tips?.length ? tips : fallbackTips

  const fallbackActions: ApplicationQuickAction[] = [
    {
      id: "login",
      label: "Sign In to Track Status",
      action: "login",
      variant: "default",
      icon: "track"
    },
    {
      id: "browse",
      label: "Browse More Jobs",
      action: "jobs",
      variant: "outline",
      icon: "browse"
    },
    {
      id: "details",
      label: "View Job Details",
      action: "jobDetails",
      variant: "ghost",
      icon: "details"
    }
  ]

  const quickActionsToRender = quickActions?.length ? quickActions : fallbackActions

  const renderActionIcon = (icon?: ApplicationQuickAction["icon"]) => {
    switch (icon) {
      case "browse":
        return <Compass className="h-4 w-4 mr-2" />
      case "details":
        return <Briefcase className="h-4 w-4 mr-2" />
      case "track":
      default:
        return <ArrowRight className="h-4 w-4 mr-2" />
    }
  }

  const handleQuickAction = (action: ApplicationQuickAction) => {
    switch (action.action) {
      case "login":
        router.push(job?.id ? `/login?jobId=${job.id}` : "/login")
        break
      case "jobs":
        router.push(action.href ?? "/jobs")
        break
      case "jobDetails":
        router.push(action.href ?? (job?.id ? `/jobs/${job.id}` : "/jobs"))
        break
      case "custom":
        if (action.href) {
          router.push(action.href)
        }
        break
      default:
        break
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-green-100 rounded-full">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Application Submitted Successfully!
          </h1>
          <p className="text-lg text-muted-foreground">
            Thank you, {candidateName}. Your application for <span className="font-semibold text-foreground">{job.title}</span> at <span className="font-semibold text-foreground">{job.company}</span> has been received.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Application Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Application Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Application Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Application ID</p>
                    <p className="text-lg font-mono">{application.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Submitted On</p>
                    <p className="text-lg">{new Date(application.appliedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Position</p>
                    <p className="text-lg font-semibold">{job.title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Company</p>
                    <p className="text-lg">{job.company}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* What Happens Next */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  What Happens Next
                </CardTitle>
                <CardDescription>
                  Here&apos;s what you can expect during our hiring process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {stepsToRender.map((step, index) => (
                    <div key={step.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                          {index + 1}
                        </div>
                        {index < stepsToRender.length - 1 && (
                          <div className="h-12 w-px bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <h4 className="font-semibold text-foreground">{step.title}</h4>
                        <p className="text-sm text-muted-foreground mb-1">{step.description}</p>
                        {step.timeline && (
                          <p className="text-xs text-primary font-medium">{step.timeline}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickActionsToRender.map((action) => (
                  <Button
                    key={action.id}
                    variant={action.variant}
                    onClick={() => handleQuickAction(action)}
                    className="w-full"
                    size="lg"
                  >
                    {renderActionIcon(action.icon)}
                    {action.label}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
                <CardDescription>
                  Contact {supportInfo.recruiterName || "our recruitment team"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {supportInfo.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{supportInfo.email}</p>
                    </div>
                  </div>
                )}

                {supportInfo.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{supportInfo.phone}</p>
                    </div>
                  </div>
                )}

                {supportInfo.responseTime && (
                  <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium mb-1">Response Time:</p>
                    <p>{supportInfo.responseTime}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pro Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {tipsToRender.map((tip, index) => (
                  <p key={index}>• {tip}</p>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
