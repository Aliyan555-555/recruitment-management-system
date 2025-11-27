"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Briefcase, Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams?.get("jobId")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
        setIsLoading(false)
        return
      }

      // Wait a moment for session to be available, then get user role
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Get the user's role from session to redirect appropriately
      try {
        const response = await fetch("/api/auth/session")
        const session = await response.json()
        const userRole = session?.user?.role

        // If jobId is provided and user is a candidate, auto-apply to the job
        if (jobId && userRole === "CANDIDATE") {
          try {
            // Fetch user's CVs
            const cvResponse = await fetch("/api/profile/cv")
            if (cvResponse.ok) {
              const cvData = await cvResponse.json()
              const cvs = cvData.cvs || []
              
              if (cvs.length > 0) {
                // Use the first CV to apply
                const firstCvId = cvs[0].id
                
                // Apply to the job
                const applyResponse = await fetch(`/api/jobs/${jobId}/apply`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ cvId: firstCvId })
                })
                
                if (applyResponse.ok) {
                  // Redirect to job page to see the application
                  router.push(`/jobs/${jobId}`)
                  router.refresh()
                  setIsLoading(false)
                  return
                } else {
                  // If application fails, still redirect to job page
                  // The error will be shown on the job page
                  const errorData = await applyResponse.json().catch(() => ({}))
                  console.error("Auto-apply failed:", errorData.error)
                  router.push(`/jobs/${jobId}`)
                  router.refresh()
                  setIsLoading(false)
                  return
                }
              } else {
                // No CVs available, redirect to job page where user can upload one
                router.push(`/jobs/${jobId}`)
                router.refresh()
                setIsLoading(false)
                return
              }
            } else {
              // CV fetch failed, still redirect to job page
              router.push(`/jobs/${jobId}`)
              router.refresh()
              setIsLoading(false)
              return
            }
          } catch (applyError) {
            console.error("Error during auto-apply:", applyError)
            // Redirect to job page even if auto-apply fails
            router.push(`/jobs/${jobId}`)
            router.refresh()
            setIsLoading(false)
            return
          }
        }

        // Redirect based on role (if no jobId or not a candidate)
        if (userRole === "ADMIN") {
          router.push("/admin/dashboard")
        } else if (userRole === "INTERVIEWER") {
          router.push("/interviewer/dashboard")
        } else {
          // CANDIDATE or default
          router.push("/")
        }
        router.refresh()
        setIsLoading(false)
      } catch (err) {
        // If session fetch fails, redirect to home page
        console.error("Error fetching session:", err)
        router.push("/")
        router.refresh()
        setIsLoading(false)
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted px-4">
      <Link href="/" className="absolute top-4 left-4">
        <Button variant="secondary" size="sm" className="flex items-center gap-2 shadow-sm">
          <ArrowLeft className="h-4 w-4" />
          Home
        </Button>
      </Link>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Briefcase className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account to continue</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

