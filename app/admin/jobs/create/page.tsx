"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { toast } from "sonner"

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
      interviewerIds?: string
    }
    _general?: string
  }
}

interface WorkflowStep {
  stepName?: string // Kept for backward compatibility/display
  stepType: string // Required: TEST, SCREENING_INTERVIEW, FOCUS_GROUP, FINAL_INTERVIEW, OFFER
  stepOrder: number
  interviewerId?: string
  durationMins?: number
  weightage?: number
  scoreThreshold?: number
  interviewMode?: string
  meetingLink?: string
  interviewerIds?: string[]
}

export default function CreateJobPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [locations, setLocations] = useState<{ city: string; country: string }[]>([])
  const [newLocation, setNewLocation] = useState<{ city: string; country: string }>({ city: "", country: "" })
  const [locationError, setLocationError] = useState<string>("")
  const [todayStr, setTodayStr] = useState("")

  useEffect(() => {
    setTodayStr(new Date().toLocaleDateString('en-CA'))
  }, [])

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
        const res = await fetch("/api/admin/organization")
        if (res.ok) {
          const data = await res.json()
          if (data) {
            setFormData(prev => ({ ...prev, company: data.name }))
          }
        }
      } catch (error) {
        console.error("Error loading company info:", error)
        // Fallback to default company name
        setFormData(prev => ({ ...prev, company: "RMS Organization" }))
      }
    }
    loadCompanyInfo()
  }, [])

  const pakistanCities = [
    "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad",
    "Multan", "Peshawar", "Quetta", "Sialkot", "Hyderabad", "Gujranwala"
  ]

  // Load interviewers list once
  useState(() => {
    ; (async () => {
      try {
        const res = await fetch("/api/admin/interviewers")
        if (res.ok) {
          const data = await res.json()
          const opts = (data.interviewers || []).map((i: any) => ({ id: i.id, name: `${i.firstname} ${i.lastname}`.trim() }))
          setInterviewers(opts)
        }
      } catch { }
    })()
    return undefined
  })

  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    {
      stepType: "",
      stepOrder: 1,
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

    // Parse date as local time to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)

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

    // Parse as local dates
    const [fromY, fromM, fromD] = postFrom.split('-').map(Number)
    const fromDate = new Date(fromY, fromM - 1, fromD)

    const [toY, toM, toD] = postTo.split('-').map(Number)
    const toDate = new Date(toY, toM - 1, toD)

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

    if (!step.stepType || step.stepType.trim() === "") {
      stepErrors.stepType = "Step type is required"
    }

    // Validate that Offer step is the last step
    if (step.stepType === "OFFER" && index < workflowSteps.length - 1) {
      stepErrors.stepType = "Offer step must be the last step in the workflow"
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

    if (!step.interviewerIds || step.interviewerIds.length === 0) {
      stepErrors.interviewerIds = "At least one interviewer is required"
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
      newErrors.workflowSteps = { 0: { stepType: "At least one workflow step is required" } }
    } else {
      // Check that Offer step exists and is last
      const offerStepIndex = workflowSteps.findIndex(s => s.stepType === "OFFER")
      if (offerStepIndex === -1) {
        newErrors.workflowSteps = { _general: "Offer step is mandatory and must be the last step" }
      } else if (offerStepIndex !== workflowSteps.length - 1) {
        newErrors.workflowSteps = { [offerStepIndex]: { stepType: "Offer step must be the last step" } }
      }

      const stepErrors: Record<number, any> = {}
      workflowSteps.forEach((step, index) => {
        const errors = validateWorkflowStep(step, index)
        if (Object.keys(errors).length > 0) {
          stepErrors[index] = errors
        }
      })
      if (Object.keys(stepErrors).length > 0) {
        // Merge step errors with existing workflowSteps errors
        if (newErrors.workflowSteps) {
          newErrors.workflowSteps = { ...newErrors.workflowSteps, ...stepErrors }
        } else {
          newErrors.workflowSteps = stepErrors
        }
      }
    }

    setErrors(newErrors)

    // Check if there are any errors (including nested workflow step errors)
    const topLevelKeys = Object.keys(newErrors).filter(key => key !== 'workflowSteps')
    if (topLevelKeys.length > 0) {
      return false
    }

    // Check workflow steps errors
    if (newErrors.workflowSteps) {
      const workflowKeys = Object.keys(newErrors.workflowSteps)
      if (workflowKeys.length > 0) {
        // Check if any workflow error has actual content
        for (const key of workflowKeys) {
          const value = newErrors.workflowSteps[key as keyof typeof newErrors.workflowSteps]
          if (typeof value === 'string' && (value as string).trim().length > 0) {
            return false // Found _general error
          }
          if (typeof value === 'object' && value !== null) {
            const errorObj = value as Record<string, string>
            if (Object.keys(errorObj).length > 0) {
              return false // Found step-specific error
            }
          }
        }
      }
    }

    return true
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
        stepType: "",
        stepOrder: workflowSteps.length + 1,
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
    const isValid = validateForm()
    if (!isValid) {
      // Mark all fields as touched to show errors
      const allTouched: Record<string, boolean> = {}
      Object.keys(formData).forEach(key => {
        allTouched[key] = true
      })
      setTouched(allTouched)

      // Count errors and show detailed toast
      const errorCount = Object.keys(errors).length
      const errorFields: string[] = []

      // Collect all error field names
      if (errors.title) errorFields.push("Job Title")
      if (errors.shortDescription) errorFields.push("Job Summary")
      if (errors.description) errorFields.push("Job Description")
      if (errors.company) errorFields.push("Company")
      if (errors.postFrom) errorFields.push("Post From Date")
      if (errors.postTo) errorFields.push("Post To Date")
      if (errors.employmentType) errorFields.push("Employment Type")
      if (errors.totalPositions) errorFields.push("Total Positions")
      if (errors.minimumExperience) errorFields.push("Minimum Experience")
      if (errors.minimumSalary) errorFields.push("Minimum Salary")
      if (errors.locations) errorFields.push("Locations")
      if (errors.workflowSteps) errorFields.push("Workflow Steps")

      // Show error toast with specific fields
      toast.error("Please fix the following errors:", {
        description: errorFields.length > 0
          ? `• ${errorFields.join("\n• ")}`
          : "Please review all required fields and correct any errors.",
        duration: 6000,
      })

      // Scroll to first error after a short delay to ensure DOM is updated
      setTimeout(() => {
        const firstErrorField = document.querySelector('[data-error="true"]')
        if (firstErrorField) {
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Flash the field to draw attention
          firstErrorField.classList.add('animate-pulse')
          setTimeout(() => firstErrorField.classList.remove('animate-pulse'), 2000)
        } else {
          // If no field with data-error, scroll to general error or first visible error
          const generalError = document.querySelector('[role="status"]')
          if (generalError) {
            generalError.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }, 100)

      return
    }

    setLoading(true)

    // Show loading toast
    const loadingToast = toast.loading("Creating job posting...", {
      description: "Please wait while we process your request."
    })

    try {
      const skillsArray = formData.skills.filter(s => s.trim()) // Already an array, just filter empty values

      // Transform workflow steps
      const transformedSteps = workflowSteps.map((step) => {
        // Remove any client-only fields from payload
        const { stepName, ...rest } = step as any
        return rest
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
          educationRequirements: formData.minEducation ? [{ educationLevelName: formData.minEducation, isRequired: true }] : [],
        }),
      })

      const data = await response.json()

      // Dismiss loading toast
      toast.dismiss(loadingToast)

      if (response.ok) {
        toast.success("Job created successfully!", {
          description: `"${formData.title}" has been posted and is now live.`,
          duration: 3000,
        })

        // Redirect after a brief delay to show the success message
        setTimeout(() => {
          router.push("/admin/jobs")
        }, 1000)
      } else {
        // Handle API validation errors
        if (data.error) {
          setErrors(prev => ({ ...prev, ...(typeof data.error === 'string' ? { _general: data.error } : data.error) }))

          // Show error toast with details
          let errorMessage = ""
          if (typeof data.error === 'string') {
            errorMessage = data.error
          } else if (data.errors && Array.isArray(data.errors)) {
            errorMessage = data.errors.join('\n')
          } else {
            errorMessage = "Please check all fields and try again."
          }

          toast.error("Failed to create job", {
            description: errorMessage,
            duration: 6000,
          })
        } else {
          toast.error("Failed to create job", {
            description: "Please check all fields and try again.",
            duration: 5000,
          })
        }
      }
    } catch (error) {
      console.error("Error creating job:", error)

      // Dismiss loading toast
      toast.dismiss(loadingToast)

      setErrors(prev => ({ ...prev, _general: "An unexpected error occurred. Please try again." }))

      toast.error("Connection error", {
        description: "Failed to create job. Please check your internet connection and try again.",
        duration: 6000,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Create New Job</h1>
            <p className="text-muted-foreground">Fill in the details to post a new job opening</p>
          </div>
          <Link
            href="/admin/jobs"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground bg-background border border-input rounded-lg hover:bg-accent hover:text-accent-foreground transition-all duration-200 shadow-sm hover:shadow"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Jobs
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Validation Error Summary */}
          {Object.keys(errors).filter(k => k !== '_general').length > 0 && (
            <div className="sticky top-4 z-10 bg-destructive/10 border border-destructive/30 rounded-xl p-5 shadow-lg backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-destructive mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-destructive mb-2">
                    Please correct the following errors before submitting:
                  </h3>
                  <ul className="space-y-1.5 text-sm text-destructive">
                    {errors.title && <li className="flex items-center gap-2">• <span className="font-medium">Job Title:</span> {errors.title}</li>}
                    {errors.shortDescription && <li className="flex items-center gap-2">• <span className="font-medium">Job Summary:</span> {errors.shortDescription}</li>}
                    {errors.description && <li className="flex items-center gap-2">• <span className="font-medium">Job Description:</span> {errors.description}</li>}
                    {errors.company && <li className="flex items-center gap-2">• <span className="font-medium">Company:</span> {errors.company}</li>}
                    {errors.postFrom && <li className="flex items-center gap-2">• <span className="font-medium">Post From Date:</span> {errors.postFrom}</li>}
                    {errors.postTo && <li className="flex items-center gap-2">• <span className="font-medium">Post To Date:</span> {errors.postTo}</li>}
                    {errors.totalPositions && <li className="flex items-center gap-2">• <span className="font-medium">Total Positions:</span> {errors.totalPositions}</li>}
                    {errors.minimumExperience && <li className="flex items-center gap-2">• <span className="font-medium">Minimum Experience:</span> {errors.minimumExperience}</li>}
                    {errors.minimumSalary && <li className="flex items-center gap-2">• <span className="font-medium">Minimum Salary:</span> {errors.minimumSalary}</li>}
                    {errors.locations && <li className="flex items-center gap-2">• <span className="font-medium">Locations:</span> {errors.locations}</li>}
                    {errors.workflowSteps && <li className="flex items-center gap-2">• <span className="font-medium">Workflow Steps:</span> Please review all workflow step fields</li>}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => setErrors({})}
                  className="text-destructive hover:text-destructive/80 transition-colors"
                  title="Dismiss"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* General Error Display */}
          {errors._general && (
            <div className="bg-destructive/10 border-destructive/20 rounded-lg p-4 flex items-start gap-3">
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
                className="text-destructive hover:text-destructive"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* Job Overview */}
          <div className="bg-card rounded-xl shadow-lg border border-border p-6 md:p-8 transition-all duration-200 hover:shadow-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground">Job Overview</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Job Title <span className="text-destructive">*</span>
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
                  placeholder="e.g., Senior Frontend Engineer"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-destructive flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Job Summary
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
                  placeholder="Brief overview (max 300 characters)"
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-muted-foreground">
                    {formData.shortDescription.length}/300 characters
                  </p>
                  {errors.shortDescription && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.shortDescription}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Hiring Organization <span className="text-destructive">*</span>
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
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Job Type <span className="text-destructive">*</span>
                </label>
                <select
                  required
                  value={formData.jobType}
                  onChange={(e) => setFormData({ ...formData, jobType: e.target.value as "NORMAL" | "BULK" })}
                  className="w-full px-4 py-2.5 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 outline-none hover:border-accent bg-background"
                >
                  <option value="NORMAL">Normal Hiring</option>
                  <option value="BULK">Bulk Hiring</option>
                </select>
                {formData.jobType === "BULK" && (
                  <p className="mt-2 text-sm text-primary flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Bulk hiring requires admin shortlisting after the end date
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Employment Type <span className="text-destructive">*</span>
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

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Work Shift
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

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Posting Start Date <span className="text-destructive">*</span>
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
                  min={todayStr}
                  placeholder="Select opening date"
                  className={`w-full px-3 py-2 border rounded-md bg-background ${errors.postFrom ? "border-destructive bg-destructive/10" : "border-input"
                    }`}
                />
                {errors.postFrom && (
                  <p className="mt-1 text-sm text-destructive flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.postFrom}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Posting End Date <span className="text-destructive">*</span>
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
                  min={formData.postFrom || todayStr}
                  placeholder="Select closing date"
                  className={`w-full px-3 py-2 border rounded-md bg-background ${errors.postTo ? "border-destructive bg-destructive/10" : "border-input"
                    }`}
                />
                {errors.postTo && (
                  <p className="mt-1 text-sm text-destructive flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.postTo}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Required Experience
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
                  placeholder="e.g., 3–5 years of SaaS experience"
                />
                {errors.minimumExperience && (
                  <p className="mt-1 text-sm text-destructive flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.minimumExperience}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Number of Positions <span className="text-destructive">*</span>
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
                  <p className="mt-1 text-sm text-destructive flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.totalPositions}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Department
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md"
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
                  <p className="mt-1 text-sm text-destructive flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.minimumSalary}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Certification
                </label>
                <input
                  type="text"
                  value={formData.certification}
                  onChange={(e) => setFormData({ ...formData, certification: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="e.g., AWS Solutions Architect"
                />
              </div>

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
                  <option value="High School Diploma">High School Diploma</option>
                  <option value="Associate Degree">Associate Degree</option>
                  <option value="Bachelor&apos;s Degree">Bachelor&apos;s Degree</option>
                  <option value="Master&apos;s Degree">Master&apos;s Degree</option>
                  <option value="Doctorate / PhD">Doctorate / PhD</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description <span className="text-destructive">*</span>
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
                  <p className="mt-1 text-sm text-destructive flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
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
                    className="flex-1 px-3 py-2 border border-input rounded-md"
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
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Add
                  </button>
                </div>
                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, skillIndex) => (
                      <span
                        key={skillIndex}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                      >
                        {skill}
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
                  Benefits
                </label>
                <textarea
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  placeholder="Perks and benefits..."
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Status
                </label>
                <select
                  value={formData.status ? "active" : "inactive"}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value === "active" })}
                  className="w-full px-3 py-2 border border-input rounded-md"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Locations */}
          <div className="bg-card rounded-lg shadow p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Job Locations <span className="text-destructive">*</span>
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">City <span className="text-destructive">*</span></label>
                <select
                  value={newLocation.city}
                  onChange={(e) => {
                    setNewLocation({
                      city: e.target.value,
                      country: "Pakistan" // Auto-select Pakistan
                    })
                    setLocationError("")
                  }}
                  className={`w-full px-3 py-2 border rounded-md bg-background ${locationError ? "border-destructive bg-destructive/10" : "border-input"}`}
                >
                  <option value="">Select City</option>
                  {pakistanCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Country</label>
                <select
                  value={newLocation.country}
                  onChange={(e) => {
                    setNewLocation({ ...newLocation, country: e.target.value })
                    setLocationError("")
                  }}
                  className={`w-full px-3 py-2 border rounded-md bg-background ${locationError ? "border-destructive bg-destructive/10" : "border-input"}`}
                >
                  <option value="Pakistan">Pakistan</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  className="w-full px-3 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80"
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
              <p className="mt-2 text-sm text-destructive flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {locationError}
              </p>
            )}
            {errors.locations && (
              <p className="mt-2 text-sm text-destructive flex items-center gap-1">
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
                      className="text-destructive hover:text-destructive"
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
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Step Type <span className="text-destructive">*</span>
                      {step.stepType === "OFFER" && (
                        <span className="ml-2 text-xs text-primary">(Must be last step)</span>
                      )}
                    </label>
                    <select
                      required
                      value={step.stepType}
                      onChange={(e) => {
                        const newStepType = e.target.value

                        // Auto-set stepName from stepType for display
                        const stepTypeLabel = stepTypeOptions.find(opt => opt.value === newStepType)?.label || newStepType

                        // Batch update both fields to avoid race conditions/stale state
                        const newSteps = [...workflowSteps]
                        newSteps[index] = {
                          ...newSteps[index],
                          stepType: newStepType,
                          stepName: stepTypeLabel
                        }
                        setWorkflowSteps(newSteps)

                        // Clear error when step type is selected
                        if (errors.workflowSteps?.[index]?.stepType && newStepType) {
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
                      onBlur={() => {
                        const stepErrors = validateWorkflowStep(step, index)
                        if (stepErrors.stepType || errors.workflowSteps?.[index]?.stepType) {
                          setErrors(prev => ({
                            ...prev,
                            workflowSteps: {
                              ...prev.workflowSteps,
                              [index]: {
                                ...prev.workflowSteps?.[index],
                                stepType: stepErrors.stepType
                              }
                            }
                          }))
                        }
                      }}
                      data-error={errors.workflowSteps?.[index]?.stepType ? "true" : "false"}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 outline-none hover:border-accent bg-background ${errors.workflowSteps?.[index]?.stepType ? "border-destructive bg-destructive/10" : "border-input"
                        }`}
                    >
                      <option value="">Select step type</option>
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
                      <p className="mt-1 text-sm text-destructive flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.workflowSteps[index].stepType}
                      </p>
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
                      className={`w-full px-3 py-2 border rounded-md bg-background ${errors.workflowSteps?.[index]?.durationMins ? "border-destructive bg-destructive/10" : "border-input"
                        }`}
                      placeholder="e.g., 60"
                    />
                    {errors.workflowSteps?.[index]?.durationMins && (
                      <p className="mt-1 text-sm text-destructive flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.workflowSteps[index].durationMins}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Interview Mode</label>
                    <select
                      value={step.interviewMode || ""}
                      onChange={(e) => handleStepChange(index, "interviewMode", e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md"
                    >
                      <option value="">Select mode</option>
                      <option value="Onsite">Onsite</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </div>

                  {step.interviewMode === "Remote" && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Meeting Link <span className="text-destructive">*</span>
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
                            } catch { }
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
                        className={`w-full px-3 py-2 border rounded-md bg-background ${errors.workflowSteps?.[index]?.meetingLink ? "border-destructive bg-destructive/10" : "border-input"
                          }`}
                        placeholder="https://meet.google.com/... or zoom://..."
                        required={step.interviewMode === "Remote"}
                      />
                      {errors.workflowSteps?.[index]?.meetingLink && (
                        <p className="mt-1 text-sm text-destructive flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.workflowSteps[index].meetingLink}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Assigned Interviewer(s) <span className="text-destructive">*</span>
                    </label>
                    <select
                      multiple
                      value={step.interviewerIds || []}
                      onChange={(e) => {
                        const options = Array.from(e.target.selectedOptions).map(o => o.value)
                        handleStepChange(index, "interviewerIds", options)

                        // Clear error if at least one interviewer is selected
                        if (options.length > 0 && errors.workflowSteps?.[index]?.interviewerIds) {
                          setErrors(prev => {
                            const newErrors = { ...prev }
                            if (newErrors.workflowSteps?.[index]) {
                              delete newErrors.workflowSteps[index].interviewerIds
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
                        if ((!step.interviewerIds || step.interviewerIds.length === 0)) {
                          setErrors(prev => ({
                            ...prev,
                            workflowSteps: {
                              ...prev.workflowSteps,
                              [index]: {
                                ...prev.workflowSteps?.[index],
                                interviewerIds: "At least one interviewer is required"
                              }
                            }
                          }))
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-md h-28 bg-background ${errors.workflowSteps?.[index]?.interviewerIds ? "border-destructive bg-destructive/10" : "border-input"}`}
                    >
                      {interviewers.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                    {errors.workflowSteps?.[index]?.interviewerIds && (
                      <p className="mt-1 text-sm text-destructive flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.workflowSteps[index].interviewerIds}
                      </p>
                    )}
                  </div>


                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border pt-6 mt-8 -mx-4 px-4 pb-4">
            <div className="max-w-5xl mx-auto flex justify-between items-center gap-4">
              {/* Form Status Indicator */}
              <div className="flex items-center gap-2 text-sm">
                {Object.keys(errors).filter(k => k !== '_general').length > 0 ? (
                  <>
                    <svg className="w-4 h-4 text-destructive" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-destructive font-medium">
                      {Object.keys(errors).filter(k => k !== '_general').length} error(s) found
                    </span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-muted-foreground">All fields valid</span>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Link
                  href="/admin/jobs"
                  className="inline-flex items-center gap-2 px-6 py-2.5 border border-input text-foreground rounded-lg hover:bg-accent hover:border-accent-foreground transition-all duration-200 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className={`inline-flex items-center gap-2 px-8 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg ${loading
                      ? 'bg-primary/50 text-primary-foreground cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105'
                    }`}
                >
                  {loading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Creating Job...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create Job</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

