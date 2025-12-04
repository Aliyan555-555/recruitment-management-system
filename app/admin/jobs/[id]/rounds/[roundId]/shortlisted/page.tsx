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
    assessment?: {
        score: number
        recommendation: string
        interviewer?: {
            name: string
        }
    }
}

export default function ShortlistedCandidatesPage() {
    const params = useParams()
    const router = useRouter()
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    useEffect(() => {
        fetchCandidates()
    }, [])

    const fetchCandidates = async () => {
        try {
            const res = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/candidates?status=shortlisted`)
            if (res.ok) {
                const data = await res.json()
                setCandidates(data.candidates || [])
            }
        } catch (error) {
            console.error("Error fetching candidates:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleBulkAction = async (action: "move_next" | "reject") => {
        if (selectedIds.length === 0) return

        try {
            const res = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/candidates`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    candidateIds: selectedIds
                })
            })

            if (res.ok) {
                fetchCandidates()
                setSelectedIds([])
            }
        } catch (error) {
            console.error("Error performing action:", error)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading candidates...</div>

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Shortlisted Candidates</h2>
                    <p className="text-gray-500">Track assessments and move to next round</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleBulkAction("move_next")}
                        disabled={selectedIds.length === 0}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                        Move to Next Round ({selectedIds.length})
                    </button>
                </div>
            </div>

            {/* Candidates Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left">
                                <input
                                    type="checkbox"
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedIds(candidates.map(c => c.id))
                                        } else {
                                            setSelectedIds([])
                                        }
                                    }}
                                    checked={selectedIds.length === candidates.length && candidates.length > 0}
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assessment Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recommendation</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {candidates.map((candidate) => (
                            <tr key={candidate.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(candidate.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedIds([...selectedIds, candidate.id])
                                            } else {
                                                setSelectedIds(selectedIds.filter(id => id !== candidate.id))
                                            }
                                        }}
                                    />
                                </td>
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
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${candidate.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {candidate.status === 'COMPLETED' ? 'Assessed' : 'Pending Assessment'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium">
                                    {candidate.assessment ? candidate.assessment.score : '-'}
                                </td>
                                <td className="px-6 py-4">
                                    {candidate.assessment ? (
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${candidate.assessment.recommendation === 'HIRE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {candidate.assessment.recommendation}
                                        </span>
                                    ) : '-'}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-medium">
                                    <Link
                                        href={`/admin/jobs/${params.id}/rounds/${params.roundId}/candidates/${candidate.id}/assessment`}
                                        className="text-blue-600 hover:text-blue-900"
                                    >
                                        {candidate.status === 'COMPLETED' ? 'View Assessment' : 'Assess'}
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
