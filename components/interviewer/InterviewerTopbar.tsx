"use client"

import { useSession, signOut } from "next-auth/react"
import { User } from "lucide-react"
import { NotificationDropdown } from "./NotificationDropdown"

export function InterviewerTopbar() {
  const { data } = useSession()
  const user = data?.user

  return (
    <header className="h-16 border-b bg-white sticky top-0 z-30">
      <div className="h-full flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="hidden sm:inline">Interviewer Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationDropdown />
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-gray-900">
                {user?.name || user?.username || "Interviewer"}
              </span>
              <span className="text-xs text-gray-500">{user?.email}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="px-3 py-1.5 text-sm rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 transition-colors"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}

