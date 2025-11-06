"use client"

import { InterviewerSidebar } from "@/components/interviewer/InterviewerSidebar"
import { InterviewerTopbar } from "@/components/interviewer/InterviewerTopbar"

export default function InterviewerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <InterviewerSidebar />
      <div className="md:pl-64">
        <InterviewerTopbar />
        <main className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


