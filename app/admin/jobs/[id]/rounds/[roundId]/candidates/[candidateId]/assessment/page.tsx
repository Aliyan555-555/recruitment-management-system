"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"

export default function AssessmentPage() {
    const params = useParams()
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(true)
    const [candidate, setCandidate] = useState<any>(null)
    const [formData, setFormData] = useState({
        education: "",
        institution: "",
        lastEmployer: "",
        lastRole: "",
        salary: "",
        experience: "",
        comments: "",
        recommendedToHire: "",
        priorityToOffer: "",
        interviewerName: "",
        signature: ""
    })

    useEffect(() => {
        // Fetch candidate info
        const fetchInfo = async () => {
            try {
                // Get candidate details
                const res = await fetch(`/api/admin/candidates/${params.candidateId}`)
                if (res.ok) {
                    const data = await res.json()
                    setCandidate(data.candidate)
                    // Pre-fill form if existing assessment
                    const assessRes = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/candidates/${params.candidateId}/assessment`)
                    if (assessRes.ok) {
                        const assessData = await assessRes.json()
                        if (assessData.assessment) {
                            setFormData({ ...formData, ...assessData.assessment.formData })
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchInfo()
    }, [])

    const handleSubmit = async (draft = false) => {
        try {
            const res = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/candidates/${params.candidateId}/assessment`, {
                method: draft ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    formData,
                    draft
                })
            })

            if (res.ok) {
                if (!draft) {
                    router.push(`/admin/jobs/${params.id}/rounds/${params.roundId}/shortlisted`)
                } else {
                    alert("Draft saved!")
                }
            }
        } catch (error) {
            console.error("Error submitting:", error)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading assessment...</div>

    return (
        <div className="max-w-4xl mx-auto py-8">
            {/* Progress */}
            <div className="mb-8 flex items-center justify-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
                <div className={`w-20 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
            </div>

            <Card className="p-8">
                {step === 1 ? (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Candidate Information</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                <input type="text" value={candidate?.firstName + " " + candidate?.lastName} disabled className="mt-1 w-full p-2 border rounded bg-gray-50" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Education</label>
                                <input type="text" value={formData.education} onChange={e => setFormData({ ...formData, education: e.target.value })} className="mt-1 w-full p-2 border rounded" />
                            </div>
                            {/* Add other fields similarly */}
                        </div>
                        <div className="flex justify-end">
                            <button onClick={() => setStep(2)} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Next Step</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Interview Assessment</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Comments</label>
                            <textarea value={formData.comments} onChange={e => setFormData({ ...formData, comments: e.target.value })} className="mt-1 w-full p-2 border rounded h-32"></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Recommended to Hire?</label>
                            <div className="mt-2 flex gap-4">
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="hire" value="yes" checked={formData.recommendedToHire === "yes"} onChange={e => setFormData({ ...formData, recommendedToHire: "yes" })} /> Yes
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="hire" value="no" checked={formData.recommendedToHire === "no"} onChange={e => setFormData({ ...formData, recommendedToHire: "no" })} /> No
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <button onClick={() => setStep(1)} className="px-6 py-2 text-gray-600 hover:text-gray-900">Back</button>
                            <div className="flex gap-3">
                                <button onClick={() => handleSubmit(true)} className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50">Save Draft</button>
                                <button onClick={() => handleSubmit(false)} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">Submit Assessment</button>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    )
}
