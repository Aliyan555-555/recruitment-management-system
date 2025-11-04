import Link from "next/link"
import { headers, cookies } from "next/headers"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

export default async function Page() {
  const h = headers()
  const proto = h.get("x-forwarded-proto") ?? "http"
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const origin = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || (host ? `${proto}://${host}` : "http://localhost:3000")

  const cookieHeader = cookies().toString()
  const res = await fetch(`${origin}/api/interviewer/assignments`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  })
  const { assignments = [] } = res.ok ? await res.json() : { assignments: [] }

  const pending = assignments.filter((a: any) => a.status === "PENDING")
  const inProgress = assignments.filter((a: any) => a.status === "IN_PROGRESS")
  const completed = assignments.filter((a: any) => a.status === "COMPLETED")

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <p className="text-muted-foreground">Your current interview assignments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Pending</div>
          <div className="text-3xl font-bold mt-1">{pending.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">In Progress</div>
          <div className="text-3xl font-bold mt-1">{inProgress.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Completed</div>
          <div className="text-3xl font-bold mt-1">{completed.length}</div>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Recent assignments</h3>
          <Link href="/interviewer/assignments" className="text-sm text-primary hover:underline">View all</Link>
        </div>

        <div className="grid gap-3">
          {assignments.slice(0, 8).map((a: any) => (
            <Card key={a.id} className="p-4">
              <Link href={`/interviewer/assignments/${a.id}`} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{a.pipeline.job.title}</div>
                  <div className="text-sm text-muted-foreground">{a.pipeline.candidate.name}</div>
                  <div className="text-xs text-muted-foreground">Step {a.stepOrder}: {a.workflowStep.stepName}</div>
                </div>
                <Badge variant="outline">{a.status}</Badge>
              </Link>
            </Card>
          ))}
          {assignments.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground">No assignments yet.</Card>
          )}
        </div>
      </div>
    </div>
  )
}


