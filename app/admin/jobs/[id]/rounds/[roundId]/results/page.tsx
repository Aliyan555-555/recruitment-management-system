"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card } from "@/components/ui/card"

interface ResultsStats {
    total: number
    pending: number
    inProgress: number
    completed: number
    rejected: number
    passed: number
    failed: number
    averageScore: number
}

export default function ResultsPage() {
    const params = useParams()
    const [stats, setStats] = useState<ResultsStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchResults()
    }, [])

    const fetchResults = async () => {
        try {
            const res = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/results`)
            if (res.ok) {
                const data = await res.json()
                setStats(data.stats)
            }
        } catch (error) {
            console.error("Error fetching results:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading results...</div>
    if (!stats) return <div className="p-8 text-center">No results available</div>

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Round Results</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-blue-50 border-blue-100">
                    <div className="text-sm text-blue-600 font-medium">Total Candidates</div>
                    <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
                </Card>
                <Card className="p-4 bg-green-50 border-green-100">
                    <div className="text-sm text-green-600 font-medium">Passed</div>
                    <div className="text-2xl font-bold text-green-900">{stats.passed}</div>
                </Card>
                <Card className="p-4 bg-red-50 border-red-100">
                    <div className="text-sm text-red-600 font-medium">Failed</div>
                    <div className="text-2xl font-bold text-red-900">{stats.failed}</div>
                </Card>
                <Card className="p-4 bg-purple-50 border-purple-100">
                    <div className="text-sm text-purple-600 font-medium">Average Score</div>
                    <div className="text-2xl font-bold text-purple-900">{stats.averageScore}</div>
                </Card>
            </div>

            {/* Distribution Chart (Simplified) */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Score Distribution</h3>
                <div className="h-64 flex items-end gap-2">
                    {/* Visual representation of distribution */}
                    <div className="flex-1 bg-gray-100 rounded-t-lg relative group h-full flex items-center justify-center text-gray-400">
                        Chart Placeholder
                    </div>
                </div>
            </Card>

            {/* Export Action */}
            <div className="flex justify-end">
                <button className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                    Export Results (CSV)
                </button>
            </div>
        </div>
    )
}
