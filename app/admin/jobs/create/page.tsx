"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"

const TextEditor = dynamic(() => import("@/components/TextEditor"), { ssr: false })

interface WorkflowStep {
  stepName: string
  stepOrder: number
  isRequired: boolean
  isSkippable: boolean
  interviewerId?: string
  // new optional fields (UI only for now)
  stepType?: string
  skipReason?: string
  durationMins?: number
  weightage?: number
  scoreThreshold?: number
  interviewMode?: string
  meetingLink?: string
  interviewerIds?: string[]
  routeVisibility?: string[]
  evaluationCriteria?: string[]
  evaluationCriteriaInput?: string // Temporary input field for adding criteria
  candidateInstructions?: string
  interviewerInstructions?: string
  attachments?: Array<{
    file: File
    id: string // Unique ID for the file
    access: string[] // ["CANDIDATE", "INTERVIEWER"] - access permissions for this specific file
  }>
}

export default function CreateJobPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<{ city: string; country: string }[]>([])
  const [newLocation, setNewLocation] = useState<{ city: string; country: string }>({ city: "", country: "" })
  const stepOptions = useMemo(() => ([
    "Initial Screening",
    "Screening Interview",
    "Technical Interview",
    "Focus Group",
    "Final Interview",
    "Letter of Intent",
    "Test",
    "HR Interview",
    "Offer",
    "Other",
  ]), [])

  const [formData, setFormData] = useState({
    title: "",
    shortDescription: "",
    description: "",
    company: "",
    postFrom: "",
    postTo: "",
    employmentType: "Permanent",
    employmentShift: "Morning",
    status: true,
    totalPositions: 1,
    department: "",
    minimumExperience: "",
    minimumSalary: "",
    certification: "",
    minEducation: "",
    benefits: "",
    skills: [] as string[],
  })
  const [skillInput, setSkillInput] = useState("")

  const [interviewers, setInterviewers] = useState<Array<{ id: string; name: string }>>([])
  const roleOptions = ["ADMIN", "INTERVIEWER", "CANDIDATE"]

  // Load company name from config
  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        const res = await fetch("/api/company")
        if (res.ok) {
          const data = await res.json()
          setFormData(prev => ({ ...prev, company: data.name }))
        }
      } catch (error) {
        console.error("Error loading company info:", error)
        // Fallback to default company name
        setFormData(prev => ({ ...prev, company: "RMS Organization" }))
      }
    }
    loadCompanyInfo()
  }, [])

  // Load interviewers list once
  useState(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/admin/interviewers")
        if (res.ok) {
          const data = await res.json()
          const opts = (data.interviewers || []).map((i: any) => ({ id: i.id, name: `${i.firstname} ${i.lastname}`.trim() }))
          setInterviewers(opts)
        }
      } catch {}
    })()
    return undefined
  })

  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    {
      stepName: "",
      stepOrder: 1,
      isRequired: true,
      isSkippable: false,
    }
  ])

  const handleAddStep = () => {
    setWorkflowSteps([
      ...workflowSteps,
      {
        stepName: "",
        stepOrder: workflowSteps.length + 1,
        isRequired: true,
        isSkippable: false,
      }
    ])
  }

  const handleRemoveStep = (index: number) => {
    if (workflowSteps.length > 1) {
      const newSteps = workflowSteps.filter((_, i) => i !== index)
      // Reorder steps
      const reordered = newSteps.map((step, i) => ({
        ...step,
        stepOrder: i + 1
      }))
      setWorkflowSteps(reordered)
    }
  }

  const handleStepChange = (index: number, field: string, value: any) => {
    const newSteps = [...workflowSteps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setWorkflowSteps(newSteps)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const skillsArray = formData.skills.filter(s => s.trim()) // Already an array, just filter empty values

      // Transform workflow steps: serialize attachment metadata (no File objects)
      const transformedSteps = workflowSteps.map((step) => {
        const attachments = (step.attachments || []).map((att: any) => ({
          id: att.id,
          fileName: att.file?.name ?? att.fileName ?? "",
          fileSize: typeof att.file?.size === "number" ? att.file.size : (att.fileSize ?? 0),
          fileType: att.file?.type ?? att.fileType ?? "",
          access: Array.isArray(att.access) ? att.access : [],
        }))

        // Remove client-only file objects from payload
        const { attachments: _clientAttachments, deadline: _deadline, ...rest } = step as any
        return { ...rest, attachments }
      })

      const response = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          shortDescription: formData.shortDescription || undefined,
          description: formData.description,
          company: formData.company,
          postFrom: formData.postFrom,
          postTo: formData.postTo,
          employmentType: formData.employmentType,
          employmentShift: formData.employmentShift,
          totalPositions: Number(formData.totalPositions) || 1,
          industry: formData.department || undefined,
          minimumExperience: formData.minimumExperience || undefined,
          certification: formData.certification || undefined,
          minimumSalary: formData.minimumSalary || undefined,
          benefits: formData.benefits || undefined,
          status: formData.status,
          skills: skillsArray,
          workflowSteps: transformedSteps,
          locations,
          educationRequirements: formData.minEducation ? [ { educationLevelName: formData.minEducation, isRequired: true } ] : [],
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push("/admin/jobs")
      } else {
        alert(data.error || "Failed to create job")
      }
    } catch (error) {
      console.error("Error creating job:", error)
      alert("Failed to create job")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Job</h1>
            <p className="text-gray-600">Fill in the details to post a new job opening</p>
          </div>
          <Link
            href="/admin/jobs"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Jobs
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Details */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 md:p-8 transition-all duration-200 hover:shadow-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Job Details</h3>
            </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none hover:border-gray-400"
                placeholder="e.g., Senior Software Engineer"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Short Description
              </label>
              <textarea
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                rows={3}
                maxLength={300}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none hover:border-gray-400 bg-white text-gray-900 placeholder:text-gray-400 resize-none"
                placeholder="A brief summary of the job (max 300 characters)..."
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.shortDescription.length}/300 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Company <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.company}
                  disabled
                  readOnly
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-700"
                  title="Company name is set from organization configuration"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Employment Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none hover:border-gray-400 bg-white"
              >
                <option value="Permanent">Permanent</option>
                <option value="Part Time">Part Time</option>
                <option value="Contract">Contract</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shift
              </label>
              <select
                value={formData.employmentShift}
                onChange={(e) => setFormData({ ...formData, employmentShift: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
                <option value="Rotational">Rotational</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Post From *
              </label>
              <input
                type="date"
                required
                value={formData.postFrom}
                onChange={(e) => setFormData({ ...formData, postFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Post To *
              </label>
              <input
                type="date"
                required
                value={formData.postTo}
                onChange={(e) => setFormData({ ...formData, postTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Experience
              </label>
              <input
                type="text"
                value={formData.minimumExperience}
                onChange={(e) => setFormData({ ...formData, minimumExperience: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., 3-5 years"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Positions
              </label>
              <input
                type="number"
                min={1}
                value={formData.totalPositions}
                onChange={(e) => setFormData({ ...formData, totalPositions: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., 3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select Department</option>
                <option value="Engineering">Engineering</option>
                <option value="IT">IT</option>
                <option value="Software Development">Software Development</option>
                <option value="Data Science">Data Science</option>
                <option value="Product Management">Product Management</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
                <option value="Customer Support">Customer Support</option>
                <option value="Quality Assurance">Quality Assurance</option>
                <option value="Design">Design</option>
                <option value="Business Development">Business Development</option>
                <option value="Legal">Legal</option>
                <option value="Administration">Administration</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salary Range
              </label>
              <input
                type="text"
                value={formData.minimumSalary}
                onChange={(e) => setFormData({ ...formData, minimumSalary: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., $90,000 - $130,000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Certification
              </label>
              <input
                type="text"
                value={formData.certification}
                onChange={(e) => setFormData({ ...formData, certification: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., AWS Solutions Architect"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Education
              </label>
              <select
                value={formData.minEducation}
                onChange={(e) => setFormData({ ...formData, minEducation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select minimum education</option>
                <option value="High School Diploma">High School Diploma</option>
                <option value="Associate Degree">Associate Degree</option>
                <option value="Bachelor&apos;s Degree">Bachelor&apos;s Degree</option>
                <option value="Master&apos;s Degree">Master&apos;s Degree</option>
                <option value="Doctorate / PhD">Doctorate / PhD</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <TextEditor
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                minHeight="240px"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skills
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      const value = skillInput.trim()
                      if (value && !formData.skills.includes(value)) {
                        setFormData({ ...formData, skills: [...formData.skills, value] })
                        setSkillInput("")
                      }
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., JavaScript, React, Node.js"
                />
                <button
                  type="button"
                  onClick={() => {
                    const value = skillInput.trim()
                    if (value && !formData.skills.includes(value)) {
                      setFormData({ ...formData, skills: [...formData.skills, value] })
                      setSkillInput("")
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, skillIndex) => (
                    <span
                      key={skillIndex}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formData.skills.filter((_, i) => i !== skillIndex)
                          setFormData({ ...formData, skills: updated })
                        }}
                        className="ml-1 text-blue-600 hover:text-blue-800 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Benefits
              </label>
              <textarea
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Perks and benefits..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status ? "active" : "inactive"}
                onChange={(e) => setFormData({ ...formData, status: e.target.value === "active" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Locations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Locations</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={newLocation.city}
                onChange={(e) => setNewLocation({ ...newLocation, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                value={newLocation.country}
                onChange={(e) => setNewLocation({ ...newLocation, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                onClick={() => {
                  if (!newLocation.city) return
                  setLocations([...locations, { city: newLocation.city.trim(), country: newLocation.country.trim() }])
                  setNewLocation({ city: "", country: "" })
                }}
              >
                + Add Location
              </button>
            </div>
          </div>
          {locations.length > 0 && (
            <ul className="mt-3 list-disc list-inside text-sm text-gray-700">
              {locations.map((loc, idx) => (
                <li key={`${loc.city}-${idx}`} className="flex justify-between items-center">
                  <span>{loc.city}{loc.country ? `, ${loc.country}` : ""}</span>
                  <button type="button" className="text-red-600" onClick={() => setLocations(locations.filter((_, i) => i !== idx))}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Workflow Steps */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Workflow Steps</h3>
            <button
              type="button"
              onClick={handleAddStep}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              + Add Step
            </button>
          </div>

          {workflowSteps.map((step, index) => (
            <div key={index} className="mb-4 p-4 border border-gray-200 rounded-md">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-700">Step {step.stepOrder}</h4>
                {workflowSteps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Step Name *
                  </label>
                  <select
                    required
                    value={step.stepName}
                    onChange={(e) => handleStepChange(index, "stepName", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select step</option>
                    {stepOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Step Type</label>
                  <select
                    value={step.stepType || ""}
                    onChange={(e) => handleStepChange(index, "stepType", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select type</option>
                    <option value="Screening">Screening</option>
                    <option value="Technical">Technical</option>
                    <option value="FocusGroup">Focus Group</option>
                    <option value="Final">Final</option>
                    <option value="Offer">Offer</option>
                    <option value="Test">Test</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={step.isRequired}
                    onChange={(e) => handleStepChange(index, "isRequired", e.target.checked)}
                    className="mr-2"
                    id={`required-${index}`}
                  />
                  <label htmlFor={`required-${index}`} className="text-sm text-gray-700">
                    Required
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={step.isSkippable}
                    onChange={(e) => handleStepChange(index, "isSkippable", e.target.checked)}
                    className="mr-2"
                    id={`skippable-${index}`}
                  />
                  <label htmlFor={`skippable-${index}`} className="text-sm text-gray-700">
                    Skippable
                  </label>
                </div>

                {step.isSkippable && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skip Reason</label>
                    <textarea
                      value={step.skipReason || ""}
                      onChange={(e) => handleStepChange(index, "skipReason", e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter reason why this step can be skipped..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    min={0}
                    value={step.durationMins ?? ""}
                    onChange={(e) => handleStepChange(index, "durationMins", Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interview Mode</label>
                  <select
                    value={step.interviewMode || ""}
                    onChange={(e) => handleStepChange(index, "interviewMode", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select mode</option>
                    <option value="Onsite">Onsite</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>

                {step.interviewMode === "Remote" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link *</label>
                    <input
                      type="url"
                      value={step.meetingLink || ""}
                      onChange={(e) => handleStepChange(index, "meetingLink", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="https://meet.google.com/..."
                      required={step.interviewMode === "Remote"}
                    />
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Interviewer(s)</label>
                  <select
                    multiple
                    value={step.interviewerIds || []}
                    onChange={(e) => {
                      const options = Array.from(e.target.selectedOptions).map(o => o.value)
                      handleStepChange(index, "interviewerIds", options)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md h-28"
                  >
                    {interviewers.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Route Visibility (roles)</label>
                  <select
                    multiple
                    value={step.routeVisibility || []}
                    onChange={(e) => {
                      const options = Array.from(e.target.selectedOptions).map(o => o.value)
                      handleStepChange(index, "routeVisibility", options)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md h-24"
                  >
                    {roleOptions.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Evaluation Criteria</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={step.evaluationCriteriaInput || ""}
                      onChange={(e) => {
                        const newSteps = [...workflowSteps]
                        newSteps[index] = { ...newSteps[index], evaluationCriteriaInput: e.target.value }
                        setWorkflowSteps(newSteps)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          const value = step.evaluationCriteriaInput?.trim()
                          if (value) {
                            const current = step.evaluationCriteria || []
                            if (!current.includes(value)) {
                              handleStepChange(index, "evaluationCriteria", [...current, value])
                              const newSteps = [...workflowSteps]
                              newSteps[index] = { ...newSteps[index], evaluationCriteriaInput: "" }
                              setWorkflowSteps(newSteps)
                            }
                          }
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Communication, Problem Solving"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const value = step.evaluationCriteriaInput?.trim()
                        if (value) {
                          const current = step.evaluationCriteria || []
                          if (!current.includes(value)) {
                            handleStepChange(index, "evaluationCriteria", [...current, value])
                            const newSteps = [...workflowSteps]
                            newSteps[index] = { ...newSteps[index], evaluationCriteriaInput: "" }
                            setWorkflowSteps(newSteps)
                          }
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  {step.evaluationCriteria && step.evaluationCriteria.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {step.evaluationCriteria.map((criteria, critIndex) => (
                        <span
                          key={critIndex}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {criteria}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = step.evaluationCriteria?.filter((_, i) => i !== critIndex) || []
                              handleStepChange(index, "evaluationCriteria", updated)
                            }}
                            className="ml-1 text-blue-600 hover:text-blue-800 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Instructions</label>
                  <textarea
                    value={step.candidateInstructions || ""}
                    onChange={(e) => handleStepChange(index, "candidateInstructions", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interviewer Instructions</label>
                  <textarea
                    value={step.interviewerInstructions || ""}
                    onChange={(e) => handleStepChange(index, "interviewerInstructions", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      const currentAttachments = step.attachments || []
                      
                      // Create new attachment objects with unique IDs and default access (both)
                      const newAttachments = files.map(file => ({
                        file,
                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        access: ["CANDIDATE", "INTERVIEWER"] // Default: both have access
                      }))
                      
                      handleStepChange(index, "attachments", [...currentAttachments, ...newAttachments])
                      
                      // Reset file input
                      e.target.value = ""
                    }}
                    className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  
                  {step.attachments && step.attachments.length > 0 && (
                    <div className="space-y-3 mt-3">
                      <p className="text-xs text-gray-600 font-medium">Uploaded Files ({step.attachments.length})</p>
                      {step.attachments.map((attachment, fileIndex) => (
                        <div key={attachment.id} className="p-3 border border-gray-200 rounded-md bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">
                                {attachment.file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(attachment.file.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = step.attachments?.filter((_, i) => i !== fileIndex) || []
                                handleStepChange(index, "attachments", updated)
                              }}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                          
                          <div className="mt-2">
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              Access Control for this file:
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex items-center gap-2 p-2 border border-gray-300 rounded-md cursor-pointer hover:bg-white bg-white">
                                <input
                                  type="checkbox"
                                  checked={attachment.access.includes("CANDIDATE")}
                                  onChange={(e) => {
                                    const updatedAttachments = [...(step.attachments || [])]
                                    const currentAccess = updatedAttachments[fileIndex].access
                                    
                                    if (e.target.checked) {
                                      // Add CANDIDATE
                                      updatedAttachments[fileIndex] = {
                                        ...updatedAttachments[fileIndex],
                                        access: [...new Set([...currentAccess, "CANDIDATE"])]
                                      }
                                    } else {
                                      // Prevent removing if it's the last option
                                      const newAccess = currentAccess.filter(a => a !== "CANDIDATE")
                                      if (newAccess.length === 0) {
                                        alert("At least one access option must be selected for each file.")
                                        return
                                      }
                                      updatedAttachments[fileIndex] = {
                                        ...updatedAttachments[fileIndex],
                                        access: newAccess
                                      }
                                    }
                                    handleStepChange(index, "attachments", updatedAttachments)
                                  }}
                                  className="mr-2"
                                />
                                <span className="text-xs text-gray-700">Candidate</span>
                              </label>
                              
                              <label className="flex items-center gap-2 p-2 border border-gray-300 rounded-md cursor-pointer hover:bg-white bg-white">
                                <input
                                  type="checkbox"
                                  checked={attachment.access.includes("INTERVIEWER")}
                                  onChange={(e) => {
                                    const updatedAttachments = [...(step.attachments || [])]
                                    const currentAccess = updatedAttachments[fileIndex].access
                                    
                                    if (e.target.checked) {
                                      // Add INTERVIEWER
                                      updatedAttachments[fileIndex] = {
                                        ...updatedAttachments[fileIndex],
                                        access: [...new Set([...currentAccess, "INTERVIEWER"])]
                                      }
                                    } else {
                                      // Prevent removing if it's the last option
                                      const newAccess = currentAccess.filter(a => a !== "INTERVIEWER")
                                      if (newAccess.length === 0) {
                                        alert("At least one access option must be selected for each file.")
                                        return
                                      }
                                      updatedAttachments[fileIndex] = {
                                        ...updatedAttachments[fileIndex],
                                        access: newAccess
                                      }
                                    }
                                    handleStepChange(index, "attachments", updatedAttachments)
                                  }}
                                  className="mr-2"
                                />
                                <span className="text-xs text-gray-700">Interviewer</span>
                              </label>
                            </div>
                            
                            {attachment.access.length === 0 && (
                              <p className="text-xs text-red-600 mt-1">
                                ⚠️ At least one access option must be selected
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Upload multiple files. Each file can have different access permissions (Candidate, Interviewer, or Both).
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href="/admin/jobs"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Job"}
          </button>
        </div>
      </form>
      </div>
    </div>
  )
}

