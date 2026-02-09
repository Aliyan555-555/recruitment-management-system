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
    assessmentStatus?: string
    assessmentScore?: number | null
    recommendation?: string | null
    interviewer?: string
    assessedAt?: string
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

export default function ShortlistedCandidatesPage() {
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
            // Fetch workflow step details (job/round must exist)
            const stepRes = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}`)
            if (stepRes.status === 404 || stepRes.status === 400) {
                router.replace("/admin/jobs")
                return
            }
            let stepType: string | null = null
            if (stepRes.ok) {
                const stepData = await stepRes.json()
                setWorkflowStep(stepData.workflowStep)
                stepType = stepData.workflowStep?.stepType || null
            }

            // Fetch candidates
            const res = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/candidates?status=shortlisted`)
            if (res.ok) {
                const data = await res.json()
                let candidatesData = data.candidates || []

                // If this is an OFFER round, fetch LOI and Offer Letter status for each candidate
                if (stepType === "OFFER") {
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
                }

                setCandidates(candidatesData)
            }
        } catch (error) {
            console.error("Error fetching data:", error)
            router.replace("/admin/jobs")
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
                    {workflowStep?.stepName || "Round"} - Shortlisted
                </span>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
             
                    <h2 className="text-2xl font-bold text-foreground">Shortlisted Candidates</h2>
                    <p className="text-muted-foreground">Track assessments and move to next round</p>
                </div>
            </div>

            {/* Candidates Table */}
            <div className="bg-card rounded-xl shadow overflow-hidden border border-border">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Candidate</th>
                            {workflowStep?.stepType !== "OFFER" && (
                                <>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Assessment Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Score</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Recommendation</th>
                                </>
                            )}
                            {workflowStep?.stepType === "OFFER" && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">LOI Status</th>
                            )}
                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Public Profile</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                                {workflowStep?.stepType === "FOCUS_GROUP" ? "Assessments" : workflowStep?.stepType === "OFFER" ? "Actions" : "Actions"}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {candidates.map((candidate) => (
                            <tr key={candidate.id} className="hover:bg-muted/50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 font-bold">
                                            {candidate.name.charAt(0)}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-foreground">{candidate.name}</div>
                                            <div className="text-sm text-muted-foreground">{candidate.email}</div>
                                        </div>
                                    </div>
                                </td>
                                {workflowStep?.stepType !== "OFFER" && (
                                    <>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${candidate.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' :
                                                'bg-yellow-500/10 text-yellow-500'
                                                }`}>
                                                {candidate.status === 'COMPLETED' ? 'Assessed' : 'Pending Assessment'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium">
                                            {candidate.assessmentScore !== undefined && candidate.assessmentScore !== null ? candidate.assessmentScore : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {candidate.recommendation ? (
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${candidate.recommendation === 'HIRE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                                                    }`}>
                                                    {candidate.recommendation}
                                                </span>
                                            ) : '-'}
                                        </td>
                                    </>
                                )}
                                {workflowStep?.stepType === "OFFER" && (
                                    <td className="px-6 py-4">
                                        {candidate.loiStatus ? (
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${candidate.loiStatus === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-500' :
                                                candidate.loiStatus === 'SENT' ? 'bg-primary/10 text-primary' :
                                                    candidate.loiStatus === 'REJECTED' ? 'bg-destructive/10 text-destructive' :
                                                        candidate.loiStatus === 'EXPIRED' ? 'bg-yellow-500/10 text-yellow-500' :
                                                            'bg-muted text-muted-foreground'
                                                }`}>
                                                {candidate.loiStatus}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground/50 text-xs">-</span>
                                        )}
                                    </td>
                                )}
                                <td className="px-6 py-4 text-sm">
                                    <Link
                                        href={`/candidate/profile/public/${candidate.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:text-primary/80 hover:underline"
                                    >
                                        View Profile
                                    </Link>
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-medium">
                                    {workflowStep?.stepType === "FOCUS_GROUP" ? (
                                        <div className="flex items-center justify-end gap-3">
                                            <Link
                                                href={`/admin/jobs/${params.id}/rounds/${params.roundId}/candidates/${candidate.id}/assessment/internal`}
                                                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all"
                                            >
                                                Internal
                                            </Link>
                                            <Link
                                                href={`/admin/jobs/${params.id}/rounds/${params.roundId}/candidates/${candidate.id}/assessment/external`}
                                                className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-all"
                                            >
                                                External
                                            </Link>
                                        </div>
                                    ) : workflowStep?.stepType === "OFFER" ? (
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/admin/jobs/${params.id}/rounds/${params.roundId}/candidates/${candidate.id}/loi`}
                                                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all"
                                            >
                                                {candidate.loiStatus ? 'View LOI' : 'Generate LOI'}
                                            </Link>
                                        </div>
                                    ) : (
                                        <Link
                                            href={`/admin/jobs/${params.id}/rounds/${params.roundId}/candidates/${candidate.id}/assessment`}
                                            className="text-primary hover:text-primary/80"
                                        >
                                            {candidate.status === 'COMPLETED' ? 'View Assessment' : 'Assess'}
                                        </Link>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
                <Link
                    href={`/admin/jobs/${params.id}/rounds/${params.roundId}/applied`}
                    className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-foreground bg-background border border-input rounded-lg hover:bg-accent transition-all shadow-sm hover:shadow-md"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </Link>
                <Link
                    href={workflowStep?.stepType === "OFFER" ? `/admin/jobs/${params.id}/rounds/${params.roundId}/offers` : `/admin/jobs/${params.id}/rounds/${params.roundId}/results`}
                    className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
                >
                    Next
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>
        </div>
    )
}
