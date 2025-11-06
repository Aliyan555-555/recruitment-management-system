"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Navbar } from "@/components/Navbar"
import { ProfileForm } from "@/components/ProfileForm"
import { Loader2 } from "lucide-react"

interface User {
  id: string
  username: string
  email: string
  firstname: string
  lastname: string
  phone1?: string | null
  phone2?: string | null
  institution?: string | null
  department?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  educations: Array<{
    id: string
    degreeTitle: string
    educationLevelId: string
    institute?: string | null
    instituteId?: string | null
    majorSubject?: string | null
    grade?: string | null
    passingYear?: string | null
    country?: string | null
    educationLevel?: {
      id: string
      name: string
    } | null
    instituteRef?: {
      id: string
      name: string
    } | null
  }>
  skills: Array<{
    id: string
    skillName: string
    level: number
  }>
  cvs: Array<{
    id: string
    filename: string
    filepath: string
    status: string
  }>
}

export default function ProfilePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status === "authenticated") {
      fetchProfile()
    }
  }, [status, router])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || `Failed to fetch profile: ${response.statusText}`
        )
      }

      const data = await response.json()
      setUser(data.user)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch profile"
      console.error("Error fetching profile:", err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while checking authentication
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground mt-2">
              Complete your profile to improve your job application success
            </p>
          </div>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Error Loading Profile
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchProfile}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground mt-2">
            Complete your profile to improve your job application success
          </p>
        </div>

        <ProfileForm user={user} />
      </main>
    </div>
  )
}
