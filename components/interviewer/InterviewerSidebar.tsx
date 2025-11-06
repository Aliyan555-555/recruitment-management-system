"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Briefcase, 
  Calendar, 
  FileText, 
  User,
  Clock
} from "lucide-react"

const navItems = [
  { 
    href: "/interviewer/dashboard", 
    label: "Dashboard", 
    icon: LayoutDashboard 
  },
  { 
    href: "/interviewer/assignments", 
    label: "Assignments", 
    icon: Briefcase 
  },
  { 
    href: "/interviewer/calendar", 
    label: "Calendar", 
    icon: Calendar 
  },
]

export function InterviewerSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white border-r border-gray-200">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow">
          <User className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900">Interviewer</div>
          <div className="text-xs text-gray-600">Recruitment System</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="px-2 space-y-1">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== "/interviewer" && pathname?.startsWith(item.href))
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link 
                  href={item.href} 
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    active 
                      ? "bg-purple-50 text-purple-700 border border-purple-200" 
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? "text-purple-700" : "text-gray-500"}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="p-3 text-xs text-gray-400 border-t">v1.0</div>
    </aside>
  )
}

