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
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Manage Offers</h2>
                    <p className="text-gray-500">Generate and track offer letters for candidates who accepted the LOI</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href={`/admin/jobs/${params.id}/rounds/${params.roundId}/shortlisted`}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Shortlist
                    </Link>
                </div>
            </div>

            {/* Candidates Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LOI Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offer Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {candidates.map((candidate) => (
                            <tr key={candidate.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                                            {candidate.name.charAt(0)}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                                            <div className="text-sm text-gray-500">{candidate.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {candidate.loiStatus ? (
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${candidate.loiStatus === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                                            candidate.loiStatus === 'SENT' ? 'bg-blue-100 text-blue-800' :
                                                candidate.loiStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                    candidate.loiStatus === 'EXPIRED' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                            }`}>
                                            {candidate.loiStatus}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 text-xs">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {candidate.offerStatus ? (
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${candidate.offerStatus === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                                            candidate.offerStatus === 'SENT' ? 'bg-blue-100 text-blue-800' :
                                                candidate.offerStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                    candidate.offerStatus === 'EXPIRED' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                            }`}>
                                            {candidate.offerStatus}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 text-xs">-</span>
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
                                            <span className="text-xs text-gray-400 italic">LOI Not Accepted</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Action Buttons - e.g. Finish Round */}
            {/* The user said "not need result page", so maybe we end here or have a "Complete Round" button that doesn't go to result page but maybe just marks things? 
                 For now, I'll leave it without a "Next" button as per the request implied (skipping result page). 
                 Or maybe to dashboard? I'll add a "Back to Rounds" button at top.
             */}
        </div>
    )
}
