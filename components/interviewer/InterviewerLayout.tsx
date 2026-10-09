"use client"

import { useEffect } from "react"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { CalendarClock, ChevronRight, ClipboardList, LayoutDashboard, LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { NotificationBell } from "@/components/NotificationBell"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/interviewer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/interviewer/interviews", label: "My interviews", icon: ClipboardList },
  { href: "/interviewer/availability", label: "Availability", icon: CalendarClock },
]

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 dark:bg-slate-950">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export default function InterviewerLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const role = session?.user?.role

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(pathname || "/interviewer/dashboard")}`)
    } else if (status === "authenticated" && role !== "INTERVIEWER") {
      router.replace("/unauthorized")
    }
  }, [status, role, router, pathname])

  if (status === "loading") return <Spinner label="Loading..." />
  if (status === "unauthenticated" || role !== "INTERVIEWER") return <Spinner label="Redirecting..." />

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`)
  const name = session?.user?.name || "Interviewer"

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-slate-950">
      <aside className="fixed inset-y-0 z-40 hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold">Interviewer</p>
            <p className="text-xs text-muted-foreground">Portal</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                isActive(item.href) ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                {item.label}
              </span>
              {isActive(item.href) && <ChevronRight className="h-4 w-4 opacity-70" />}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-8">
          <p className="text-sm font-semibold md:hidden">Interviewer Portal</p>
          <p className="hidden text-sm text-muted-foreground md:block">Signed in as {name}</p>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ModeToggle />
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary">{name[0]}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" aria-label="Log out" onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-background px-4 py-2 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                isActive(item.href) ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="mx-auto max-w-5xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
