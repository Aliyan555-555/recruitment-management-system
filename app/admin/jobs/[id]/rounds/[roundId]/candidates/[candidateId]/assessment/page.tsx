"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"

interface CandidateInfo {
  id: string
  name: string
  email: string
  phone: string
  education: string
  institution: string
  lastEmployer: string
  lastAssignment: string
  totalExperience: string
  currentSalary: string
  liability: string
  relatives: string
  remarks: string
}

interface Interviewer {
  id: string
  firstname: string
  lastname: string
  email: string
  department: string | null
}

interface SkillRating {
  rating: number
  max: number
}

interface FormData {
  skills: {
    appearance: SkillRating
    education: SkillRating
    intellectual: SkillRating
    leadership: SkillRating
    principles: SkillRating
    itSkills: SkillRating
    communication: SkillRating
    commitment: SkillRating
    assertiveness: SkillRating
    versatility: SkillRating
    professionalKnowledge: SkillRating
    experience: SkillRating
  }
  comments: string
  recommendedToHire: string
  priorityToOffer: string
  interviewerIds: string[]
}

const SKILLS = [
  {
    key: "appearance",
    label: "Appearance & outward personality",
    description: "Appropriately dressed and presentable. Appropriate body language facial expressions.",
    max: 10
  },
  {
    key: "education",
    label: "Educational background",
    description: "Suitably qualified (both academically and professionally) for job in question, from reputable institutions.",
    max: 10
  },
  {
    key: "intellectual",
    label: "Intellectual disposition & general awareness",
    description: "Articulate, intelligent, aware of domestic & international current affairs. Versatile with arts, crafts and sports.",
    max: 10
  },
  {
    key: "leadership",
    label: "Leadership potential",
    description: "Visionary strategic thinker & planner skills. Is a self-motivated team player. Believes in win-win outcomes.",
    max: 10
  },
  {
    key: "principles",
    label: "Adherence to principles and values",
    description: "Committed to upholding of basic principles and values. No prejudices based on gender, background or beliefs.",
    max: 10
  },
  {
    key: "itSkills",
    label: "IT Skills",
    description: "Fluent with MS Office applications. Usage of Internet, E-mail & other web based technologies. Typing speed.",
    max: 10
  },
  {
    key: "communication",
    label: "Communication and inter-personal skills",
    description: "Fluent in verbal & written communication, public speaking & presentation. Sound inter-personal skills.",
    max: 10
  },
  {
    key: "commitment",
    label: "Commitment, enthusiasm, hard work & attention to quality",
    description: "Committed to hard work. Prepared to work long hours if necessary. Quality conscious. Generally enthusiastic.",
    max: 10
  },
  {
    key: "assertiveness",
    label: "Assertiveness, self-confidence & self-discipline",
    description: "Sure of himself / herself. Clear about personal & organizational goals & objectives. Generally well organized.",
    max: 10
  },
  {
    key: "versatility",
    label: "Versatility, innovativeness & creative thinking",
    description: "Has variety of experience in academic or voluntary work. Exposure to sports, hobbies, travel, languages.",
    max: 10
  },
  {
    key: "professionalKnowledge",
    label: "Professional knowledge",
    description: "In banking generally or in any specific area (i.e. IT, Accounting etc.) as required by job in question.",
    max: 25
  },
  {
    key: "experience",
    label: "Relevance of previous experience",
    description: "To specific job requirement & in related areas. (Sound & varied experience in all major required areas).",
    max: 25
  }
]

