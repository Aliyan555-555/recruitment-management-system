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
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Assignments</h2>
        <p className="text-muted-foreground">All steps assigned to you</p>
      </div>

      <Card className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Job</th>
              <th className="text-left p-3">Candidate</th>
              <th className="text-left p-3">Step</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a: any, idx: number) => (
              <tr key={a.id} className={idx === 0 ? "" : "border-t"}>
                <td className="p-3 font-medium">{a.pipeline.job.title}</td>
                <td className="p-3">{a.pipeline.candidate.name}</td>
                <td className="p-3">{a.workflowStep.stepName} (#{a.stepOrder})</td>
                <td className="p-3">
                  <Badge variant="outline">{a.status}</Badge>
                </td>
                <td className="p-3 text-right">
                  <Link href={`/interviewer/assignments/${a.id}`} className="text-primary hover:underline">Open</Link>
                </td>
              </tr>
            ))}
            {assignments.length === 0 && (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={5}>No assignments.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}


