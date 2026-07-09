"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Loader2 } from "lucide-react"

const ALLOWED_PREFIXES = [
  "/candidate/assessments",
  "/candidate/profile/edit",
]

function isAllowedPath(pathname: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function MandatoryAssessmentGate({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (status === "loading") return

    if (status !== "authenticated" || session?.user?.role !== "CANDIDATE") {
      setChecking(false)
      return
    }

    if (isAllowedPath(pathname)) {
      setChecking(false)
      return
    }

    let cancelled = false

    const verify = async () => {
      try {
        const res = await fetch("/api/assessments/mandatory/status")
        if (!res.ok) {
          if (!cancelled) setChecking(false)
          return
        }

        const data = await res.json()
        if (!cancelled && data.required) {
          router.replace("/candidate/assessments/required")
          return
        }

        if (!cancelled) setChecking(false)
      } catch {
        if (!cancelled) setChecking(false)
      }
    }

    verify()

    return () => {
      cancelled = true
    }
  }, [status, session, pathname, router])

  if (checking && status === "authenticated" && session?.user?.role === "CANDIDATE") {
    if (!isAllowedPath(pathname)) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    }
  }

  return <>{children}</>
}