export default function AssessmentPage() {
  const params = useParams()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null)
  const [jobTitle, setJobTitle] = useState("")
  const [saving, setSaving] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [submittedInfo, setSubmittedInfo] = useState<{ submittedAt?: string | null; interviewer?: string | null; evaluation?: { score: number; maxScore: number; scorePercentage: number; recommendation: string } | null }>({ submittedAt: null, interviewer: null, evaluation: null })
  const [interviewers, setInterviewers] = useState<Interviewer[]>([])
  const [loadingInterviewers, setLoadingInterviewers] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    skills: {
      appearance: { rating: 0, max: 10 },
      education: { rating: 0, max: 10 },
      intellectual: { rating: 0, max: 10 },
      leadership: { rating: 0, max: 10 },
      principles: { rating: 0, max: 10 },
      itSkills: { rating: 0, max: 10 },
      communication: { rating: 0, max: 10 },
      commitment: { rating: 0, max: 10 },
      assertiveness: { rating: 0, max: 10 },
      versatility: { rating: 0, max: 10 },
      professionalKnowledge: { rating: 0, max: 25 },
      experience: { rating: 0, max: 25 }
    },
    comments: "",
    recommendedToHire: "Not Recommended",
    priorityToOffer: "Low",
    interviewerIds: ["", "", ""]
  })

  // Fetch interviewers
  useEffect(() => {
    const fetchInterviewers = async () => {
      try {
        setLoadingInterviewers(true)
        const res = await fetch('/api/admin/interviewers')
        if (res.ok) {
          const data = await res.json()
          setInterviewers(data.interviewers || [])
        }
      } catch (error) {
        console.error("Error fetching interviewers:", error)
      } finally {
        setLoadingInterviewers(false)
      }
    }
    fetchInterviewers()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/candidates/${params.candidateId}/assessment`)
        if (res.ok) {
          const data = await res.json()

          // Set candidate info (always set if available)
          if (data.candidate) {
            setCandidate(data.candidate)
          }

          // Set job title (always set if available)
          if (data.job?.title) {
            setJobTitle(data.job.title)
          } else if (data.jobTitle) {
            setJobTitle(data.jobTitle)
          }

          // Get interviewer IDs from step metadata (assigned during job creation)
          const stepInterviewerIds = data.stepInterviewerIds || []
          const defaultInterviewerIds = [
            stepInterviewerIds[0] || "",
            stepInterviewerIds[1] || "",
            stepInterviewerIds[2] || ""
          ]

          // Merge form data properly (only if formData exists)
          if (data.formData && data.formData !== null) {
            // Handle formData if it's a string (JSON)
            let existingFormData = data.formData
            if (typeof existingFormData === 'string') {
              try {
                existingFormData = JSON.parse(existingFormData)
              } catch (e) {
                console.error("Error parsing formData:", e)
                existingFormData = {}
              }
            }

            // Default skills structure
            const defaultSkills = {
              appearance: { rating: 0, max: 10 },
              education: { rating: 0, max: 10 },
              intellectual: { rating: 0, max: 10 },
              leadership: { rating: 0, max: 10 },
              principles: { rating: 0, max: 10 },
              itSkills: { rating: 0, max: 10 },
              communication: { rating: 0, max: 10 },
              commitment: { rating: 0, max: 10 },
              assertiveness: { rating: 0, max: 10 },
              versatility: { rating: 0, max: 10 },
              professionalKnowledge: { rating: 0, max: 25 },
              experience: { rating: 0, max: 25 }
            }

            // Merge existing skills with defaults
            const mergedSkills = { ...defaultSkills }
            if (existingFormData.skills && typeof existingFormData.skills === 'object') {
              Object.keys(mergedSkills).forEach(key => {
                if (existingFormData.skills[key]) {
                  mergedSkills[key as keyof typeof mergedSkills] = {
                    rating: existingFormData.skills[key].rating ?? 0,
                    max: existingFormData.skills[key].max ?? mergedSkills[key as keyof typeof mergedSkills].max
                  }
                }
              })
            }

            setFormData({
              skills: mergedSkills,
              comments: existingFormData.comments || "",
              recommendedToHire: existingFormData.recommendedToHire || "Not Recommended",
              priorityToOffer: existingFormData.priorityToOffer || "Low",
              interviewerIds: Array.isArray(existingFormData.interviewerIds)
                ? existingFormData.interviewerIds
                : defaultInterviewerIds
            })
          } else {
            // No existing formData, use default interviewer IDs from step metadata
            setFormData(prev => ({
              ...prev,
              interviewerIds: defaultInterviewerIds
            }))
          }
          setIsReadOnly(!!data.submittedAt)
          setSubmittedInfo({
            submittedAt: data.submittedAt,
            interviewer: data.interviewer || null,
            evaluation: data.evaluation || null
          })
        } else {
          // If API returns error, still set candidate and job if available
          const errorData = await res.json().catch(() => ({}))
          console.error("Error fetching assessment:", errorData)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [params.id, params.roundId, params.candidateId])

  const calculateScores = useCallback(() => {
    const skills = formData.skills
    let scoreWithoutExperience = 0
    let scoreWithExperience = 0
    let maxWithoutExperience = 0
    let maxWithExperience = 0

    // First 10 skills (max 10 each = 100 total)
    const firstTenSkills = Object.keys(skills).slice(0, 10)
    firstTenSkills.forEach(key => {
      const skill = skills[key as keyof typeof skills]
      scoreWithoutExperience += skill.rating
      maxWithoutExperience += skill.max
      scoreWithExperience += skill.rating
      maxWithExperience += skill.max
    })

    // Last 2 skills (max 25 each = 50 total)
    const lastTwoSkills = Object.keys(skills).slice(10)
    lastTwoSkills.forEach(key => {
      const skill = skills[key as keyof typeof skills]
      scoreWithExperience += skill.rating
      maxWithExperience += skill.max
    })

    return {
      scoreWithoutExperience,
      scoreWithExperience,
      maxWithoutExperience: 100,
      maxWithExperience: 150,
      percentageWithoutExperience: maxWithoutExperience > 0 ? Math.round((scoreWithoutExperience / maxWithoutExperience) * 100) : 0,
      percentageWithExperience: maxWithExperience > 0 ? Math.round((scoreWithExperience / maxWithExperience) * 100) : 0
    }
  }, [formData.skills])

  const saveDraft = useCallback(async () => {
    if (isReadOnly) return
    try {
      setSaving(true)
      await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/candidates/${params.candidateId}/assessment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData })
      })
    } catch (error) {
      console.error("Error saving draft:", error)
    } finally {
      setSaving(false)
    }
  }, [formData, params.id, params.roundId, params.candidateId])

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (step === 1) {
      const interval = setInterval(() => {
        saveDraft()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [step, saveDraft])

  const handleSubmit = async () => {
    try {
      setSaving(true)
      const res = await fetch(`/api/admin/jobs/${params.id}/rounds/${params.roundId}/candidates/${params.candidateId}/assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData })
      })

      if (res.ok) {
        router.push(`/admin/jobs/${params.id}/rounds/${params.roundId}/shortlisted`)
      } else {
        const error = await res.json().catch(() => ({}))
        alert(error?.error || "Error submitting assessment")
      }
    } catch (error) {
      console.error("Error submitting:", error)
      alert("Error submitting assessment")
    } finally {
      setSaving(false)
    }
  }

  const updateSkillRating = (skillKey: string, rating: number) => {
    if (isReadOnly) return
    setFormData(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [skillKey]: {
          ...prev.skills[skillKey as keyof typeof prev.skills],
          rating
        }
      }
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Candidate information not found</p>
        </div>
      </div>
    )
  }

  const scores = submittedInfo.evaluation
    ? {
      scoreWithoutExperience: submittedInfo.evaluation.score,
      scoreWithExperience: submittedInfo.evaluation.score,
      maxWithoutExperience: submittedInfo.evaluation.maxScore,
      maxWithExperience: submittedInfo.evaluation.maxScore,
      percentageWithoutExperience: submittedInfo.evaluation.scorePercentage,
      percentageWithExperience: submittedInfo.evaluation.scorePercentage
    }
    : calculateScores()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Screening Interview Assessment
          </h1>
          <p className="text-lg text-muted-foreground">
            Batch Recruitment - {jobTitle}
          </p>
        </div>

        {/* Progress Stepper */}
        <div className="mb-10">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {/* Step 1 */}
            <div className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${step >= 1 ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-muted text-muted-foreground'
                }`}>
                1
              </div>
              <div className="ml-3">
                <div className={`font-semibold text-sm ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                  Skills Assessment
                </div>
              </div>
            </div>

            {/* Connector Line */}
            <div className="flex-1 mx-4">
              <div className={`h-1 rounded-full transition-all ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
            </div>

            {/* Step 2 */}
            <div className="flex items-center flex-1 justify-end">
              <div className="mr-3 text-right">
                <div className={`font-semibold text-sm ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                  Comments & Review
                </div>
              </div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${step >= 2 ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-muted text-muted-foreground'
                }`}>
                2
              </div>
            </div>
          </div>
        </div>

        {isReadOnly && (
          <div className="mb-8 bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-primary font-semibold">Assessment submitted</p>
                <p className="text-sm text-muted-foreground">
                  {submittedInfo.interviewer ? `By ${submittedInfo.interviewer}` : "Interviewer"} ·{" "}
                  {submittedInfo.submittedAt ? new Date(Number(submittedInfo.submittedAt) * 1000).toLocaleString() : ""}
                </p>
              </div>
              {submittedInfo.evaluation && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">
                    {submittedInfo.evaluation.score}/{submittedInfo.evaluation.maxScore}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {submittedInfo.evaluation.scorePercentage}% · {submittedInfo.evaluation.recommendation}
                  </div>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              This assessment is locked because it has already been submitted. You can review the details below.
            </p>
          </div>
        )}

        {/* Step 1: Skills Assessment */}
        {step === 1 && (
          <div className="bg-card rounded-xl shadow-lg border border-border">
            {/* Candidate Information Section */}
            <div className="border-b border-border px-8 py-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Candidate Information
                </h3>
                <a
                  href={`/candidate/profile/public/${params.candidateId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 hover:underline"
                >
                  View Public Profile
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full">
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 bg-muted/50 font-medium text-muted-foreground text-sm w-1/4">
                        Name of Candidate
                      </td>
                      <td className="px-4 py-3 text-foreground w-1/4">{candidate?.name || "-"}</td>
                      <td className="px-4 py-3 bg-muted/50 font-medium text-muted-foreground text-sm w-1/4">
                        Education & Institution
                      </td>
                      <td className="px-4 py-3 text-foreground w-1/4">
                        {candidate?.education || "-"} {candidate?.institution ? `(${candidate.institution})` : ""}
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 bg-muted/50 font-medium text-muted-foreground text-sm">
                        Last Employer & Assignment
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {candidate?.lastEmployer || "-"} {candidate?.lastAssignment ? `(${candidate.lastAssignment})` : ""}
                      </td>
                      <td className="px-4 py-3 bg-muted/50 font-medium text-muted-foreground text-sm">
                        Current / Last Salary
                      </td>
                      <td className="px-4 py-3 text-foreground">{candidate?.currentSalary || "-"}</td>
                    </tr>
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 bg-muted/50 font-medium text-muted-foreground text-sm">
                        Total Experience
                      </td>
                      <td className="px-4 py-3 text-foreground">{candidate?.totalExperience || "-"}</td>
                      <td className="px-4 py-3 bg-muted/50 font-medium text-muted-foreground text-sm">
                        Relatives in JS Bank
                      </td>
                      <td className="px-4 py-3 text-foreground">{candidate?.relatives || "-"}</td>
                    </tr>
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 bg-muted/50 font-medium text-muted-foreground text-sm">
                        Liability with Present Employer
                      </td>
                      <td className="px-4 py-3 text-foreground">{candidate?.liability || "-"}</td>
                      <td className="px-4 py-3 bg-muted/50 font-medium text-muted-foreground text-sm">
                        Adjustment Remarks
                      </td>
                      <td className="px-4 py-3 text-foreground">{candidate?.remarks || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rating Scale */}
            <div className="px-8 py-6 bg-muted/30 border-b border-border">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-primary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="font-semibold text-foreground">Rating Scale Guide:</span>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      0-2 Low
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      3-4 Average
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      5-7 Good
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-lime-500"></span>
                      7-8 Very Good
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      9-10 Outstanding
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills Assessment */}
            <div className="px-8 py-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Skills Assessment
              </h3>
              <div className="space-y-4">
                {SKILLS.map((skill, index) => {
                  const skillData = formData.skills[skill.key as keyof typeof formData.skills]
                  const percentage = (skillData.rating / skill.max) * 100
                  let barColor = 'bg-red-500'
                  if (percentage >= 90) barColor = 'bg-green-500'
                  else if (percentage >= 70) barColor = 'bg-lime-500'
                  else if (percentage >= 50) barColor = 'bg-yellow-500'
                  else if (percentage >= 30) barColor = 'bg-orange-500'

                  return (
                    <div key={skill.key} className="p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-foreground mb-1">{skill.label}</div>
                          <div className="text-sm text-muted-foreground leading-relaxed">{skill.description}</div>
                        </div>
                        <div className="ml-4 flex items-center gap-3">
                          <span className="text-xs font-medium text-muted-foreground">MAX: {skill.max}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex-1">
                          <input
                            type="range"
                            min="0"
                            max={skill.max}
                            value={skillData.rating}
                            onChange={(e) => updateSkillRating(skill.key, parseInt(e.target.value))}
                            disabled={isReadOnly}
                            className={`w-full h-2 bg-muted rounded-lg appearance-none ${isReadOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} accent-primary`}
                            style={{
                              background: `linear-gradient(to right, ${barColor.replace('bg-', 'rgb(var(--color-')} 0%, ${barColor.replace('bg-', 'rgb(var(--color-')} ${percentage}%, transparent ${percentage}%, transparent 100%)`
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-center min-w-[60px] h-10 bg-card border-2 border-primary rounded-lg">
                          <span className="text-lg font-bold text-primary">{skillData.rating}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Score Summary */}
            <div className="px-8 py-6 bg-muted/30">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Score Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Without Previous Experience</div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-foreground">{scores.scoreWithoutExperience}</span>
                    <span className="text-muted-foreground">/ {scores.maxWithoutExperience}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Maximum Score: {scores.maxWithoutExperience}</div>
                </div>
                <div className="bg-primary p-6 rounded-lg shadow-lg">
                  <div className="text-sm font-medium text-primary-foreground/80 mb-2">With Previous Experience</div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-primary-foreground">{scores.scoreWithExperience}</span>
                    <span className="text-primary-foreground/80">/ {scores.maxWithExperience}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-primary-foreground/20 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary-foreground h-full rounded-full transition-all duration-500"
                        style={{ width: `${scores.percentageWithExperience}%` }}
                      ></div>
                    </div>
                    <span className="text-lg font-bold text-primary-foreground">{scores.percentageWithExperience}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="px-8 py-6 flex items-center justify-between border-t border-border">
              <div className="text-sm text-muted-foreground">
                {saving && <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Auto-saving...
                </span>}
              </div>
              <button
                onClick={() => setStep(2)}
                className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                {isReadOnly ? "View Review" : "Continue to Review"}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Comments and Recommendation */}
        {step === 2 && (
          <div className="bg-card rounded-xl shadow-lg border border-border">
            <div className="px-8 py-6 border-b border-border">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Final Review & Recommendation
              </h2>
            </div>

            <div className="p-8 space-y-6">
              {/* Comments */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Behavioral Observations & Comments
                </label>
                <textarea
                  value={formData.comments}
                  onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                  disabled={isReadOnly}
                  className={`w-full border-2 border-input rounded-lg p-4 h-32 bg-background focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all resize-none ${isReadOnly ? 'bg-muted cursor-not-allowed text-muted-foreground' : 'text-foreground'}`}
                  placeholder="Please provide any additional comments or observations about the candidate..."
                />
              </div>

              {/* Recommendation and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Hiring Recommendation
                  </label>
                  <select
                    value={formData.recommendedToHire}
                    onChange={(e) => setFormData(prev => ({ ...prev, recommendedToHire: e.target.value }))}
                    disabled={isReadOnly}
                    className={`w-full border-2 border-input rounded-lg p-3 bg-background focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all font-medium ${isReadOnly ? 'bg-muted cursor-not-allowed text-muted-foreground' : 'text-foreground'}`}
                  >
                    <option value="Not Recommended">❌ Not Recommended</option>
                    <option value="Recommended">✅ Recommended</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Priority Level
                  </label>
                  <select
                    value={formData.priorityToOffer}
                    onChange={(e) => setFormData(prev => ({ ...prev, priorityToOffer: e.target.value }))}
                    disabled={isReadOnly}
                    className={`w-full border-2 border-input rounded-lg p-3 bg-background focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all font-medium ${isReadOnly ? 'bg-muted cursor-not-allowed text-muted-foreground' : 'text-foreground'}`}
                  >
                    <option value="Low">🔵 Low Priority</option>
                    <option value="Medium">🟡 Medium Priority</option>
                    <option value="High">🔴 High Priority</option>
                  </select>
                </div>
              </div>

              {/* Interviewer Details */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Interviewer Panel
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[0, 1, 2].map((idx) => {
                    // Get the IDs of interviewers selected in OTHER dropdowns
                    const selectedInOtherDropdowns = formData.interviewerIds
                      .filter((_, i) => i !== idx)
                      .filter(id => id !== "")

                    // Filter out interviewers already selected elsewhere
                    const availableInterviewers = interviewers.filter(
                      interviewer => !selectedInOtherDropdowns.includes(interviewer.id)
                    )

                    // Find the interviewer by ID
                    const interviewerId = formData.interviewerIds[idx]
                    const interviewer = interviewers.find(i => i.id === interviewerId)

                    return (
                      <div key={idx} className="bg-muted/30 border-2 border-border rounded-lg p-4">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          Interviewer {idx + 1}
                        </div>
                        {interviewer ? (
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              {interviewer.firstname} {interviewer.lastname}
                            </div>
                            {interviewer.department && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {interviewer.department}
                              </div>
                            )}
                            {interviewer.email && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {interviewer.email}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground italic">
                            Not assigned
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-8 py-6 bg-muted/30 border-t border-border flex justify-between items-center">
              <button
                onClick={() => setStep(1)}
                className="bg-background border-2 border-input text-foreground px-8 py-3 rounded-lg font-semibold hover:bg-muted transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                Back to Assessment
              </button>
              {isReadOnly ? (
                <button
                  onClick={() => router.push(`/admin/jobs/${params.id}/rounds/${params.roundId}/shortlisted`)}
                  className="bg-primary text-primary-foreground px-10 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-lg flex items-center gap-2"
                >
                  Back to Assessments
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="bg-primary text-primary-foreground px-10 py-3 rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Submit Assessment
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
