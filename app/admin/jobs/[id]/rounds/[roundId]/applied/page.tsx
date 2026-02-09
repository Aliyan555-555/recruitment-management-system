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
    applicationStatus?: string
    pipelineStepId: string
    assessmentStatus: "pending" | "in_progress" | "completed"
}

interface WorkflowStep {
    id: string
    stepName: string
    stepType: string
    stepOrder: number
    job?: {
        id: string
        title: string
        jobCode?: string | null
    }
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

    const isSelectable = (candidate: Candidate) => {
        // Only PENDING candidates can be shortlisted/rejected
        // IN_PROGRESS = already shortlisted, assessment in progress
        // COMPLETED = assessment completed
        // REJECTED = already rejected
        return candidate.status === "PENDING"
    }

    const toggleSelectCandidate = (candidateId: string) => {
        const candidate = candidates.find(c => c.id === candidateId)
        if (!candidate || !isSelectable(candidate)) return

        const newSelected = new Set(selectedCandidates)
        if (newSelected.has(candidateId)) {
            newSelected.delete(candidateId)
        } else {
            newSelected.add(candidateId)
        }
        setSelectedCandidates(newSelected)
    }

    const toggleSelectAll = () => {
        const selectableCandidates = filteredCandidates.filter(isSelectable)
        // If all selectable candidates are already selected, clear selection
        const allSelected = selectableCandidates.length > 0 && selectableCandidates.every(c => selectedCandidates.has(c.id))

        if (allSelected) {
            setSelectedCandidates(new Set())
        } else {
            const newSelected = new Set(selectedCandidates)
            selectableCandidates.forEach(c => newSelected.add(c.id))
            setSelectedCandidates(newSelected)
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
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading candidates...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:py-6">
                {/* Header */}
                <div className="mb-8">
                    {/* Breadcrumb */}
                 
                    <div className="flex items-center gap-3 mb-4">
                        <Link
                            href={`/admin/jobs/${jobId}`}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-lg hover:bg-accent transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Job
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                        <Link
                            href="/admin/jobs"
                            className="hover:text-foreground transition-colors"
                        >
                            Jobs
                        </Link>
                        <span>/</span>
                        <Link
                            href={`/admin/jobs/${jobId}`}
                            className="hover:text-foreground transition-colors"
                        >
                            {workflowStep?.job?.title || "Job"}
                        </Link>
                        <span>/</span>
                        <span className="text-foreground font-medium">
                            {workflowStep?.stepName || "Round"} - Applied
                        </span>
                    </div>


                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground mb-2">
                                {workflowStep?.stepName || "Round"} - Applied Candidates
                            </h1>
                            <p className="text-muted-foreground">
                                Manage candidates who have applied and reached this round
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Link
                                href={`/admin/jobs/${jobId}/rounds/${roundId}/shortlisted`}
                                className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-all"
                            >
                                View Shortlisted
                            </Link>
                            <Link
                                href={`/admin/jobs/${jobId}/rounds/${roundId}/results`}
                                className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all"
                            >
                                View Results
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total in Round</p>
                                <p className="text-2xl font-bold text-foreground">
                                    {candidates.length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                                <p className="text-2xl font-bold text-foreground">
                                    {candidates.filter(c => c.status === "PENDING").length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                                <p className="text-2xl font-bold text-foreground">
                                    {candidates.filter(c => c.status === "PENDING").length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                                <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                                <p className="text-2xl font-bold text-foreground">
                                    {candidates.filter(c => c.status === "REJECTED").length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Actions */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="flex-1 flex gap-4 items-center">
                            <div className="relative flex-1 max-w-md">
                                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                            >
                                <option value="all">All Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        </div>

                        {selectedCandidates.size > 0 && (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleShortlist(Array.from(selectedCandidates))}
                                    className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-all"
                                >
                                    Shortlist Selected ({selectedCandidates.size})
                                </button>
                                <button
                                    onClick={() => handleReject(Array.from(selectedCandidates))}
                                    className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive rounded-lg hover:bg-destructive/90 transition-all"
                                >
                                    Reject Selected ({selectedCandidates.size})
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Candidates Table */}
                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 text-left">
                                        <input
                                            type="checkbox"
                                            checked={
                                                filteredCandidates.filter(isSelectable).length > 0 &&
                                                filteredCandidates.filter(isSelectable).every(c => selectedCandidates.has(c.id))
                                            }
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 text-primary border-input rounded focus:ring-primary"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Candidate</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Applied Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assessment</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredCandidates.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <svg className="w-16 h-16 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                <p className="text-muted-foreground text-lg font-medium">No candidates found</p>
                                                <p className="text-muted-foreground/70 text-sm">Try adjusting your filters or search term</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCandidates.map((candidate) => {
                                        const selectable = isSelectable(candidate)
                                        const statusReason = candidate.status === "IN_PROGRESS" ? "Already shortlisted - assessment in progress" :
                                                           candidate.status === "COMPLETED" ? "Assessment completed" :
                                                           candidate.status === "REJECTED" ? "Already rejected" : ""
                                        
                                        return (
                                        <tr key={candidate.id} className={`hover:bg-muted/50 transition-colors ${!selectable ? 'bg-muted/30 opacity-75' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="relative group">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCandidates.has(candidate.id)}
                                                        onChange={() => toggleSelectCandidate(candidate.id)}
                                                        disabled={!selectable}
                                                        className={`w-4 h-4 text-primary border-input rounded focus:ring-primary ${!selectable ? 'cursor-not-allowed opacity-50' : ''}`}
                                                        title={!selectable ? statusReason : ''}
                                                    />
                                                    {!selectable && (
                                                        <div className="absolute left-0 top-full mt-1 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                                                            {statusReason}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <span className="text-primary font-semibold text-sm">
                                                            {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground">{candidate.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">{candidate.email}</td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                {(() => {
                                                    try {
                                                        const timestamp = Number(candidate.appliedAt)
                                                        // Check if timestamp is in seconds (10 digits) or milliseconds (13 digits)
                                                        // If it's less than 100000000000, it's likely seconds, multiply by 1000
                                                        // If it's 0 or NaN, show N/A
                                                        if (!timestamp) return "N/A"
                                                        const date = new Date(timestamp < 1000000000000 ? timestamp * 1000 : timestamp)
                                                        if (isNaN(date.getTime())) return "Invalid Date"
                                                        return date.toLocaleDateString()
                                                    } catch (e) {
                                                        return "Invalid Date"
                                                    }
                                                })()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                                    candidate.status === "PENDING" ? "bg-yellow-500/10 text-yellow-600" :
                                                    candidate.status === "IN_PROGRESS" ? "bg-blue-500/10 text-blue-600" :
                                                    candidate.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-500" :
                                                    candidate.status === "REJECTED" ? "bg-destructive/10 text-destructive" :
                                                    "bg-muted text-muted-foreground"
                                                }`}>
                                                    {candidate.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${candidate.assessmentStatus === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                                                    candidate.assessmentStatus === "in_progress" ? "bg-primary/10 text-primary" :
                                                        "bg-muted text-muted-foreground"
                                                    }`}>
                                                    {candidate.assessmentStatus === "completed" ? "Completed" :
                                                        candidate.assessmentStatus === "in_progress" ? "In Progress" :
                                                            "Pending"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/candidate/profile/public/${candidate.id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg transition-all"
                                                    >
                                                        View Profile
                                                    </Link>
                                                    {isSelectable(candidate) && (
                                                        <>
                                                            <button
                                                                onClick={() => handleShortlist([candidate.id])}
                                                                className="px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-lg transition-all"
                                                            >
                                                                Shortlist
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject([candidate.id])}
                                                                className="px-3 py-1.5 text-sm font-medium text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded-lg transition-all"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Next Button */}
                <div className="mt-8 flex justify-end">
                    <Link
                        href={`/admin/jobs/${jobId}/rounds/${roundId}/shortlisted`}
                        className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
                    >
                        Next
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div >
    )
}
