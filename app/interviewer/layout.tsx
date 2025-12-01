"use client"

import { InterviewerSidebar } from "@/components/interviewer/InterviewerSidebar"
import { InterviewerTopbar } from "@/components/interviewer/InterviewerTopbar"
import { usePathname } from "next/navigation"

export default function InterviewerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNav = pathname === "/interviewer/login"

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

