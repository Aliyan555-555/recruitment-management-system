"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface DashboardStats {
  totalJobs: number
  activeCandidates: number
  pendingInterviews: number
  completionRate: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeCandidates: 0,
    pendingInterviews: 0,
    completionRate: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        // In a real implementation, create an API endpoint for these stats
        // For now, using placeholder data
        setStats({
          totalJobs: 1,
          activeCandidates: 0,
          pendingInterviews: 0,
          completionRate: 0,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  const StatCard = ({ title, value, description, href }: {
    title: string
    value: string | number
    description: string
    href?: string
  }) => (
    <Link href={href || "#"} className="block">
      <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
    </Link>
  )

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Jobs"
          value={stats.totalJobs}
          description="Active job postings"
          href="/admin/jobs"
        />
        <StatCard
          title="Active Candidates"
          value={stats.activeCandidates}
          description="Candidates in pipeline"
          href="/admin/candidates"
        />
        <StatCard
          title="Pending Interviews"
          value={stats.pendingInterviews}
          description="Awaiting interviewer feedback"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          description="Successful applications"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Candidates */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Candidates
          </h3>
          <p className="text-gray-500 text-sm">
            No candidates yet. 
            <Link href="/admin/jobs" className="text-blue-600 hover:underline ml-1">
              Create a job posting
            </Link>
          </p>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <Link
              href="/admin/jobs/create"
              className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-center"
            >
              Create New Job
            </Link>
            <Link
              href="/admin/candidates"
              className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-center"
            >
              Manage Candidates
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

