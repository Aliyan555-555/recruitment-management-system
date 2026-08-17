"use client"

import { useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"

const SESSION_LOADING_TIMEOUT_MS = 15000 // 15 seconds - if session stays "loading", treat as failed

const PROTECTED_PREFIXES = ["/candidate", "/profile", "/applications", "/admin"]

function isProtectedPath(pathname: string | null): boolean {
  if (!pathname) return false
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

/**
 * Prevents white screen when /api/auth/session fails or hangs (e.g. after idle, network error).
 * On protected routes, if session status stays "loading" for too long, redirects to login.
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const loadingStartedAt = useRef<number | null>(null)

  useEffect(() => {
    if (status === "loading") {
      if (loadingStartedAt.current === null) {
        loadingStartedAt.current = Date.now()
      }
      return
    }

    loadingStartedAt.current = null
  }, [status])

  useEffect(() => {
    if (status !== "loading" || !isProtectedPath(pathname)) return

    const timer = setTimeout(() => {
      const started = loadingStartedAt.current
      if (started === null) return
      const elapsed = Date.now() - started
      if (elapsed >= SESSION_LOADING_TIMEOUT_MS) {
        loadingStartedAt.current = null
        const callback = encodeURIComponent(pathname || "/")
        const loginUrl = pathname?.startsWith("/admin")
          ? `/admin/login?error=SessionExpired&callbackUrl=${callback}`
          : `/login?error=SessionExpired&callbackUrl=${callback}`
        router.replace(loginUrl)
      }
    }, SESSION_LOADING_TIMEOUT_MS)

    return () => clearTimeout(timer)
  }, [status, pathname, router])

  return <>{children}</>
}
