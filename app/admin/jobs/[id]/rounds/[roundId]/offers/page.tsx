"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"

interface Candidate {
    id: string
    name: string
    email: string
    status: string
    appliedAt: string
    shortlistedAt?: string
    loiStatus?: string
    offerStatus?: string
}

interface WorkflowStep {
    id: string
    stepName: string
    stepType: string | null
    stepOrder: number
    job?: {
        id: string
        title: string
        jobCode?: string | null
    }
}

export default function OffersPage() {
    const params = useParams()
    const router = useRouter()
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [workflowStep, setWorkflowStep] = useState<WorkflowStep | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            // Fetch workflow step details
            const stepRes = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}`)
            if (stepRes.ok) {
                const stepData = await stepRes.json()
                setWorkflowStep(stepData.workflowStep)
            }

            // Fetch candidates
            // We fetch shortlisted candidates because that's the base for this round
            const res = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/candidates?status=shortlisted`)
            if (res.ok) {
                const data = await res.json()
                let candidatesData = data.candidates || []

                // Fetch LOI and Offer Letter status for each candidate
                candidatesData = await Promise.all(
                    candidatesData.map(async (candidate: Candidate) => {
                        try {
                            // Fetch LOI status
                            const loiRes = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/candidates/${candidate.id}/loi`)
                            if (loiRes.ok) {
                                const loiData = await loiRes.json()
                                candidate.loiStatus = loiData.loi?.status || null
                            }

                            // Fetch Offer Letter status
                            const offerRes = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/candidates/${candidate.id}/offer`)
                            if (offerRes.ok) {
                                const offerData = await offerRes.json()
                                candidate.offerStatus = offerData.offerLetter?.status || null
                            }
                        } catch (error) {
                            console.error(`Error fetching LOI/Offer for candidate ${candidate.id}:`, error)
                        }
                        return candidate
                    })
                )

                setCandidates(candidatesData)
            }
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading candidates...</div>

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link
                    href="/admin/jobs"
                    className="hover:text-foreground transition-colors"
                >
                    Jobs
                </Link>
                <span>/</span>
                <Link
                    href={`/admin/jobs/${params.id}`}
                    className="hover:text-foreground transition-colors"
                >
                    {workflowStep?.job?.title || "Job"}
                </Link>
                <span>/</span>
                <span className="text-foreground font-medium">
                    {workflowStep?.stepName || "Round"} - Offers
                </span>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="mb-2">
                        <span className="text-sm text-muted-foreground">Job: </span>
                        <span className="text-lg font-semibold text-foreground">
                            {workflowStep?.job?.title || "Loading..."}
                        </span>
                        {workflowStep?.job?.jobCode && (
                            <span className="ml-2 text-sm text-muted-foreground">
                                ({workflowStep.job.jobCode})
                            </span>
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Manage Offers</h2>
                    <p className="text-muted-foreground">Generate and track offer letters for candidates who accepted the LOI</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href={`/admin/jobs/${params.id}/rounds/${params.roundId}/shortlisted`}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-card border border-input rounded-lg hover:bg-accent transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Shortlist
                    </Link>
                </div>
            </div>

            {/* Candidates Table */}
            <div className="bg-card rounded-xl shadow overflow-hidden border border-border">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Candidate</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">LOI Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Offer Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {candidates.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">
                                    <p className="text-muted-foreground text-lg font-medium">No candidates found</p>
                                    <p className="text-muted-foreground/70 text-sm">Ensure candidates have been shortlisted for this round.</p>
                                </td>
                            </tr>
                        ) : (
                            candidates.map((candidate) => (
                                <tr key={candidate.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                                {candidate.name.charAt(0)}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-foreground">{candidate.name}</div>
                                                <div className="text-sm text-muted-foreground">{candidate.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {candidate.loiStatus ? (
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${candidate.loiStatus === 'ACCEPTED' ? 'bg-green-500/20 text-green-600' :
                                                candidate.loiStatus === 'SENT' ? 'bg-blue-500/20 text-blue-600' :
                                                    candidate.loiStatus === 'REJECTED' ? 'bg-red-500/20 text-red-600' :
                                                        candidate.loiStatus === 'EXPIRED' ? 'bg-yellow-500/20 text-yellow-600' :
                                                            'bg-muted text-muted-foreground'
                                                }`}>
                                                {candidate.loiStatus}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground/50 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {candidate.offerStatus ? (
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${candidate.offerStatus === 'ACCEPTED' ? 'bg-green-500/20 text-green-600' :
                                                candidate.offerStatus === 'SENT' ? 'bg-blue-500/20 text-blue-600' :
                                                    candidate.offerStatus === 'REJECTED' ? 'bg-red-500/20 text-red-600' :
                                                        candidate.offerStatus === 'EXPIRED' ? 'bg-yellow-500/20 text-yellow-600' :
                                                            'bg-muted text-muted-foreground'
                                                }`}>
                                                {candidate.offerStatus}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground/50 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            {candidate.loiStatus === 'ACCEPTED' ? (
                                                <Link
                                                    href={`/admin/jobs/${params.id}/rounds/${params.roundId}/candidates/${candidate.id}/offer`}
                                                    className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-all ${candidate.offerStatus
                                                        ? 'bg-purple-600 hover:bg-purple-700'
                                                        : 'bg-green-600 hover:bg-green-700'
                                                        }`}
                                                >
                                                    {candidate.offerStatus ? 'View Offer' : 'Generate Offer'}
                                                </Link>
                                            ) : (
                                                <span className="text-xs text-muted-foreground/60 italic">LOI Not Accepted</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Legend or Helper UI can go here if needed */}
        </div>
    )
}
