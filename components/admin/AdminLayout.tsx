"use client"

import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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


