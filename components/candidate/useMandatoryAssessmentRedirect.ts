"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export async function fetchMandatoryRedirectPath(
  fallback = "/"
): Promise<string> {
  try {
    const res = await fetch("/api/assessments/mandatory/status")
    if (!res.ok) return fallback

    const data = await res.json()
    if (data.required) {
      return "/candidate/assessments/required"
    }

    return fallback
  } catch {
    return fallback
  }
}

export function useMandatoryAssessmentRedirect(enabled = true) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!enabled || status !== "authenticated" || session?.user?.role !== "CANDIDATE") {
      return
    }

    let cancelled = false

    fetchMandatoryRedirectPath().then((path) => {
      if (!cancelled && path === "/candidate/assessments/required") {
        router.replace(path)
      }
    })

    return () => {
      cancelled = true
    }
  }, [enabled, status, session, router])
}

export function MandatoryAssessmentRedirect() {
  useMandatoryAssessmentRedirect()
  return null
}
