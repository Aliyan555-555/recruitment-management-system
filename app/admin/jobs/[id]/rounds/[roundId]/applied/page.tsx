"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

interface Candidate {
    id: string
    name: string
    email: string
    appliedAt: string
    status: string
    pipelineStepId: string
    assessmentStatus: "pending" | "in_progress" | "completed"
}

interface WorkflowStep {
    id: string
    stepName: string
    stepType: string
    stepOrder: number
}

export default function AppliedCandidatesPage() {
    const params = useParams()
    const router = useRouter()
    const jobId = params.id as string
    const roundId = params.roundId as string

    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [workflowStep, setWorkflowStep] = useState<WorkflowStep | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set())

    useEffect(() => {
        fetchData()
    }, [jobId, roundId])

    const fetchData = async () => {
        try {
            setLoading(true)

            // Fetch workflow step details
            const stepRes = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}`)
            if (stepRes.ok) {
                const stepData = await stepRes.json()
                setWorkflowStep(stepData.workflowStep)
            }

            // Fetch candidates for this round
            const candidatesRes = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}/candidates?status=applied`)
            if (candidatesRes.ok) {
                const candidatesData = await candidatesRes.json()
                setCandidates(candidatesData.candidates || [])
            }
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleShortlist = async (candidateIds: string[]) => {
        try {
            const res = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}/candidates`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "shortlist", candidateIds })
            })

            if (res.ok) {
                await fetchData()
                setSelectedCandidates(new Set())
            }
        } catch (error) {
            console.error("Error shortlisting candidates:", error)
        }
    }

    const handleReject = async (candidateIds: string[]) => {
        if (!confirm(`Are you sure you want to reject ${candidateIds.length} candidate(s)?`)) {
            return
        }

        try {
            const res = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}/candidates`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reject", candidateIds })
            })

            if (res.ok) {
                await fetchData()
                setSelectedCandidates(new Set())
            }
        } catch (error) {
            console.error("Error rejecting candidates:", error)
        }
    }

    const toggleSelectCandidate = (candidateId: string) => {
        const newSelected = new Set(selectedCandidates)
        if (newSelected.has(candidateId)) {
            newSelected.delete(candidateId)
        } else {
            newSelected.add(candidateId)
        }
        setSelectedCandidates(newSelected)
    }

    const toggleSelectAll = () => {
        if (selectedCandidates.size === filteredCandidates.length) {
            setSelectedCandidates(new Set())
        } else {
            setSelectedCandidates(new Set(filteredCandidates.map(c => c.id)))
        }
    }

    const filteredCandidates = candidates.filter(candidate => {
        const matchesSearch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === "all" || candidate.status === statusFilter
        return matchesSearch && matchesStatus
    })

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading candidates...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Link
                            href={`/admin/jobs/${jobId}`}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Job
                        </Link>
                    </div>

                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {workflowStep?.stepName || "Round"} - Applied Candidates
                            </h1>
                            <p className="text-gray-600">
                                Manage candidates who have applied and reached this round
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Link
                                href={`/admin/jobs/${jobId}/rounds/${roundId}/shortlisted`}
                                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all"
                            >
                                View Shortlisted
                            </Link>
                            <Link
                                href={`/admin/jobs/${jobId}/rounds/${roundId}/results`}
                                className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-all"
                            >
                                View Results
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Applied</p>
                                <p className="text-2xl font-bold text-gray-900">{candidates.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {candidates.filter(c => c.status === "PENDING").length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Shortlisted</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {candidates.filter(c => c.status === "SHORTLISTED").length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Rejected</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {candidates.filter(c => c.status === "REJECTED").length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="flex-1 flex gap-4 items-center">
                            <div className="relative flex-1 max-w-md">
                                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">All Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="SHORTLISTED">Shortlisted</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        </div>

                        {selectedCandidates.size > 0 && (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleShortlist(Array.from(selectedCandidates))}
                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all"
                                >
                                    Shortlist Selected ({selectedCandidates.size})
                                </button>
                                <button
                                    onClick={() => handleReject(Array.from(selectedCandidates))}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all"
                                >
                                    Reject Selected ({selectedCandidates.size})
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Candidates Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedCandidates.size === filteredCandidates.length && filteredCandidates.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Candidate</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Applied Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Assessment</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredCandidates.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                <p className="text-gray-500 text-lg font-medium">No candidates found</p>
                                                <p className="text-gray-400 text-sm">Try adjusting your filters or search term</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCandidates.map((candidate) => (
                                        <tr key={candidate.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCandidates.has(candidate.id)}
                                                    onChange={() => toggleSelectCandidate(candidate.id)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <span className="text-blue-600 font-semibold text-sm">
                                                            {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{candidate.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{candidate.email}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {new Date(parseInt(candidate.appliedAt)).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${candidate.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                                                        candidate.status === "SHORTLISTED" ? "bg-green-100 text-green-800" :
                                                            candidate.status === "REJECTED" ? "bg-red-100 text-red-800" :
                                                                "bg-blue-100 text-blue-800"
                                                    }`}>
                                                    {candidate.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${candidate.assessmentStatus === "completed" ? "bg-green-100 text-green-800" :
                                                        candidate.assessmentStatus === "in_progress" ? "bg-blue-100 text-blue-800" :
                                                            "bg-gray-100 text-gray-800"
                                                    }`}>
                                                    {candidate.assessmentStatus === "completed" ? "Completed" :
                                                        candidate.assessmentStatus === "in_progress" ? "In Progress" :
                                                            "Pending"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/admin/jobs/${jobId}/rounds/${roundId}/candidates/${candidate.id}/assessment`}
                                                        className="px-3 py-1.5 text-sm font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all"
                                                    >
                                                        View
                                                    </Link>
                                                    <button
                                                        onClick={() => handleShortlist([candidate.id])}
                                                        className="px-3 py-1.5 text-sm font-medium text-green-700 hover:text-green-800 hover:bg-green-50 rounded-lg transition-all"
                                                    >
                                                        Shortlist
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject([candidate.id])}
                                                        className="px-3 py-1.5 text-sm font-medium text-red-700 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
