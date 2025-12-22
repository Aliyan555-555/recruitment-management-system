"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { InterviewerSidebar } from "@/components/interviewer/InterviewerSidebar"
import { InterviewerTopbar } from "@/components/interviewer/InterviewerTopbar"

export default function InterviewerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const router = useRouter()
  const hideNav = pathname === "/interviewer/login"

  useEffect(() => {
    // Skip redirect on login page
    if (hideNav) return

    // Redirect to login if not authenticated
    if (status === "unauthenticated") {
      router.push("/login")
    }

    // Check if user has interviewer or admin role
    if (status === "authenticated") {
      const role = session?.user?.role
      if (role !== "INTERVIEWER" && role !== "ADMIN") {
        router.push("/unauthorized")
      }
    }
  }, [status, session, router, hideNav])

  // Show loading state while checking authentication
  if (!hideNav && status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render interviewer layout if not authenticated
  if (!hideNav && status === "unauthenticated") {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!hideNav && <InterviewerSidebar />}
      <div className={!hideNav ? "md:pl-64" : ""}>
        {!hideNav && <InterviewerTopbar />}
        <main>
          <div>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


