import Link from "next/link"
import { Card } from "@/components/ui/card"

export default function InterviewerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          <aside className="hidden md:block">
            <Card className="p-4 sticky top-6">
              <div className="mb-5">
                <h1 className="text-lg font-semibold">Interviewer</h1>
                <p className="text-sm text-muted-foreground">Your workspace</p>
              </div>
              <nav className="space-y-1">
                <Link href="/interviewer/dashboard" className="block px-3 py-2 rounded-md hover:bg-gray-100">
                  Overview
                </Link>
                <Link href="/interviewer/assignments" className="block px-3 py-2 rounded-md hover:bg-gray-100">
                  Assignments
                </Link>
              </nav>
            </Card>
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}


