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
        <h2 className="text-2xl font-bold text-gray-900">Interviewers</h2>
      </div>

      {interviewers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No interviewers found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Institution
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Steps
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Candidates
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {interviewers.map((interviewer) => (
                <tr key={interviewer.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {interviewer.firstname} {interviewer.lastname}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{interviewer.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {interviewer.department || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {interviewer.institution || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {interviewer.workload.assignedSteps}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
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

