"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
// import AdminLayout  from "@/components/admin/AdminLayout"

interface Batch {
  id: string
  workflowStepId: string
  stepName: string
  stepOrder: number
  batchNumber: number
  batchName: string | null
  status: string
  candidateCount: number
}

interface WorkflowStep {
  id: string
  stepName: string
  stepOrder: number
}

export default function BatchesPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const [batches, setBatches] = useState<Batch[]>([])
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [creatingNextBatch, setCreatingNextBatch] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedStep, setSelectedStep] = useState<string>("")
  const [shortlistedCandidates, setShortlistedCandidates] = useState<any[]>([])
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set())
  const [candidateStatuses, setCandidateStatuses] = useState<Record<string, "SELECTED" | "REJECTED" | "PENDING">>({})
  const [errors, setErrors] = useState<{ step?: string; candidates?: string; general?: string }>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchBatches()
    fetchWorkflowSteps()
  }, [jobId])

  async function fetchBatches() {
    try {
      const res = await fetch(`/api/admin/batches?jobId=${jobId}`)
      if (res.ok) {
        const data = await res.json()
        setBatches(data.batches || [])
      }
    } catch (error) {
      console.error("Error fetching batches:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchWorkflowSteps() {
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.job?.workflow?.steps) {
          setWorkflowSteps(data.job.workflow.steps.sort((a: any, b: any) => a.stepOrder - b.stepOrder))
        }
      }
    } catch (error) {
      console.error("Error fetching workflow steps:", error)
    }
  }

  async function fetchShortlistedCandidates() {
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/shortlist?status=shortlisted`)
      if (res.ok) {
        const data = await res.json()
        setShortlistedCandidates(data.applications || [])
      }
    } catch (error) {
      console.error("Error fetching shortlisted candidates:", error)
    }
  }

  async function handleCreateBatch() {
    // Reset errors
    setErrors({})
    setSuccessMessage(null)

    // Validation
    if (!selectedStep) {
      setErrors({ step: "Please select a workflow step" })
      return
    }

    if (selectedCandidates.size === 0) {
      setErrors({ candidates: "Please select at least one candidate" })
      return
    }

    // Prevent multiple submissions
    if (creating) {
      return
    }

    setCreating(true)

    try {
      const step = workflowSteps.find(s => s.id === selectedStep)
      if (!step) {
        setErrors({ general: "Selected workflow step not found" })
        setCreating(false)
        return
      }

      // Check if this is batch 1 (first step)
      const existingBatches = batches.filter(b => b.workflowStepId === selectedStep)
      const batchNumber = existingBatches.length > 0
        ? Math.max(...existingBatches.map(b => b.batchNumber)) + 1
        : 1

      // Prepare candidate statuses for initial batch
      const statuses = Array.from(selectedCandidates).map(candidateId => ({
        candidateId,
        status: candidateStatuses[candidateId] || "PENDING"
      })).filter(cs => cs.status !== "PENDING") // Only send SELECTED/REJECTED

      const res = await fetch("/api/admin/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          workflowStepId: selectedStep,
          candidateIds: Array.from(selectedCandidates),
          batchNumber,
          batchName: `Batch ${batchNumber}`,
          candidateStatuses: statuses.length > 0 ? statuses : undefined
        })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccessMessage("Batch created successfully!")
        setShowCreateModal(false)
        setSelectedCandidates(new Set())
        setCandidateStatuses({})
        setSelectedStep("")
        setErrors({})
        await fetchBatches()
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null)
        }, 3000)
      } else {
        setErrors({ general: data.error || "Failed to create batch. Please try again." })
      }
    } catch (error) {
      console.error("Error creating batch:", error)
      setErrors({ general: "An unexpected error occurred. Please try again." })
    } finally {
      setCreating(false)
    }
  }

  async function handleCreateNextBatch(currentBatchId: string, nextStepId: string) {
    // Prevent multiple submissions
    if (creatingNextBatch === currentBatchId) {
      return
    }

    setCreatingNextBatch(currentBatchId)

    try {
      const res = await fetch(`/api/admin/batches/${currentBatchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextStepId
        })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccessMessage("Next batch created successfully!")
        await fetchBatches()
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null)
        }, 3000)
      } else {
        setErrors({ general: data.error || "Failed to create next batch. Please try again." })
        setTimeout(() => {
          setErrors({})
        }, 5000)
      }
    } catch (error) {
      console.error("Error creating next batch:", error)
      setErrors({ general: "An unexpected error occurred. Please try again." })
      setTimeout(() => {
        setErrors({})
      }, 5000)
    } finally {
      setCreatingNextBatch(null)
    }
  }

  function getBatchesForStep(stepId: string) {
    return batches.filter(b => b.workflowStepId === stepId).sort((a, b) => a.batchNumber - b.batchNumber)
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "PENDING_ADMIN":
        return "bg-yellow-100 text-yellow-800"
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800"
      case "COMPLETED":
        return "bg-green-100 text-green-800"
      case "CANCELLED":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    // <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Batch Management</h1>
              <p className="text-gray-600 mt-1">Manage interview batches for bulk hiring</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/jobs/${jobId}`}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back to Job
              </Link>
              <button
                onClick={() => {
                  fetchShortlistedCandidates()
                  setShowCreateModal(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Batch
              </button>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Error Message */}
        {errors.general && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{errors.general}</p>
            </div>
            <button
              onClick={() => setErrors({})}
              className="text-red-600 hover:text-red-800"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {workflowSteps.map((step) => {
              const stepBatches = getBatchesForStep(step.id)
              const nextStep = workflowSteps.find(s => s.stepOrder === step.stepOrder + 1)

              return (
                <div key={step.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Step {step.stepOrder}: {step.stepName}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {stepBatches.length} batch(es)
                      </p>
                    </div>
                  </div>

                  {stepBatches.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No batches created for this step
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {stepBatches.map((batch) => (
                        <div
                          key={batch.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {batch.batchName || `Batch ${batch.batchNumber}`}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(batch.status)}`}
                            >
                              {batch.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            {batch.candidateCount} candidate(s)
                          </p>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/batches/${batch.id}`}
                              className="flex-1 text-center px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                            >
                              View Details
                            </Link>
                            {batch.status === "COMPLETED" && nextStep && (
                              <button
                                onClick={() => handleCreateNextBatch(batch.id, nextStep.id)}
                                className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                              >
                                Create Next Batch
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Create New Batch</h2>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Workflow Step
                </label>
                <select
                  value={selectedStep}
                  onChange={(e) => setSelectedStep(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Step</option>
                  {workflowSteps.map((step) => (
                    <option key={step.id} value={step.id}>
                      Step {step.stepOrder}: {step.stepName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Candidates and Set Initial Status
                  <span className="text-xs text-gray-500 ml-2">(For initial batch, mark as SELECTED or REJECTED)</span>
                </label>
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  {shortlistedCandidates.map((candidate) => {
                    const isSelected = selectedCandidates.has(candidate.candidateId)
                    const status = candidateStatuses[candidate.candidateId] || "PENDING"
                    return (
                      <div
                        key={candidate.candidateId}
                        className={`flex items-center gap-3 p-3 border-b border-gray-100 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSelected = new Set(selectedCandidates)
                            if (e.target.checked) {
                              newSelected.add(candidate.candidateId)
                              // Default to SELECTED for initial batch
                              setCandidateStatuses(prev => ({
                                ...prev,
                                [candidate.candidateId]: "SELECTED"
                              }))
                            } else {
                              newSelected.delete(candidate.candidateId)
                              const newStatuses = { ...candidateStatuses }
                              delete newStatuses[candidate.candidateId]
                              setCandidateStatuses(newStatuses)
                            }
                            setSelectedCandidates(newSelected)
                          }}
                          className="rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{candidate.candidate.name}</div>
                          <div className="text-sm text-gray-500">{candidate.candidate.email}</div>
                        </div>
                        {isSelected && (
                          <select
                            value={status}
                            onChange={(e) => {
                              setCandidateStatuses(prev => ({
                                ...prev,
                                [candidate.candidateId]: e.target.value as "SELECTED" | "REJECTED" | "PENDING"
                              }))
                            }}
                            className="px-2 py-1 text-sm border border-gray-300 rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="PENDING">Pending</option>
                            <option value="SELECTED">Selected</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        )}
                      </div>
                    )
                  })}
                </div>
                {selectedCandidates.size > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">{selectedCandidates.size}</span> candidate(s) selected
                    {Object.values(candidateStatuses).filter(s => s === "SELECTED").length > 0 && (
                      <span className="ml-2 text-green-600">
                        ({Object.values(candidateStatuses).filter(s => s === "SELECTED").length} selected, {Object.values(candidateStatuses).filter(s => s === "REJECTED").length} rejected)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setSelectedCandidates(new Set())
                    setCandidateStatuses({})
                    setSelectedStep("")
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBatch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Batch
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    // </AdminLayout>
  )
}

