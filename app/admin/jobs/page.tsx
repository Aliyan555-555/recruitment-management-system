"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"

interface WorkflowStep {
  id: string
  name: string
  type: string
  order: number
}

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
  workflow?: {
    id: string
    steps: WorkflowStep[]
  }
  roundCounts?: {
    [key: string]: {
      shortlisted: number
      unshortlisted: number
    }
  }
}

export default function AdminJobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch("/api/jobs")
        if (res.ok) {
          const data = await res.json()
          setJobs(data.jobs || [])
        } else {
          setStatusMessage({ type: "error", message: "Failed to load jobs. Please refresh the page." })
        }
      } catch (error) {
        console.error("Error fetching jobs:", error)
        setStatusMessage({ type: "error", message: "An error occurred while loading jobs." })
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && menuRefs.current[openMenuId]) {
        const menuElement = menuRefs.current[openMenuId]
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setOpenMenuId(null)
        }
      }
    }

    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [openMenuId])

  const handleDelete = async (job: Job) => {
    const appCount = job._count?.applications ?? job.applicationCount ?? 0
    const confirmMessage = appCount > 0
      ? `Delete "${job.title}"? This job has ${appCount} application(s). The job and all applications, pipeline data, and related records will be permanently deleted. This cannot be undone.`
      : `Are you sure you want to delete "${job.title}"? This action cannot be undone.`
    if (!confirm(confirmMessage)) {
      return
    }

    setDeletingId(job.id)
    setOpenMenuId(null)
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}`, {
        method: "DELETE",
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setJobs(prev => prev.filter(j => j.id !== job.id))
        setStatusMessage({ type: "success", message: `Job "${job.title}" deleted successfully.` })
        setTimeout(() => setStatusMessage(null), 4000)
      } else {
        setStatusMessage({ type: "error", message: data.error || "Failed to delete job" })
        setTimeout(() => setStatusMessage(null), 6000)
      }
    } catch (error) {
      console.error("Error deleting job:", error)
      setStatusMessage({ type: "error", message: "Failed to delete job. Please try again." })
      setTimeout(() => setStatusMessage(null), 6000)
    } finally {
      setDeletingId(null)
    }
  }

  const getStepByType = (job: Job, stepType: string): WorkflowStep | null => {
    if (!job.workflow?.steps) return null
    return job.workflow.steps.find(step => step.type === stepType) || null
  }

  const getStepDisplay = (job: Job, stepType: string): string => {
    const step = getStepByType(job, stepType)
    return step ? step.name : "N/A"
  }

  const columns = useMemo<ColumnDef<Job>[]>(() => [
    {
      id: "index",
      header: "S.No.",
      cell: ({ row, table }) => {
        const pageIndex = table.getState().pagination.pageIndex
        const pageSize = table.getState().pagination.pageSize
        const rowIndex = table.getRowModel().rows.findIndex(r => r.id === row.id)
        return pageIndex * pageSize + rowIndex + 1
      },
      enableSorting: false,
    },
    {
      accessorKey: "title",
      header: "Job Title",
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-sm font-semibold text-foreground">{row.original.title}</div>
      ),
    },
    {
      accessorKey: "postFrom",
      header: "Available From",
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {new Date(row.original.postFrom).toLocaleDateString()}
        </div>
      ),
    },
    {
      accessorKey: "postTo",
      header: "Available To",
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {new Date(row.original.postTo).toLocaleDateString()}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-center">
          <span
            className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${row.original.status
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-destructive/10 text-destructive"
              }`}
          >
            {row.original.status ? "Active" : "Inactive"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "applications",
      header: "No. of Applicants",
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
            {row.original._count?.applications ?? row.original.applicationCount ?? 0}
          </span>
        </div>
      ),
      sortingFn: (rowA, rowB) => {
        const countA = rowA.original._count?.applications ?? rowA.original.applicationCount ?? 0
        const countB = rowB.original._count?.applications ?? rowB.original.applicationCount ?? 0
        return countA - countB
      },
    },
    {
      id: "test",
      header: "Test",
      enableSorting: false,
      cell: ({ row }) => {
        const step = getStepByType(row.original, "TEST")
        const counts = row.original.roundCounts?.["TEST"]

        return (
          <div className="text-center">
            {step ? (
              <Link
                href={`/admin/jobs/${row.original.id}/rounds/${step.id}/applied`}
                className="text-sm text-primary hover:text-primary/80 font-medium hover:underline"
                title={step.name}
              >
                {counts ? (
                  <span className="whitespace-nowrap">
                    <span className="text-emerald-500 font-semibold">{counts.shortlisted}</span>
                    <span className="text-muted-foreground/50 mx-1">/</span>
                    <span className="text-muted-foreground">{counts.unshortlisted}</span>
                  </span>
                ) : (
                  step.name
                )}
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground/50">N/A</span>
            )}
          </div>
        )
      },
    },
    {
      id: "screening",
      header: "Screening",
      enableSorting: false,
      cell: ({ row }) => {
        const step = getStepByType(row.original, "SCREENING_INTERVIEW")
        const counts = row.original.roundCounts?.["SCREENING_INTERVIEW"]

        return (
          <div className="text-center">
            {step ? (
              <Link
                href={`/admin/jobs/${row.original.id}/rounds/${step.id}/applied`}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                title={step.name}
              >
                {counts ? (
                  <span className="whitespace-nowrap">
                    <span className="text-green-600 font-semibold">{counts.shortlisted}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-gray-600">{counts.unshortlisted}</span>
                  </span>
                ) : (
                  step.name
                )}
              </Link>
            ) : (
              <span className="text-sm text-gray-400">N/A</span>
            )}
          </div>
        )
      },
    },
    {
      id: "focusGroup",
      header: "Focus Group",
      enableSorting: false,
      cell: ({ row }) => {
        const step = getStepByType(row.original, "FOCUS_GROUP")
        const counts = row.original.roundCounts?.["FOCUS_GROUP"]

        return (
          <div className="text-center">
            {step ? (
              <Link
                href={`/admin/jobs/${row.original.id}/rounds/${step.id}/applied`}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                title={step.name}
              >
                {counts ? (
                  <span className="whitespace-nowrap">
                    <span className="text-green-600 font-semibold">{counts.shortlisted}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-gray-600">{counts.unshortlisted}</span>
                  </span>
                ) : (
                  step.name
                )}
              </Link>
            ) : (
              <span className="text-sm text-gray-400">N/A</span>
            )}
          </div>
        )
      },
    },
    {
      id: "finalInterview",
      header: "Final Interview",
      enableSorting: false,
      cell: ({ row }) => {
        const step = getStepByType(row.original, "FINAL_INTERVIEW")
        const counts = row.original.roundCounts?.["FINAL_INTERVIEW"]

        return (
          <div className="text-center">
            {step ? (
              <Link
                href={`/admin/jobs/${row.original.id}/rounds/${step.id}/applied`}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                title={step.name}
              >
                {counts ? (
                  <span className="whitespace-nowrap">
                    <span className="text-green-600 font-semibold">{counts.shortlisted}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-gray-600">{counts.unshortlisted}</span>
                  </span>
                ) : (
                  step.name
                )}
              </Link>
            ) : (
              <span className="text-sm text-gray-400">N/A</span>
            )}
          </div>
        )
      },
    },
    {
      id: "offered",
      header: "Offered",
      enableSorting: false,
      cell: ({ row }) => {
        const step = getStepByType(row.original, "OFFER")
        const counts = row.original.roundCounts?.["OFFER"]

        return (
          <div className="text-center">
            {step ? (
              <Link
                href={`/admin/jobs/${row.original.id}/rounds/${step.id}/applied`}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                title={step.name}
              >
                {counts ? (
                  <span className="whitespace-nowrap">
                    <span className="text-green-600 font-semibold">{counts.shortlisted}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-gray-600">{counts.unshortlisted}</span>
                  </span>
                ) : (
                  step.name
                )}
              </Link>
            ) : (
              <span className="text-sm text-gray-400">N/A</span>
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const job = row.original
        return (
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/admin/jobs/${job.id}`}
              className="inline-flex items-center justify-center p-2 text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg transition-colors"
              title="View Job"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </Link>
            <Link
              href={`/admin/candidates?jobId=${job.id}`}
              className="inline-flex items-center justify-center p-2 text-purple-600 hover:text-purple-600 hover:bg-purple-500/10 rounded-lg transition-colors"
              title="View Candidates"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </Link>
            <div
              className="relative"
              ref={(el) => {
                menuRefs.current[job.id] = el
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenMenuId(prev => (prev === job.id ? null : job.id))
                }}
                className="inline-flex items-center justify-center p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                title="More Actions"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {openMenuId === job.id && (
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-border bg-popover shadow-xl">
                  <div className="py-1">
                    <Link
                      href={`/admin/jobs/${job.id}/edit`}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                      onClick={() => setOpenMenuId(null)}
                    >
                      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="font-medium">Edit Job</span>
                    </Link>
                    {job.jobType === "BULK" && (
                      <>
                        <Link
                          href={`/admin/jobs/${job.id}/shortlist`}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                          onClick={() => setOpenMenuId(null)}
                        >
                          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          <span className="font-medium">Shortlist</span>
                        </Link>
                        <Link
                          href={`/admin/jobs/${job.id}/batches`}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                          onClick={() => setOpenMenuId(null)}
                        >
                          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span className="font-medium">Manage Batches</span>
                        </Link>
                      </>
                    )}
                    <div className="border-t border-border my-1"></div>
                    <button
                      onClick={() => handleDelete(job)}
                      disabled={deletingId === job.id}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="font-medium">
                        {deletingId === job.id ? "Deleting..." : "Delete Job"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      },
    },
  ], [openMenuId, deletingId, menuRefs])

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">Job Management</h1>
          <p className="text-muted-foreground">Manage and monitor all job postings</p>
        </div>
        <Link
          href="/admin/jobs/create"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Job
        </Link>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`mb-6 rounded-lg border p-4 flex items-start gap-3 ${statusMessage.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
            : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}
          role="status"
          aria-live="polite"
        >
          <svg
            className="w-5 h-5 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {statusMessage.type === "success" ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          <div className="flex-1 text-sm">
            <p className="font-semibold">{statusMessage.type === "success" ? "Success" : "Error"}</p>
            <p>{statusMessage.message}</p>
          </div>
          <button
            type="button"
            className="text-current hover:opacity-75"
            onClick={() => setStatusMessage(null)}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Jobs Table */}
      {jobs.length === 0 ? (
        <div className="bg-card rounded-xl shadow-lg border border-border p-12 text-center">
          <svg className="w-16 h-16 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-foreground mb-2">No jobs posted yet</h3>
          <p className="text-muted-foreground mb-6">Get started by creating your first job posting.</p>
          <Link
            href="/admin/jobs/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Job
          </Link>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-lg border border-border p-6">
          <DataTable
            columns={columns}
            data={jobs}
            searchKey="title"
            searchPlaceholder="Search jobs by title..."
          />
        </div>
      )}
    </div>
    // </div >
  )
}
