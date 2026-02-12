"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl = pathname ? encodeURIComponent(pathname) : encodeURIComponent("/admin/dashboard")
      router.replace(`/admin/login?callbackUrl=${callbackUrl}`)
      return
    }
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.replace("/unauthorized")
    }
  }, [status, session?.user?.role, router, pathname])

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

  // While redirecting (unauthenticated or wrong role), show a brief message instead of white screen
  if (status === "unauthenticated" || (status === "authenticated" && session?.user?.role !== "ADMIN")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 dark:bg-slate-950">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
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


