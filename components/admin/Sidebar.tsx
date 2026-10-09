"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  Settings,
  Building2,
  ChevronRight,
  LogOut,
  Sparkles,
  UserCog,
  CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard
  },
  {
    href: "/admin/jobs",
    label: "Jobs",
    icon: Briefcase
  },
  {
    href: "/admin/candidates",
    label: "Candidates",
    icon: Users
  },
  {
    href: "/admin/assessments",
    label: "Skill Assessments",
    icon: Sparkles
  },
  {
    href: "/admin/calendar",
    label: "Calendar",
    icon: CalendarDays
  },
  {
    href: "/admin/interviewers",
    label: "Interviewers",
    icon: UserCog
  },
  {
    href: "/admin/users",
    label: "Team",
    icon: Building2
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [orgName, setOrgName] = useState("Admin Dashboard")
  const [orgLogo, setOrgLogo] = useState<string | null>(null)

  useEffect(() => {
    // Only fetch if component is mounted
    let mounted = true

    const fetchOrgData = async () => {
      try {
        const data = await fetch("/api/admin/organization").then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`)
          }
          return res.json()
        })

        if (mounted && data) {
          if (data.name) setOrgName(data.name)
          if (data.logo) setOrgLogo(data.logo)
        }
      } catch (err) {
        // Silently fail - the session check in AdminLayout will handle redirects
        if (mounted) {
          console.debug("Org data fetch failed:", err)
        }
      }
    }

    fetchOrgData()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <aside className="hidden md:flex md:flex-col md:w-72 md:fixed md:inset-y-0 bg-card border-r border-border shadow-xl z-50 transition-colors duration-300">
      {/* Header / Logo Area */}
      <div className="h-20 flex items-center gap-4 px-6 border-b border-border bg-card/50 backdrop-blur-xl">
        {orgLogo ? (
          <img
            src={orgLogo}
            alt="Logo"
            className="w-14 h-14 object-contain p-1"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white">
            <Building2 className="w-5 h-5" />
          </div>
        )}
        <div className="flex flex-col overflow-hidden">
          <span className="text-base font-bold text-foreground tracking-tight truncate">
            {orgName}
          </span>
          <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
            Recruitment
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
        <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Menu
        </p>

        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4 text-primary-foreground/70" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer / Version */}
      <div className="p-4 border-t border-border bg-card/50">
        <div className="bg-muted/50 rounded-xl p-4 flex items-center gap-3 border border-border/50">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Settings className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-foreground">System Status</p>
            <p className="text-[10px] text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Operational
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}


