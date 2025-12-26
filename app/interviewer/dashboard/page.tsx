"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Settings, User } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function InterviewerDashboard() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Interviewer Dashboard</h2>
        <p className="text-muted-foreground mt-2">
          Welcome to your interviewer workspace
        </p>
      </div>

      {/* Notice Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <CardTitle className="text-lg">Interviewer Features Coming Soon</CardTitle>
              <CardDescription className="mt-2">
                The interviewer workflow is currently being redesigned to provide you with a better experience.
                Advanced features such as interview assignments, candidate evaluations, and scheduling will be
                available in the next update.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Role: Interviewer</p>
                <p className="text-xs text-muted-foreground">
                  Your interviewer profile is active and ready for future assignments
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Account Settings</p>
                <p className="text-xs text-muted-foreground">
                  You can update your profile information and preferences at any time
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Get in touch with the administration team</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            If you have any questions about the upcoming interviewer features or need assistance,
            please contact your system administrator.
          </p>
          <Link href="/profile">
            <Button variant="outline">
              <User className="mr-2 h-4 w-4" />
              View Profile
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
