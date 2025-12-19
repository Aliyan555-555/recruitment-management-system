"use client"

import { useEffect, useState } from "react"

interface Interviewer {
  id: string
  firstname: string
  lastname: string
  email: string
  phone1: string
  department: string
  institution: string
  workload: {
    assignedSteps: number
    activeCandidates: number
  }
}

export default function AdminInterviewersPage() {
  const [interviewers, setInterviewers] = useState<Interviewer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchInterviewers() {
      try {
        const res = await fetch("/api/admin/interviewers")
        if (res.ok) {
          const data = await res.json()
          setInterviewers(data.interviewers || [])
        }
      } catch (error) {
        console.error("Error fetching interviewers:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchInterviewers()
  }, [])

  if (loading) {
    return <div>Loading interviewers...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Interviewers</h2>
      </div>

      {interviewers.length === 0 ? (
        <div className="bg-card rounded-lg shadow p-8 text-center border border-border">
          <p className="text-muted-foreground">No interviewers found.</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow overflow-hidden border border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Institution
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Assigned Steps
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Active Candidates
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {interviewers.map((interviewer) => (
                <tr key={interviewer.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">
                      {interviewer.firstname} {interviewer.lastname}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-muted-foreground">{interviewer.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-muted-foreground">
                      {interviewer.department || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-muted-foreground">
                      {interviewer.institution || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">
                      {interviewer.workload.assignedSteps}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">
                      {interviewer.workload.activeCandidates}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

