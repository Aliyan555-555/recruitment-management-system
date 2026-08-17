"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import { addSkillToList, sanitizeSkillInput } from "@/lib/skills"

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
  workflowSteps?: {
    [key: number]: {
      stepType?: string
      stepName?: string
      meetingLink?: string
      durationMins?: string
      weightage?: string
      scoreThreshold?: string

      interviewMode?: string
    }
    _general?: string
  }
}

interface WorkflowStep {
  stepName?: string // Kept for display/compatibility
  stepType: string // Required enum
  stepOrder: number
  interviewerId?: string
  durationMins?: number
  weightage?: number
  scoreThreshold?: number
  interviewMode?: string
  meetingLink?: string

}

export default function EditJobPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [locations, setLocations] = useState<{ city: string; country: string }[]>([])
  const [newLocation, setNewLocation] = useState<{ city: string; country: string }>({ city: "", country: "" })
  const [locationError, setLocationError] = useState<string>("")
  const [educationLevels, setEducationLevels] = useState<{ id: string; name: string }[]>([])

  const stepTypeOptions = useMemo(() => [
    { value: "TEST", label: "Test" },
    { value: "SCREENING_INTERVIEW", label: "Screening Interview" },
    { value: "FOCUS_GROUP", label: "Focus Group" },
    { value: "FINAL_INTERVIEW", label: "Final Interview" },
    { value: "OFFER", label: "Offer" },
  ], [])

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
    successCriteria: "",
    benefits: "",
    skills: [] as Array<{ skillName: string; priority: "REQUIRED" | "PREFERRED" }>,
  })
  const [skillInput, setSkillInput] = useState("")

  const handleAddJobSkill = () => {
    const rawInput = sanitizeSkillInput(skillInput)
    if (!rawInput) return
    const exists = formData.skills.some(
      (s) => s.skillName.toUpperCase() === rawInput.toUpperCase()
    )
    if (exists) {
      toast.error("Skill already added")
      return
    }
    setFormData({
      ...formData,
      skills: [...formData.skills, { skillName: rawInput.toUpperCase(), priority: "REQUIRED" }],
    })
    setSkillInput("")
  }



  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([])
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Load job data and education levels
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch education levels
        try {
          const eduRes = await fetch("/api/admin/education-levels")
          if (eduRes.ok) {
            const eduData = await eduRes.json()
            setEducationLevels(eduData)
          }
        } catch (error) {
          console.error("Error fetching education levels:", error)
        }

        // Fetch Job Data
        const res = await fetch(`/api/admin/jobs/${jobId}`)
        if (!res.ok) {
          if (res.status === 404) {
            router.push("/admin/jobs")
            return
          }
          throw new Error("Failed to load job")
        }
        const data = await res.json()
        const job = data.job

        // Populate form data
        setFormData({
          title: job.title || "",
          shortDescription: job.shortDescription ?? "",
          description: job.description || "",
          company: job.company || "",
          postFrom: job.postFrom || "",
          postTo: job.postTo || "",
          employmentType: job.employmentType || "Permanent",
          employmentShift: job.employmentShift || "Morning",
          status: job.status !== undefined ? job.status : true,
          totalPositions: job.totalPositions || 1,
          department: job.industry ?? "",
          minimumExperience: job.minimumExperience ?? "",
          minimumSalary: job.minimumSalary ?? "",
          certification: job.certification ?? "",
          minEducation: job.educationRequirements?.[0]?.educationLevel?.name || job.educationRequirements?.[0]?.educationLevel || "",
          successCriteria: job.successCriteria ?? "",
          benefits: job.benefits ?? "",
          skills: job.skills?.map((s: any) =>
            typeof s === "string"
              ? { skillName: s, priority: "REQUIRED" }
              : { skillName: s.skillName, priority: s.priority || "REQUIRED" }
          ) || [],
        })

        // Populate locations
        if (job.locations && job.locations.length > 0) {
          setLocations(job.locations.map((loc: any) => ({
            city: loc.city,
            country: loc.country || ""
          })))
        }

        // Populate workflow steps
        if (job.workflow?.steps && job.workflow.steps.length > 0) {
          const steps = job.workflow.steps.map((step: any) => ({
            stepName: step.stepName || "", // For display if needed
            stepType: step.stepType || "", // This should be mapped to ENUM values if possible
            stepOrder: step.stepOrder || 1,
            interviewerId: step.interviewerId || undefined,
            durationMins: step.durationMins || undefined,
            weightage: step.weightage || undefined,
            scoreThreshold: step.scoreThreshold || undefined,
            interviewMode: step.interviewMode || undefined,
            meetingLink: step.meetingLink || undefined,

          }))
          setWorkflowSteps(steps)
        } else {
          // If no workflow, create one empty step
          setWorkflowSteps([{
            stepType: "",
            stepOrder: 1,
          }])
        }
      } catch (error) {
        console.error("Error loading job:", error)
        setErrors({ _general: "Failed to load job data. Please try again." })
        setStatusMessage({ type: "error", message: "Failed to load job data. Please try again." })
      } finally {
        setLoading(false)
      }
    }

    if (jobId) {
      fetchData()
    }
  }, [jobId, router])



  // Validation functions (same as create page)
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
    // const today = new Date()
    // today.setHours(0, 0, 0, 0)
    // if (date < today) {
    //   return `${fieldName} cannot be in the past`
    // }
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
      return undefined
    }
    const expPattern = /^(\d+[\+\-]?|\d+\s*-\s*\d+)\s*(years?|yrs?|year|yr)?$/i
    if (!expPattern.test(exp.trim())) {
      return "Please enter a valid experience format (e.g., '2-3 years', '5+ years', '1 year')"
    }
    return undefined
  }

  const validateMinimumSalary = (salary: string): string | undefined => {
    if (!salary || salary.trim() === "") {
      return undefined
    }
    const salaryPattern = /^[\$]?[\d,]+([kK]|[\-\s]+[\$]?[\d,]+[kK]?)?$/i
    if (!salaryPattern.test(salary.trim())) {
      return "Please enter a valid salary format (e.g., '$50,000', '50000-70000', '$50k-$70k')"
    }
    return undefined
  }

  const validateWorkflowStep = (step: WorkflowStep, index: number): Record<string, string> => {
    const stepErrors: Record<string, string> = {}

    if (!step.stepType || step.stepType.trim() === "") {
      stepErrors.stepType = "Step type is required"
    }

    if (step.stepType === "OFFER" && index < workflowSteps.length - 1) {
      stepErrors.stepType = "Offer step must be the last step in the workflow"
    }

    if (["SCREENING_INTERVIEW", "FOCUS_GROUP", "FINAL_INTERVIEW"].includes(step.stepType)) {
      if (!step.interviewMode || step.interviewMode.trim() === "") {
        stepErrors.interviewMode = "Interview mode is required"
      }
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

  const pruneNestedErrors = (obj: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = {}
    Object.entries(obj).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return
      }
      if (typeof value === "object" && !Array.isArray(value)) {
        const cleaned = pruneNestedErrors(value)
        if (Object.keys(cleaned).length > 0) {
          result[key] = cleaned
        }
      } else {
        result[key] = value
      }
    })
    return result
  }

  const pruneFormErrors = (errors: FormErrors): FormErrors => {
    const cleaned = pruneNestedErrors(errors as unknown as Record<string, any>)
    return cleaned as FormErrors
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    newErrors.title = validateTitle(formData.title)
    newErrors.shortDescription = validateShortDescription(formData.shortDescription)
    newErrors.description = validateDescription(formData.description)
    newErrors.company = validateCompany(formData.company)
    newErrors.totalPositions = validateTotalPositions(formData.totalPositions)
    newErrors.minimumExperience = validateMinimumExperience(formData.minimumExperience)
    newErrors.minimumSalary = validateMinimumSalary(formData.minimumSalary)

    const dateErrors = validateDateRange(formData.postFrom, formData.postTo)
    if (dateErrors.postFrom) newErrors.postFrom = dateErrors.postFrom
    if (dateErrors.postTo) newErrors.postTo = dateErrors.postTo

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

    const cleanedErrors = pruneFormErrors(newErrors)
    setErrors(cleanedErrors)
    return Object.keys(cleanedErrors).length === 0
  }

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
        stepType: "",
        stepOrder: workflowSteps.length + 1,
      }
    ])
  }

  const handleRemoveStep = (index: number) => {
    if (workflowSteps.length > 1) {
      const newSteps = workflowSteps.filter((_, i) => i !== index)
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
    setStatusMessage(null)

    if (!validateForm()) {
      const allTouched: Record<string, boolean> = {}
      Object.keys(formData).forEach(key => {
        allTouched[key] = true
      })
      setTouched(allTouched)

      const firstErrorField = document.querySelector('[data-error="true"]')
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      setStatusMessage({ type: "error", message: "Please fix the highlighted errors before submitting." })
      return
    }

    setSaving(true)

    try {
      const transformedSteps = workflowSteps.map((step, index) => {
        // Create clean step object without temporary UI fields
        // Map simplified step to API structure 
        // Note: API likely expects stepName to be present or at least not null if it was used for display
        return {
          stepName: step.stepType, // Use stepType as name if name is empty, or keep existing logic
          stepOrder: step.stepOrder || (index + 1),
          isRequired: true, // Default to true as per new simplified logic
          isSkippable: false, // Default
          interviewerId: step.interviewerId || undefined,
          stepType: step.stepType || undefined,
          durationMins: step.durationMins !== undefined && step.durationMins !== null ? step.durationMins : undefined,
          weightage: step.weightage !== undefined && step.weightage !== null ? step.weightage : undefined,
          scoreThreshold: step.scoreThreshold !== undefined && step.scoreThreshold !== null ? step.scoreThreshold : undefined,
          interviewMode: step.interviewMode || undefined,
          meetingLink: step.meetingLink || undefined,
        }
      })

      // Helper to convert empty strings to undefined
      const cleanString = (value: string | undefined | null): string | undefined => {
        if (!value || value.trim() === "") return undefined
        return value.trim()
      }

      const requestBody = {
        title: formData.title.trim(),
        shortDescription: cleanString(formData.shortDescription),
        description: formData.description.trim(),
        company: formData.company.trim(),
        postFrom: formData.postFrom,
        postTo: formData.postTo,
        employmentType: formData.employmentType,
        employmentShift: formData.employmentShift,
        totalPositions: Number(formData.totalPositions) || 1,
        industry: cleanString(formData.department),
        minimumExperience: cleanString(formData.minimumExperience),
        certification: cleanString(formData.certification),
        minimumSalary: cleanString(formData.minimumSalary),
        successCriteria: cleanString(formData.successCriteria),
        benefits: cleanString(formData.benefits),
        status: formData.status,
        skills: formData.skills,
        workflowSteps: transformedSteps,
        locations: locations,
        educationRequirements: formData.minEducation ? [{ educationLevelName: formData.minEducation, isRequired: true }] : [],
      }

      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (response.ok) {
        setStatusMessage({ type: "success", message: "Job updated successfully. Redirecting to jobs list..." })
        router.push("/admin/jobs")
      } else {
        if (data.error) {
          setErrors(prev => ({ ...prev, _general: data.error }))
          setStatusMessage({ type: "error", message: data.error })
        } else {
          const fallbackMessage = "Failed to update job. Please check all fields and try again."
          setErrors(prev => ({ ...prev, _general: fallbackMessage }))
          setStatusMessage({ type: "error", message: fallbackMessage })
        }
      }
    } catch (error) {
      console.error("Error updating job:", error)
      setErrors(prev => ({ ...prev, _general: "An unexpected error occurred. Please try again." }))
      setStatusMessage({
        type: "error",
        message: `Failed to update job: ${error instanceof Error ? error.message : "Unknown error"}`
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-card rounded-xl shadow-lg border border-border p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading job data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Edit Job</h1>
            <p className="text-muted-foreground">Update the job details and requirements</p>
          </div>
          <Link
            href="/admin/jobs"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-all duration-200 shadow-sm hover:shadow"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Jobs
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {statusMessage && (
            <div
              className={`rounded-lg border p-4 flex items-start gap-3 ${statusMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                : "bg-destructive/10 border-destructive/20 text-destructive"
                }`}
              role="status"
              aria-live="polite"
            >
              <svg
                className="w-5 h-5 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {statusMessage.type === "success" ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              <div className="flex-1 text-sm">
                <p className="font-semibold">{statusMessage.type === "success" ? "Success" : "Attention"}</p>
                <p>{statusMessage.message}</p>
              </div>
              <button
                type="button"
                className="text-current hover:opacity-75"
                onClick={() => setStatusMessage(null)}
              >
                <span className="sr-only">Dismiss</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* General Error Display */}
          {errors._general && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-destructive mb-1">Error</h3>
                <p className="text-sm text-destructive">{errors._general}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrors(prev => {
                  const newErrors = { ...prev }
                  delete newErrors._general
                  return newErrors
                })}
                className="text-destructive hover:text-destructive/80"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* Job Details - Copy all the form fields from create page */}
          <div className="bg-card rounded-xl shadow-lg border border-border p-6 md:p-8 transition-all duration-200 hover:shadow-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground">Job Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Title */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-foreground mb-2">
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 outline-none hover:border-accent ${errors.title ? "border-destructive bg-destructive/10" : "border-input bg-background"
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

              {/* Short Description */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-foreground mb-2">
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
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 outline-none hover:border-accent bg-background text-foreground placeholder:text-muted-foreground resize-none ${errors.shortDescription ? "border-destructive bg-destructive/10" : "border-input"
                    }`}
                  placeholder="A brief summary of the job (max 300 characters)..."
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-muted-foreground">
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

              {/* Company - Read-only */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Company <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.company}
                    disabled
                    readOnly
                    className="w-full px-4 py-2.5 border border-input rounded-lg bg-muted cursor-not-allowed text-muted-foreground"
                    title="Company name is set from organization configuration"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Employment Type */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Employment Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.employmentType}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                  className="w-full px-4 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 outline-none hover:border-accent bg-background"
                >
                  <option value="Permanent">Permanent</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>

              {/* Shift */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Shift
                </label>
                <select
                  value={formData.employmentShift}
                  onChange={(e) => setFormData({ ...formData, employmentShift: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                  <option value="Rotational">Rotational</option>
                </select>
              </div>

              {/* Post From */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
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
                    if (formData.postTo) {
                      handleBlur("postTo", formData.postTo)
                    }
                  }}
                  onBlur={(e) => handleBlur("postFrom", e.target.value)}
                  data-error={errors.postFrom ? "true" : "false"}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 border rounded-md bg-background ${errors.postFrom ? "border-destructive bg-destructive/10" : "border-input"
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

              {/* Post To */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
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
                  className={`w-full px-3 py-2 border rounded-md bg-background ${errors.postTo ? "border-destructive bg-destructive/10" : "border-input"
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

              {/* Minimum Experience */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
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
                  className={`w-full px-3 py-2 border rounded-md bg-background ${errors.minimumExperience ? "border-destructive bg-destructive/10" : "border-input"
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

              {/* Number of Positions */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
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
                  className={`w-full px-3 py-2 border rounded-md bg-background ${errors.totalPositions ? "border-destructive bg-destructive/10" : "border-input"
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

              {/* Salary Range */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
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
                  className={`w-full px-3 py-2 border rounded-md bg-background ${errors.minimumSalary ? "border-destructive bg-destructive/10" : "border-input"
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

              {/* Minimum Education */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Minimum Education
                </label>
                <select
                  value={formData.minEducation}
                  onChange={(e) => setFormData({ ...formData, minEducation: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md"
                >
                  <option value="">Select minimum education</option>
                  {educationLevels.length > 0 ? (
                    educationLevels.map((level) => (
                      <option key={level.id} value={level.name}>
                        {level.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="High School Diploma">High School Diploma</option>
                      <option value="Associate Degree">Associate Degree</option>
                      <option value="Bachelor's Degree">Bachelor&apos;s Degree</option>
                      <option value="Master's Degree">Master&apos;s Degree</option>
                      <option value="Doctorate / PhD">Doctorate / PhD</option>
                    </>
                  )}
                </select>
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
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

              {/* Skills */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Skills
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(sanitizeSkillInput(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddJobSkill()
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
                    placeholder="e.g., JAVASCRIPT, REACT, NODE.JS"
                  />
                  <button
                    type="button"
                    onClick={handleAddJobSkill}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Add
                  </button>
                </div>
                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skillItem, skillIndex) => (
                      <span
                        key={skillIndex}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                      >
                        <span>{skillItem.skillName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...formData.skills]
                            updated[skillIndex].priority =
                              updated[skillIndex].priority === "REQUIRED" ? "PREFERRED" : "REQUIRED"
                            setFormData({ ...formData, skills: updated })
                          }}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            skillItem.priority === "REQUIRED"
                              ? "bg-rose-500 text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {skillItem.priority}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formData.skills.filter((_, i) => i !== skillIndex)
                            setFormData({ ...formData, skills: updated })
                          }}
                          className="ml-1 text-primary hover:text-primary font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Success Criteria (Optional)
                </label>
                <textarea
                  value={formData.successCriteria}
                  onChange={(e) => setFormData({ ...formData, successCriteria: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  placeholder="Describe what makes a strong candidate for this role (e.g. Proven track record of leading cross-functional teams, experience in high-volume microservices architecture)..."
                />
              </div>

              {/* Status */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
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

          {/* Locations - Same as create page */}
          <div className="bg-card rounded-lg shadow p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Job Locations <span className="text-red-500">*</span>
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">City <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newLocation.city}
                  onChange={(e) => {
                    setNewLocation({ ...newLocation, city: e.target.value })
                    setLocationError("")
                  }}
                  className={`w-full px-3 py-2 border rounded-md bg-background ${locationError ? "border-destructive bg-destructive/10" : "border-input"
                    }`}
                  placeholder="e.g., New York"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Country</label>
                <input
                  type="text"
                  value={newLocation.country}
                  onChange={(e) => {
                    setNewLocation({ ...newLocation, country: e.target.value })
                    setLocationError("")
                  }}
                  className={`w-full px-3 py-2 border rounded-md bg-background ${locationError ? "border-destructive bg-destructive/10" : "border-input"
                    }`}
                  placeholder="e.g., USA"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  className="w-full px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
                  onClick={() => {
                    const error = validateLocation(newLocation)
                    if (error) {
                      setLocationError(error)
                      return
                    }

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
              <ul className="mt-3 list-disc list-inside text-sm text-foreground">
                {locations.map((loc, idx) => (
                  <li key={`${loc.city}-${idx}`} className="flex justify-between items-center">
                    <span>{loc.city}{loc.country ? `, ${loc.country}` : ""}</span>
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => {
                        setLocations(locations.filter((_, i) => i !== idx))
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
          <div className="bg-card rounded-lg shadow p-6 border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">Workflow Steps</h3>
              <button
                type="button"
                onClick={handleAddStep}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
              >
                + Add Step
              </button>
            </div>

            {workflowSteps.map((step, index) => (
              <div key={index} className="mb-4 p-4 border border-border rounded-md bg-card">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-foreground">Step {step.stepOrder}</h4>
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
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Step Type <span className="text-red-500">*</span>
                      {step.stepType === "OFFER" && (
                        <span className="ml-2 text-xs text-primary">(Must be last step)</span>
                      )}
                    </label>
                    <select
                      required
                      value={step.stepType || ""}
                      onChange={(e) => {
                        handleStepChange(index, "stepType", e.target.value)

                        // Clear error when step type is selected
                        if (errors.workflowSteps?.[index]?.stepType && e.target.value) {
                          setErrors(prev => {
                            const newErrors = { ...prev }
                            if (newErrors.workflowSteps?.[index]) {
                              delete newErrors.workflowSteps[index].stepType
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
                      className={`w-full px-3 py-2 border rounded-md bg-background ${errors.workflowSteps?.[index]?.stepType ? "border-destructive bg-destructive/10" : "border-input"
                        }`}
                    >
                      <option value="">Select type</option>
                      {stepTypeOptions.map(opt => {
                        const isSelectedInOtherStep = workflowSteps.some((s, i) => i !== index && s.stepType === opt.value)
                        return (
                          <option
                            key={opt.value}
                            value={opt.value}
                            disabled={(opt.value === "OFFER" && index < workflowSteps.length - 1) || isSelectedInOtherStep}
                          >
                            {opt.label} {isSelectedInOtherStep ? "(Already added)" : ""}
                          </option>
                        )
                      })}
                    </select>
                    {errors.workflowSteps?.[index]?.stepType && (
                      <p className="mt-1 text-sm text-red-600">{errors.workflowSteps[index].stepType}</p>
                    )}
                    {step.stepType === "OFFER" && index === workflowSteps.length - 1 && (
                      <p className="mt-1 text-sm text-emerald-500 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Offer step is correctly placed as the final step
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Duration (mins)</label>
                    <input
                      type="number"
                      min={0}
                      max={1440}
                      value={step.durationMins ?? ""}
                      onChange={(e) => handleStepChange(index, "durationMins", e.target.value === "" ? undefined : Number(e.target.value))}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      placeholder="e.g., 60"
                    />
                    {errors.workflowSteps?.[index]?.durationMins && (
                      <p className="mt-1 text-sm text-red-600">{errors.workflowSteps[index].durationMins}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Interview Mode
                      {["SCREENING_INTERVIEW", "FOCUS_GROUP", "FINAL_INTERVIEW"].includes(step.stepType) && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    <select
                      value={step.interviewMode || ""}
                      onChange={(e) => handleStepChange(index, "interviewMode", e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md bg-background ${errors.workflowSteps?.[index]?.interviewMode ? "border-destructive bg-destructive/10" : "border-input"
                        }`}
                    >
                      <option value="">Select mode</option>
                      <option value="Onsite">Onsite</option>
                      <option value="Remote">Remote</option>
                    </select>
                    {errors.workflowSteps?.[index]?.interviewMode && (
                      <p className="mt-1 text-sm text-red-600">{errors.workflowSteps[index].interviewMode}</p>
                    )}
                  </div>

                  {step.interviewMode === "Remote" && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Meeting Link <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={step.meetingLink || ""}
                        onChange={(e) => handleStepChange(index, "meetingLink", e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md bg-background ${errors.workflowSteps?.[index]?.meetingLink ? "border-destructive bg-destructive/10" : "border-input"
                          }`}
                        placeholder="https://meet.google.com/... or zoom://..."
                        required={step.interviewMode === "Remote"}
                      />
                      {errors.workflowSteps?.[index]?.meetingLink && (
                        <p className="mt-1 text-sm text-red-600">{errors.workflowSteps[index].meetingLink}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Link
              href="/admin/jobs"
              className="px-6 py-2 border border-input text-foreground rounded-md hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || loading}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Updating..." : "Update Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
