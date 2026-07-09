"use client"

import { Navbar } from "@/components/Navbar"

export default function CandidateAssessmentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4">{children}</main>
    </div>
  )
}
