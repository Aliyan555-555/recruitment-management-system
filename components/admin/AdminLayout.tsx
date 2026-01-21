"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Redirect to admin login if not authenticated
    if (status === "unauthenticated") {
      const currentPath = window.location.pathname
      router.push(`/admin/login?callbackUrl=${encodeURIComponent(currentPath)}`)
    }

    // Check if user has admin role
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/unauthorized")
    }
  }, [status, session, router])

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 dark:bg-slate-950">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render admin layout if not authenticated
  if (status === "unauthenticated") {
    return null
  }

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-slate-950">
      <Sidebar />
      <div className="md:pl-72 transition-all duration-300">
        <Topbar />
        <main className="p-6 md:p-8 max-w-[1920px] mx-auto animate-in fade-in duration-500">
          {children}
        </main>
      </div>
    </div>
  )
}


