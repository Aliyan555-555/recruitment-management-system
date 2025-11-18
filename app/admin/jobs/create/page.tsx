"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"

const TextEditor = dynamic(() => import("@/components/TextEditor"), { ssr: false })

interface FormErrors {
  title?: string
  shortDescription?: string
  description?: string
  company?: string
  postFrom?: string
  postTo?: string
  employmentType?: string
  totalPositions?: string
  minimumExperience?: string
  minimumSalary?: string
  department?: string
  skills?: string
  locations?: string
  _general?: string
  workflowSteps?: Record<number, {
    stepName?: string
    meetingLink?: string
    durationMins?: string
    weightage?: string
    scoreThreshold?: string
    evaluationCriteria?: string
    attachments?: string
  }>
}

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
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [locations, setLocations] = useState<{ city: string; country: string }[]>([])
  const [newLocation, setNewLocation] = useState<{ city: string; country: string }>({ city: "", country: "" })
  const [locationError, setLocationError] = useState<string>("")
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
    jobType: "NORMAL" as "NORMAL" | "BULK",
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

  // Validation functions
  const validateTitle = (title: string): string | undefined => {
    if (!title || title.trim() === "") {
      return "Job title is required"
    }
    if (title.trim().length < 3) {
      return "Job title must be at least 3 characters long"
    }
    if (title.trim().length > 200) {
      return "Job title must not exceed 200 characters"
    }
    return undefined
  }

  const validateShortDescription = (desc: string): string | undefined => {
    if (desc && desc.length > 300) {
      return "Short description must not exceed 300 characters"
    }
    return undefined
  }

  const validateDescription = (desc: string): string | undefined => {
    if (!desc || desc.trim() === "") {
      return "Job description is required"
    }
    // Strip HTML tags for length validation
    const textContent = desc.replace(/<[^>]*>/g, "").trim()
    if (textContent.length < 50) {
      return "Job description must be at least 50 characters long"
    }
    if (textContent.length > 10000) {
      return "Job description must not exceed 10,000 characters"
    }
    return undefined
  }

  const validateCompany = (company: string): string | undefined => {
    if (!company || company.trim() === "") {
      return "Company name is required"
    }
    return undefined
  }

  const validateDate = (dateString: string, fieldName: string): string | undefined => {
    if (!dateString) {
      return `${fieldName} is required`
    }
    
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return `${fieldName} must be a valid date`
    }

    // Get today's date at midnight for comparison
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Allow dates from today onwards (you can change this if you want to allow past dates)
    if (date < today) {
      return `${fieldName} cannot be in the past`
    }
    
    return undefined
  }

  const validateDateRange = (postFrom: string, postTo: string): { postFrom?: string; postTo?: string } => {
    const errors: { postFrom?: string; postTo?: string } = {}
    
    const fromError = validateDate(postFrom, "Post From date")
    if (fromError) {
      errors.postFrom = fromError
      return errors
    }

    const toError = validateDate(postTo, "Post To date")
    if (toError) {
      errors.postTo = toError
      return errors
    }

    const fromDate = new Date(postFrom)
    const toDate = new Date(postTo)
    fromDate.setHours(0, 0, 0, 0)
    toDate.setHours(0, 0, 0, 0)

    if (toDate < fromDate) {
      errors.postTo = "Post To date must be after or equal to Post From date"
    }

    // Validate that postTo is not too far in the future (e.g., 5 years)
    const maxDate = new Date()
    maxDate.setFullYear(maxDate.getFullYear() + 5)
    if (toDate > maxDate) {
      errors.postTo = "Post To date cannot be more than 5 years in the future"
    }

    return errors
  }

  const validateTotalPositions = (positions: number): string | undefined => {
    if (!positions || positions < 1) {
      return "Number of positions must be at least 1"
    }
    if (positions > 1000) {
      return "Number of positions cannot exceed 1000"
    }
    if (!Number.isInteger(positions)) {
      return "Number of positions must be a whole number"
    }
    return undefined
  }

  const validateMinimumExperience = (exp: string): string | undefined => {
    if (!exp || exp.trim() === "") {
      return undefined // Optional field
    }
    // Allow formats like "1 year", "2-3 years", "5+ years", etc.
    const expPattern = /^(\d+[\+\-]?|\d+\s*-\s*\d+)\s*(years?|yrs?|year|yr)?$/i
    if (!expPattern.test(exp.trim())) {
      return "Please enter a valid experience format (e.g., '2-3 years', '5+ years', '1 year')"
    }
    return undefined
  }

  const validateMinimumSalary = (salary: string): string | undefined => {
    if (!salary || salary.trim() === "") {
      return undefined // Optional field
    }
    // Allow formats like "$50,000", "50000-70000", "$50k-$70k", etc.
    const salaryPattern = /^[\$]?[\d,]+([kK]|[\-\s]+[\$]?[\d,]+[kK]?)?$/i
    if (!salaryPattern.test(salary.trim())) {
      return "Please enter a valid salary format (e.g., '$50,000', '50000-70000', '$50k-$70k')"
    }
    return undefined
  }

  const validateWorkflowStep = (step: WorkflowStep, index: number): Record<string, string> => {
    const stepErrors: Record<string, string> = {}

    if (!step.stepName || step.stepName.trim() === "") {
      stepErrors.stepName = "Step name is required"
    }

    if (step.interviewMode === "Remote") {
      if (!step.meetingLink || step.meetingLink.trim() === "") {
        stepErrors.meetingLink = "Meeting link is required for Remote interviews"
      } else {
        try {
          const url = new URL(step.meetingLink)
          if (!["http:", "https:", "zoom:", "teams:", "skype:"].some(protocol => url.protocol.startsWith(protocol))) {
            stepErrors.meetingLink = "Please enter a valid meeting URL (http/https/zoom/teams/skype)"
          }
        } catch {
          stepErrors.meetingLink = "Please enter a valid URL"
        }
      }
    }

    if (step.durationMins !== undefined && step.durationMins !== null) {
      const duration = Number(step.durationMins)
      if (isNaN(duration) || duration < 0) {
        stepErrors.durationMins = "Duration must be a positive number"
      } else if (duration > 1440) {
        stepErrors.durationMins = "Duration cannot exceed 1440 minutes (24 hours)"
      }
    }

    if (step.weightage !== undefined && step.weightage !== null) {
      const weightage = Number(step.weightage)
      if (isNaN(weightage) || weightage < 0 || weightage > 100) {
        stepErrors.weightage = "Weightage must be between 0 and 100"
      }
    }

    if (step.scoreThreshold !== undefined && step.scoreThreshold !== null) {
      const threshold = Number(step.scoreThreshold)
      if (isNaN(threshold) || threshold < 0 || threshold > 100) {
        stepErrors.scoreThreshold = "Score threshold must be between 0 and 100"
      }
    }

    // Validate attachments file size (max 10MB per file)
    if (step.attachments && step.attachments.length > 0) {
      for (const attachment of step.attachments) {
        if (attachment.file && attachment.file.size > 10 * 1024 * 1024) {
          stepErrors.attachments = `File "${attachment.file.name}" exceeds 10MB size limit`
          break
        }
        if (attachment.access.length === 0) {
          stepErrors.attachments = "Each attachment must have at least one access option selected"
          break
        }
      }
    }

    return stepErrors
  }

  const validateLocation = (location: { city: string; country: string }): string | undefined => {
    if (!location.city || location.city.trim() === "") {
      return "City is required"
    }
    if (location.city.trim().length < 2) {
      return "City name must be at least 2 characters"
    }
    if (location.city.trim().length > 100) {
      return "City name must not exceed 100 characters"
    }
    if (location.country && location.country.trim().length > 100) {
      return "Country name must not exceed 100 characters"
    }
    return undefined
  }

  // Validate all form fields
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validate basic fields
    const titleError = validateTitle(formData.title)
    if (titleError) newErrors.title = titleError

    const shortDescError = validateShortDescription(formData.shortDescription)
    if (shortDescError) newErrors.shortDescription = shortDescError

    const descriptionError = validateDescription(formData.description)
    if (descriptionError) newErrors.description = descriptionError

    const companyError = validateCompany(formData.company)
    if (companyError) newErrors.company = companyError

    const totalPositionsError = validateTotalPositions(formData.totalPositions)
    if (totalPositionsError) newErrors.totalPositions = totalPositionsError

    const minExperienceError = validateMinimumExperience(formData.minimumExperience)
    if (minExperienceError) newErrors.minimumExperience = minExperienceError

    const minSalaryError = validateMinimumSalary(formData.minimumSalary)
    if (minSalaryError) newErrors.minimumSalary = minSalaryError

    // Validate date range
    const dateErrors = validateDateRange(formData.postFrom, formData.postTo)
    if (dateErrors.postFrom) newErrors.postFrom = dateErrors.postFrom
    if (dateErrors.postTo) newErrors.postTo = dateErrors.postTo

    // Validate locations
    if (locations.length === 0) {
      newErrors.locations = "At least one location is required"
    } else {
      for (let i = 0; i < locations.length; i++) {
        const locError = validateLocation(locations[i])
        if (locError) {
          newErrors.locations = `Location ${i + 1}: ${locError}`
          break
        }
      }
    }

    // Validate workflow steps
    if (workflowSteps.length === 0) {
      newErrors.workflowSteps = { 0: { stepName: "At least one workflow step is required" } }
    } else {
      const stepErrors: Record<number, any> = {}
      workflowSteps.forEach((step, index) => {
        const errors = validateWorkflowStep(step, index)
        if (Object.keys(errors).length > 0) {
          stepErrors[index] = errors
        }
      })
      if (Object.keys(stepErrors).length > 0) {
        newErrors.workflowSteps = stepErrors
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle field blur for real-time validation
  const handleBlur = (fieldName: string, value: any) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }))

    let error: string | undefined

    switch (fieldName) {
      case "title":
        error = validateTitle(value)
        break
      case "shortDescription":
        error = validateShortDescription(value)
        break
      case "description":
        error = validateDescription(value)
        break
      case "company":
        error = validateCompany(value)
        break
      case "totalPositions":
        error = validateTotalPositions(Number(value))
        break
      case "minimumExperience":
        error = validateMinimumExperience(value)
        break
      case "minimumSalary":
        error = validateMinimumSalary(value)
        break
      case "postFrom":
      case "postTo":
        const dateErrors = validateDateRange(
          fieldName === "postFrom" ? value : formData.postFrom,
          fieldName === "postTo" ? value : formData.postTo
        )
        error = fieldName === "postFrom" ? dateErrors.postFrom : dateErrors.postTo
        break
    }

    if (error) {
      setErrors(prev => ({ ...prev, [fieldName]: error }))
    } else {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName as keyof FormErrors]
        return newErrors
      })
    }
  }

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
    
    // Validate all fields before submission
    if (!validateForm()) {
      // Mark all fields as touched to show errors
      const allTouched: Record<string, boolean> = {}
      Object.keys(formData).forEach(key => {
        allTouched[key] = true
      })
      setTouched(allTouched)
      
      // Scroll to first error
      const firstErrorField = document.querySelector('[data-error="true"]')
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

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
          jobType: formData.jobType,
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
        // Handle API validation errors
        if (data.error) {
          setErrors(prev => ({ ...prev, ...(typeof data.error === 'string' ? { _general: data.error } : data.error) }))
          
          // Show error alert with details
          let errorMessage = "Failed to create job:\n"
          if (typeof data.error === 'string') {
            errorMessage += data.error
          } else if (data.errors && Array.isArray(data.errors)) {
            errorMessage += data.errors.join('\n')
          }
          alert(errorMessage)
        } else {
          alert("Failed to create job. Please check all fields and try again.")
        }
      }
    } catch (error) {
      console.error("Error creating job:", error)
      setErrors(prev => ({ ...prev, _general: "An unexpected error occurred. Please try again." }))
      alert("Failed to create job. Please check your connection and try again.")
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
          {/* General Error Display */}
          {errors._general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800 mb-1">Error</h3>
                <p className="text-sm text-red-700">{errors._general}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrors(prev => {
                  const newErrors = { ...prev }
                  delete newErrors._general
                  return newErrors
                })}
                className="text-red-600 hover:text-red-800"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
          
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
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value })
                  if (touched.title || errors.title) {
                    handleBlur("title", e.target.value)
                  }
                }}
                onBlur={(e) => handleBlur("title", e.target.value)}
                data-error={errors.title ? "true" : "false"}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none hover:border-gray-400 ${
                  errors.title ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
                placeholder="e.g., Senior Software Engineer"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.title}
                </p>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Short Description
              </label>
              <textarea
                value={formData.shortDescription}
                onChange={(e) => {
                  setFormData({ ...formData, shortDescription: e.target.value })
                  if (touched.shortDescription || errors.shortDescription) {
                    handleBlur("shortDescription", e.target.value)
                  }
                }}
                onBlur={(e) => handleBlur("shortDescription", e.target.value)}
                data-error={errors.shortDescription ? "true" : "false"}
                rows={3}
                maxLength={300}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none hover:border-gray-400 bg-white text-gray-900 placeholder:text-gray-400 resize-none ${
                  errors.shortDescription ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
                placeholder="A brief summary of the job (max 300 characters)..."
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  {formData.shortDescription.length}/300 characters
                </p>
                {errors.shortDescription && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.shortDescription}
                  </p>
                )}
              </div>
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
                Job Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.jobType}
                onChange={(e) => setFormData({ ...formData, jobType: e.target.value as "NORMAL" | "BULK" })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none hover:border-gray-400 bg-white"
              >
                <option value="NORMAL">Normal Hiring</option>
                <option value="BULK">Bulk Hiring</option>
              </select>
              {formData.jobType === "BULK" && (
                <p className="mt-2 text-sm text-blue-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Bulk hiring requires admin shortlisting after the end date
                </p>
              )}
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
                Post From <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.postFrom}
                onChange={(e) => {
                  setFormData({ ...formData, postFrom: e.target.value })
                  if (touched.postFrom || errors.postFrom) {
                    handleBlur("postFrom", e.target.value)
                  }
                  // Also revalidate postTo when postFrom changes
                  if (formData.postTo) {
                    handleBlur("postTo", formData.postTo)
                  }
                }}
                onBlur={(e) => handleBlur("postFrom", e.target.value)}
                data-error={errors.postFrom ? "true" : "false"}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.postFrom ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
              />
              {errors.postFrom && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.postFrom}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Post To <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.postTo}
                onChange={(e) => {
                  setFormData({ ...formData, postTo: e.target.value })
                  if (touched.postTo || errors.postTo) {
                    handleBlur("postTo", e.target.value)
                  }
                }}
                onBlur={(e) => handleBlur("postTo", e.target.value)}
                data-error={errors.postTo ? "true" : "false"}
                min={formData.postFrom || new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.postTo ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
              />
              {errors.postTo && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.postTo}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Experience
              </label>
              <input
                type="text"
                value={formData.minimumExperience}
                onChange={(e) => {
                  setFormData({ ...formData, minimumExperience: e.target.value })
                  if (touched.minimumExperience || errors.minimumExperience) {
                    handleBlur("minimumExperience", e.target.value)
                  }
                }}
                onBlur={(e) => handleBlur("minimumExperience", e.target.value)}
                data-error={errors.minimumExperience ? "true" : "false"}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.minimumExperience ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
                placeholder="e.g., 3-5 years"
              />
              {errors.minimumExperience && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.minimumExperience}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Positions <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={formData.totalPositions}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  setFormData({ ...formData, totalPositions: value })
                  if (touched.totalPositions || errors.totalPositions) {
                    handleBlur("totalPositions", value)
                  }
                }}
                onBlur={(e) => handleBlur("totalPositions", Number(e.target.value))}
                data-error={errors.totalPositions ? "true" : "false"}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.totalPositions ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
                placeholder="e.g., 3"
              />
              {errors.totalPositions && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.totalPositions}
                </p>
              )}
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
                onChange={(e) => {
                  setFormData({ ...formData, minimumSalary: e.target.value })
                  if (touched.minimumSalary || errors.minimumSalary) {
                    handleBlur("minimumSalary", e.target.value)
                  }
                }}
                onBlur={(e) => handleBlur("minimumSalary", e.target.value)}
                data-error={errors.minimumSalary ? "true" : "false"}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.minimumSalary ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
                placeholder="e.g., $90,000 - $130,000"
              />
              {errors.minimumSalary && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.minimumSalary}
                </p>
              )}
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
                Description <span className="text-red-500">*</span>
              </label>
              <div data-error={errors.description ? "true" : "false"} className={errors.description ? "border-2 border-red-500 rounded-lg p-2" : ""}>
                <TextEditor
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value })
                    if (touched.description || errors.description) {
                      handleBlur("description", e.target.value)
                    }
                  }}
                  minHeight="240px"
                />
              </div>
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.description}
                </p>
              )}
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Job Locations <span className="text-red-500">*</span>
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newLocation.city}
                onChange={(e) => {
                  setNewLocation({ ...newLocation, city: e.target.value })
                  setLocationError("")
                }}
                className={`w-full px-3 py-2 border rounded-md ${
                  locationError ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
                placeholder="e.g., New York"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                value={newLocation.country}
                onChange={(e) => {
                  setNewLocation({ ...newLocation, country: e.target.value })
                  setLocationError("")
                }}
                className={`w-full px-3 py-2 border rounded-md ${
                  locationError ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
                placeholder="e.g., USA"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                onClick={() => {
                  const error = validateLocation(newLocation)
                  if (error) {
                    setLocationError(error)
                    return
                  }
                  
                  // Check for duplicate locations
                  const isDuplicate = locations.some(
                    loc => loc.city.trim().toLowerCase() === newLocation.city.trim().toLowerCase() &&
                    (loc.country?.trim().toLowerCase() || "") === (newLocation.country?.trim().toLowerCase() || "")
                  )
                  
                  if (isDuplicate) {
                    setLocationError("This location already exists")
                    return
                  }
                  
                  setLocations([...locations, { city: newLocation.city.trim(), country: newLocation.country.trim() }])
                  setNewLocation({ city: "", country: "" })
                  setLocationError("")
                  // Clear location error in main errors
                  setErrors(prev => {
                    const newErrors = { ...prev }
                    delete newErrors.locations
                    return newErrors
                  })
                }}
              >
                + Add Location
              </button>
            </div>
          </div>
          {locationError && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {locationError}
            </p>
          )}
          {errors.locations && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.locations}
            </p>
          )}
          {locations.length > 0 && (
            <ul className="mt-3 list-disc list-inside text-sm text-gray-700">
              {locations.map((loc, idx) => (
                <li key={`${loc.city}-${idx}`} className="flex justify-between items-center">
                  <span>{loc.city}{loc.country ? `, ${loc.country}` : ""}</span>
                  <button 
                    type="button" 
                    className="text-red-600 hover:text-red-800" 
                    onClick={() => {
                      setLocations(locations.filter((_, i) => i !== idx))
                      // Revalidate after removal
                      if (locations.length === 1) {
                        setErrors(prev => ({ ...prev, locations: "At least one location is required" }))
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.locations
                          return newErrors
                        })
                      }
                    }}
                  >
                    Remove
                  </button>
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
                    Step Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={step.stepName}
                    onChange={(e) => {
                      handleStepChange(index, "stepName", e.target.value)
                      // Clear error when step name is selected
                      if (errors.workflowSteps?.[index]?.stepName && e.target.value) {
                        setErrors(prev => {
                          const newErrors = { ...prev }
                          if (newErrors.workflowSteps?.[index]) {
                            delete newErrors.workflowSteps[index].stepName
                            if (Object.keys(newErrors.workflowSteps[index]).length === 0) {
                              delete newErrors.workflowSteps[index]
                              if (Object.keys(newErrors.workflowSteps || {}).length === 0) {
                                delete newErrors.workflowSteps
                              }
                            }
                          }
                          return newErrors
                        })
                      }
                    }}
                    onBlur={() => {
                      const stepErrors = validateWorkflowStep(step, index)
                      if (stepErrors.stepName || errors.workflowSteps?.[index]?.stepName) {
                        setErrors(prev => ({
                          ...prev,
                          workflowSteps: {
                            ...prev.workflowSteps,
                            [index]: {
                              ...prev.workflowSteps?.[index],
                              stepName: stepErrors.stepName
                            }
                          }
                        }))
                      }
                    }}
                    data-error={errors.workflowSteps?.[index]?.stepName ? "true" : "false"}
                    className={`w-full px-3 py-2 border rounded-md ${
                      errors.workflowSteps?.[index]?.stepName ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select step</option>
                    {stepOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {errors.workflowSteps?.[index]?.stepName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.workflowSteps[index].stepName}
                    </p>
                  )}
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
                    max={1440}
                    value={step.durationMins ?? ""}
                    onChange={(e) => {
                      const value = e.target.value === "" ? undefined : Number(e.target.value)
                      handleStepChange(index, "durationMins", value)
                      // Clear error when value is valid
                      if (errors.workflowSteps?.[index]?.durationMins) {
                        const stepErrors = validateWorkflowStep({ ...step, durationMins: value }, index)
                        if (!stepErrors.durationMins) {
                          setErrors(prev => {
                            const newErrors = { ...prev }
                            if (newErrors.workflowSteps?.[index]) {
                              delete newErrors.workflowSteps[index].durationMins
                              if (Object.keys(newErrors.workflowSteps[index]).length === 0) {
                                delete newErrors.workflowSteps[index]
                                if (Object.keys(newErrors.workflowSteps || {}).length === 0) {
                                  delete newErrors.workflowSteps
                                }
                              }
                            }
                            return newErrors
                          })
                        }
                      }
                    }}
                    onBlur={() => {
                      const stepErrors = validateWorkflowStep(step, index)
                      if (stepErrors.durationMins || errors.workflowSteps?.[index]?.durationMins) {
                        setErrors(prev => ({
                          ...prev,
                          workflowSteps: {
                            ...prev.workflowSteps,
                            [index]: {
                              ...prev.workflowSteps?.[index],
                              durationMins: stepErrors.durationMins
                            }
                          }
                        }))
                      }
                    }}
                    data-error={errors.workflowSteps?.[index]?.durationMins ? "true" : "false"}
                    className={`w-full px-3 py-2 border rounded-md ${
                      errors.workflowSteps?.[index]?.durationMins ? "border-red-500 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder="e.g., 60"
                  />
                  {errors.workflowSteps?.[index]?.durationMins && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.workflowSteps[index].durationMins}
                    </p>
                  )}
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
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meeting Link <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={step.meetingLink || ""}
                      onChange={(e) => {
                        handleStepChange(index, "meetingLink", e.target.value)
                        // Clear error when valid URL is entered
                        if (errors.workflowSteps?.[index]?.meetingLink && e.target.value) {
                          try {
                            const url = new URL(e.target.value)
                            if (["http:", "https:", "zoom:", "teams:", "skype:"].some(protocol => url.protocol.startsWith(protocol))) {
                              setErrors(prev => {
                                const newErrors = { ...prev }
                                if (newErrors.workflowSteps?.[index]) {
                                  delete newErrors.workflowSteps[index].meetingLink
                                  if (Object.keys(newErrors.workflowSteps[index]).length === 0) {
                                    delete newErrors.workflowSteps[index]
                                    if (Object.keys(newErrors.workflowSteps || {}).length === 0) {
                                      delete newErrors.workflowSteps
                                    }
                                  }
                                }
                                return newErrors
                              })
                            }
                          } catch {}
                        }
                      }}
                      onBlur={() => {
                        const stepErrors = validateWorkflowStep(step, index)
                        if (stepErrors.meetingLink || errors.workflowSteps?.[index]?.meetingLink) {
                          setErrors(prev => ({
                            ...prev,
                            workflowSteps: {
                              ...prev.workflowSteps,
                              [index]: {
                                ...prev.workflowSteps?.[index],
                                meetingLink: stepErrors.meetingLink
                              }
                            }
                          }))
                        }
                      }}
                      data-error={errors.workflowSteps?.[index]?.meetingLink ? "true" : "false"}
                      className={`w-full px-3 py-2 border rounded-md ${
                        errors.workflowSteps?.[index]?.meetingLink ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                      placeholder="https://meet.google.com/... or zoom://..."
                      required={step.interviewMode === "Remote"}
                    />
                    {errors.workflowSteps?.[index]?.meetingLink && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.workflowSteps[index].meetingLink}
                      </p>
                    )}
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
                      
                      // Validate file sizes before adding
                      let hasError = false
                      const maxSize = 10 * 1024 * 1024 // 10MB
                      
                      for (const file of files) {
                        if (file.size > maxSize) {
                          setErrors(prev => ({
                            ...prev,
                            workflowSteps: {
                              ...prev.workflowSteps,
                              [index]: {
                                ...prev.workflowSteps?.[index],
                                attachments: `File "${file.name}" exceeds 10MB size limit`
                              }
                            }
                          }))
                          hasError = true
                          e.target.value = ""
                          return
                        }
                      }
                      
                      // Clear attachment error if validation passes
                      if (errors.workflowSteps?.[index]?.attachments && !hasError) {
                        setErrors(prev => {
                          const newErrors = { ...prev }
                          if (newErrors.workflowSteps?.[index]) {
                            delete newErrors.workflowSteps[index].attachments
                            if (Object.keys(newErrors.workflowSteps[index]).length === 0) {
                              delete newErrors.workflowSteps[index]
                              if (Object.keys(newErrors.workflowSteps || {}).length === 0) {
                                delete newErrors.workflowSteps
                              }
                            }
                          }
                          return newErrors
                        })
                      }
                      
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
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  />
                  {errors.workflowSteps?.[index]?.attachments && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1 mb-3">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.workflowSteps[index].attachments}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mb-3">
                    Maximum file size: 10MB. Allowed formats: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG
                  </p>
                  
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
                                      // Clear error if access is set
                                      if (errors.workflowSteps?.[index]?.attachments) {
                                        setErrors(prev => {
                                          const newErrors = { ...prev }
                                          if (newErrors.workflowSteps?.[index]) {
                                            delete newErrors.workflowSteps[index].attachments
                                            if (Object.keys(newErrors.workflowSteps[index]).length === 0) {
                                              delete newErrors.workflowSteps[index]
                                              if (Object.keys(newErrors.workflowSteps || {}).length === 0) {
                                                delete newErrors.workflowSteps
                                              }
                                            }
                                          }
                                          return newErrors
                                        })
                                      }
                                    } else {
                                      // Prevent removing if it's the last option
                                      const newAccess = currentAccess.filter(a => a !== "CANDIDATE")
                                      if (newAccess.length === 0) {
                                        setErrors(prev => ({
                                          ...prev,
                                          workflowSteps: {
                                            ...prev.workflowSteps,
                                            [index]: {
                                              ...prev.workflowSteps?.[index],
                                              attachments: "Each attachment must have at least one access option selected"
                                            }
                                          }
                                        }))
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
                                      // Clear error if access is set
                                      if (errors.workflowSteps?.[index]?.attachments) {
                                        setErrors(prev => {
                                          const newErrors = { ...prev }
                                          if (newErrors.workflowSteps?.[index]) {
                                            delete newErrors.workflowSteps[index].attachments
                                            if (Object.keys(newErrors.workflowSteps[index]).length === 0) {
                                              delete newErrors.workflowSteps[index]
                                              if (Object.keys(newErrors.workflowSteps || {}).length === 0) {
                                                delete newErrors.workflowSteps
                                              }
                                            }
                                          }
                                          return newErrors
                                        })
                                      }
                                    } else {
                                      // Prevent removing if it's the last option
                                      const newAccess = currentAccess.filter(a => a !== "INTERVIEWER")
                                      if (newAccess.length === 0) {
                                        setErrors(prev => ({
                                          ...prev,
                                          workflowSteps: {
                                            ...prev.workflowSteps,
                                            [index]: {
                                              ...prev.workflowSteps?.[index],
                                              attachments: "Each attachment must have at least one access option selected"
                                            }
                                          }
                                        }))
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

