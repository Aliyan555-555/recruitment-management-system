"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Job {
  id: string
  title: string
  company: string
  status: boolean
  jobType?: "NORMAL" | "BULK"
  jobStatus?: "ACTIVE" | "ADMIN_SHORTLISTING" | "CLOSED"
  postFrom: string
  postTo: string
  applicationCount?: number
  _count?: {
    applications: number
  }
}

export default function AdminJobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch("/api/jobs")
        if (res.ok) {
          const data = await res.json()
          setJobs(data.jobs || [])
        }
      } catch (error) {
        console.error("Error fetching jobs:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [])

  const handleDelete = async (jobId: string, jobTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${jobTitle}"? This action cannot be undone.`)) {
      return
    }

    setDeletingId(jobId)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        // Remove job from list
        setJobs(jobs.filter(job => job.id !== jobId))
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete job")
      }
    } catch (error) {
      console.error("Error deleting job:", error)
      alert("Failed to delete job. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <div>Loading jobs...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Job Postings</h2>
        <Link
          href="/admin/jobs/create"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create New Job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No jobs posted yet.</p>
          <Link
            href="/admin/jobs/create"
            className="text-blue-600 hover:underline"
          >
            Create your first job posting
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applications
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {job.title}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{job.company}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(job.postFrom).toLocaleDateString()} - {new Date(job.postTo).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {job._count?.applications ?? (job as any).applicationCount ?? 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          job.jobType === "BULK"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {job.jobType === "BULK" ? "Bulk Hiring" : "Normal Hiring"}
                      </span>
                      {job.jobType === "BULK" && job.jobStatus && (
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            job.jobStatus === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : job.jobStatus === "ADMIN_SHORTLISTING"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {job.jobStatus.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        job.status
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {job.status ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/admin/jobs/${job.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/jobs/${job.id}/edit`}
                        className="text-green-600 hover:text-green-900"
                      >
                        Edit
                      </Link>
                      {job.jobType === "BULK" && job.jobStatus === "ADMIN_SHORTLISTING" && (
                        <Link
                          href={`/admin/jobs/${job.id}/shortlist`}
                          className="text-orange-600 hover:text-orange-900"
                        >
                          Shortlist
                        </Link>
                      )}
                      {job.jobType === "BULK" && (
                        <Link
                          href={`/admin/jobs/${job.id}/batches`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Batches
                        </Link>
                      )}
                      <button
                        onClick={() => handleDelete(job.id, job.title)}
                        disabled={deletingId === job.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === job.id ? "Deleting..." : "Delete"}
                      </button>
                      <Link
                        href={`/admin/candidates?jobId=${job.id}`}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        Candidates
                      </Link>
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

