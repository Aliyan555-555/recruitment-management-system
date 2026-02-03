"use client"

import { useEffect, useMemo, useState } from "react"
import type { ValidationErrorItem } from "joi"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Briefcase, CheckCircle2, Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import PersonalInfoStep from "./components/PersonalInfoStep"
import EducationStep from "./components/EducationStep"
import ExperienceSkillsStep from "./components/ExperienceSkillsStep"
import JobPreferenceStep from "./components/JobPreferenceStep"
import SecurityStep from "./components/SecurityStep"
import {
  steps,
  titles,
  degreeLevelOptions as defaultDegreeOptions,
  passingYearOptions,
  priorityOptions,
} from "./constants"
import {
  AgreementsState,
  EducationEntry,
  ExperienceEntry,
  FieldErrors,
  JobPreferenceState,
  PersonalInfoState,
  SkillEntry,
} from "./types"
import {
  createEducationEntry,
  createExperienceEntry,
  createSkillEntry,
  isEducationEntryStarted,
  isExperienceStarted,
} from "./utils"
import {
  personalInfoSchema,
  educationEntrySchemaJoi,
  experienceEntrySchemaJoi,
  skillEntrySchemaJoi,
  jobPreferenceSchemaJoi,
  securitySchema,
} from "./validation"
import { NATIONALITY_TO_COUNTRY_CODE } from "@/lib/nationalityMap"

const mapJoiErrors = (details: ValidationErrorItem[], prefix: string): FieldErrors => {
  return details.reduce<FieldErrors>((acc, { message, path }) => {
    const cleanMessage = message.replace(/["]/g, "")
    acc[`${prefix}.${path.join(".")}`] = cleanMessage
    return acc
  }, {})
}

const createPersonalInfoState = (): PersonalInfoState => ({
  title: titles[0],
  firstname: "",
  lastname: "",
  fatherName: "",
  email: "",
  username: "",
  contactNumber: "",
  alternateNumber: "",
  religion: "",
  nationality: "",
  dateOfBirth: "",
  cnic: "",
  gender: "",
  maritalStatus: "",
  preferredCity: "",
  homeAddress: "",
  city: "",
  postalCode: "",
  institution: "",
  department: "",
})

const createJobPreferenceState = (): JobPreferenceState => ({
  firstPriority: "",
  secondPriority: "",
  thirdPriority: "",
  summary: "",
})

const createAgreementsState = (): AgreementsState => ({
  verification: false,
  truth: false,
  liability: false,
})

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const jobId = searchParams?.get("jobId")

  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [stepError, setStepError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [educationLevels, setEducationLevels] = useState<Array<{ id: string; name: string }>>([])
  const [jobDetails, setJobDetails] = useState<{ title: string; company: string } | null>(null)

  const [personalInfo, setPersonalInfo] = useState<PersonalInfoState>(createPersonalInfoState)
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([createEducationEntry()])
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([createExperienceEntry()])
  const [skills, setSkills] = useState<SkillEntry[]>([createSkillEntry()])
  const [jobPreference, setJobPreference] = useState<JobPreferenceState>(createJobPreferenceState)
  const [agreements, setAgreements] = useState<AgreementsState>(createAgreementsState)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const applyFieldErrors = (prefixes: string[], newErrors: FieldErrors) => {
    setFieldErrors((prev) => {
      const cleaned = { ...prev }
      Object.keys(cleaned).forEach((key) => {
        if (prefixes.some((prefix) => key.startsWith(prefix))) {
          delete cleaned[key]
        }
      })
      return Object.keys(newErrors).length ? { ...cleaned, ...newErrors } : cleaned
    })
  }

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const updated = { ...prev }
      delete updated[key]
      return updated
    })
  }

  const getFieldError = (key: string) => fieldErrors[key]

  useEffect(() => {
    const fetchEducationLevels = async () => {
      try {
        const response = await fetch("/api/profile/education-levels")
        if (response.ok) {
          const data = await response.json()
          setEducationLevels(data.levels || [])
        }
      } catch (err) {
        console.error("Failed to load education levels", err)
      }
    }
    fetchEducationLevels()

    // Fetch job details if jobId is provided
    if (jobId) {
      const fetchJobDetails = async () => {
        try {
          const response = await fetch(`/api/jobs/public`)
          if (response.ok) {
            const data = await response.json()
            const job = data.jobs?.find((j: any) => j.id === jobId)
            if (job) {
              setJobDetails({ title: job.title, company: job.company })
            }
          }
        } catch (err) {
          console.error("Failed to load job details", err)
        }
      }
      fetchJobDetails()
    }
  }, [jobId])

  const isLastStep = useMemo(() => currentStep === steps.length - 1, [currentStep])
  const maxDob = useMemo(() => {
    const today = new Date()
    const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
    return eighteenYearsAgo.toISOString().split("T")[0]
  }, [])

  // const degreeOptions = useMemo(() => {
  //   if (educationLevels.length) {
  //     return educationLevels.map((level) => ({
  //       value: level.id,
  //       label: level.name ?? level.id,
  //     }))
  //   }
  //   return defaultDegreeOptions.map((option) => ({ value: option, label: option }))
  // }, [educationLevels])

  const degreeOptions = educationLevels.map((level) => ({
    value: level.id,
    label: level.name ?? level.id,
  }))

  const handlePersonalInfoChange = (updates: Partial<PersonalInfoState>) => {
    setPersonalInfo((prev) => ({ ...prev, ...updates }))
  }

  const handleJobPreferenceChange = (updates: Partial<JobPreferenceState>) => {
    setJobPreference((prev) => ({ ...prev, ...updates }))
  }

  const handleAgreementChange = (key: keyof AgreementsState, value: boolean) => {
    setAgreements((prev) => ({ ...prev, [key]: value }))
  }

  const addEducationEntry = () => {
    clearFieldError("education")
    setEducationEntries((prev) => [...prev, createEducationEntry()])
  }

  const removeEducationEntry = (id: string) => {
    clearFieldError("education")
    setEducationEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  const addExperienceEntry = () => {
    clearFieldError("experience")
    setExperiences((prev) => [...prev, createExperienceEntry()])
  }

  const removeExperienceEntry = (id: string) => {
    clearFieldError("experience")
    setExperiences((prev) => prev.filter((entry) => entry.id !== id))
  }

  const addSkillEntry = () => {
    clearFieldError("skills")
    setSkills((prev) => [...prev, createSkillEntry()])
  }

  const removeSkillEntry = (id: string) => {
    clearFieldError("skills")
    setSkills((prev) => prev.filter((entry) => entry.id !== id))
  }

  const upsertEducationEntry = (id: string, field: keyof EducationEntry, value: string) => {
    setEducationEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)))
  }

  const upsertExperienceEntry = (id: string, field: keyof ExperienceEntry, value: string | boolean) => {
    setExperiences((prev) => prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)))
  }

  const upsertSkillEntry = (id: string, field: keyof SkillEntry, value: string | number) => {
    setSkills((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: field === "level" ? Number(value) : value } : entry))
    )
  }

  const validateStep = () => {
    setStepError(null)
    switch (currentStep) {
      case 0: {
        const { error } = personalInfoSchema.validate(personalInfo, { abortEarly: false })
        if (error) {
          applyFieldErrors(["personal"], mapJoiErrors(error.details, "personal"))
          setStepError("Please fix the highlighted personal information fields.")
          return false
        }
        applyFieldErrors(["personal"], {})
        return true
      }
      case 1: {
        const errors: FieldErrors = {}
        let hasCompleteEntry = false

        educationEntries.forEach((entry, index) => {
          if (!isEducationEntryStarted(entry)) {
            return
          }
          const { error } = educationEntrySchemaJoi.validate(entry, { abortEarly: false, allowUnknown: true })
          if (error) {
            Object.assign(errors, mapJoiErrors(error.details, `education.${index}`))
          } else {
            hasCompleteEntry = true
          }
        })

        if (!educationEntries.some(isEducationEntryStarted)) {
          errors.education = "Please add at least one education entry."
        } else if (!hasCompleteEntry) {
          errors.education = "Please complete all required fields in at least one education entry."
        }

        if (Object.keys(errors).length) {
          applyFieldErrors(["education"], errors)
          setStepError("Please fix the highlighted education fields.")
          return false
        }
        applyFieldErrors(["education"], {})
        return true
      }
      case 2: {
        const errors: FieldErrors = {}
        let hasValidExperience = false

        experiences.forEach((entry, index) => {
          if (!isExperienceStarted(entry)) {
            return
          }
          const { error } = experienceEntrySchemaJoi.validate(entry, { abortEarly: false, allowUnknown: true })
          if (error) {
            Object.assign(errors, mapJoiErrors(error.details, `experience.${index}`))
          } else {
            hasValidExperience = true
          }
        })

        if (experiences.some(isExperienceStarted) && !hasValidExperience) {
          errors.experience = "Please complete all required fields in your experience entries."
        }

        if (!skills.length || !skills.some((skill) => skill.name.trim())) {
          errors.skills = "Please add at least one skill."
        }

        skills.forEach((skill, index) => {
          const { error } = skillEntrySchemaJoi.validate(skill, { abortEarly: false, allowUnknown: true })
          if (error) {
            Object.assign(errors, mapJoiErrors(error.details, `skills.${index}`))
          }
        })

        if (Object.keys(errors).length) {
          applyFieldErrors(["experience", "skills"], errors)
          setStepError("Please fix the highlighted experience and skill fields.")
          return false
        }
        applyFieldErrors(["experience", "skills"], {})
        return true
      }
      case 3: {
        const { error } = jobPreferenceSchemaJoi.validate(jobPreference, { abortEarly: false })
        if (error) {
          applyFieldErrors(["preferences"], mapJoiErrors(error.details, "preferences"))
          setStepError("Please complete your job preferences.")
          return false
        }
        applyFieldErrors(["preferences"], {})
        return true
      }
      case 4: {
        const securityData = {
          password,
          confirmPassword,
          verification: agreements.verification,
          truth: agreements.truth,
          liability: agreements.liability,
        }
        const { error } = securitySchema.validate(securityData, { abortEarly: false })
        if (error) {
          applyFieldErrors(["security"], mapJoiErrors(error.details, "security"))
          setStepError("Please resolve the highlighted security/disclaimer fields.")
          return false
        }
        applyFieldErrors(["security"], {})
        return true
      }
      default:
        return true
    }
  }

  const handleNext = () => {
    if (!validateStep()) return
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const handleBack = () => {
    setStepError(null)
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const countryCode = NATIONALITY_TO_COUNTRY_CODE[personalInfo.nationality] || (personalInfo.nationality.length === 2 ? personalInfo.nationality.toUpperCase() : undefined)

  const handleSubmit = async () => {
    if (!validateStep()) {
      return
    }

    setIsLoading(true)
    setError("")

    const payload = {
      username: personalInfo.username.trim(),
      email: personalInfo.email.trim(),
      password,
      firstname: personalInfo.firstname.trim(),
      lastname: personalInfo.lastname.trim(),
      phone1: personalInfo.contactNumber.trim(),
      phone2: personalInfo.alternateNumber.trim() || undefined,
      institution: personalInfo.institution.trim() || undefined,
      department: personalInfo.department.trim() || undefined,
      address: personalInfo.homeAddress.trim() || undefined,
      city: personalInfo.city.trim() || undefined,
      country: countryCode,
      profile: {
        title: personalInfo.title,
        fatherName: personalInfo.fatherName || undefined,
        religion: personalInfo.religion || undefined,
        nationality: personalInfo.nationality || undefined,
        dateOfBirth: personalInfo.dateOfBirth || undefined,
        cnic: personalInfo.cnic || undefined,
        gender: personalInfo.gender || undefined,
        maritalStatus: personalInfo.maritalStatus || undefined,
        preferredCity: personalInfo.preferredCity || undefined,
        postalCode: personalInfo.postalCode || undefined,
        disclaimersAgreed: agreements.verification && agreements.truth && agreements.liability,
      },
      educationHistory: educationEntries
        .filter((entry) => entry.educationLevelId && entry.degreeTitle.trim())
        .map((entry) => ({
          educationLevelId: entry.educationLevelId,
          degreeTitle: entry.degreeTitle.trim(),
          institute: entry.institute.trim(),
          majorSubject: entry.majorSubject || undefined,
          grade: entry.grade || undefined,
          passingYear: entry.passingYear || undefined,
        })),
      experiences: experiences
        .filter((entry) => entry.jobTitle.trim())
        .map((entry) => ({
          jobTitle: entry.jobTitle.trim(),
          company: entry.company || undefined,
          location: entry.location || undefined,
          startDate: entry.startDate || undefined,
          endDate: entry.isCurrent ? undefined : entry.endDate || undefined,
          isCurrent: entry.isCurrent,
        })),
      skillsInput: skills
        .filter((entry) => entry.name.trim())
        .map((entry) => ({
          name: entry.name.trim(),
          level: entry.level,
        })),
      jobPreference: {
        firstPriority: jobPreference.firstPriority || undefined,
        secondPriority: jobPreference.secondPriority || undefined,
        thirdPriority: jobPreference.thirdPriority || undefined,
        summary: jobPreference.summary || undefined,
      },
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Registration failed. Please try again.")
        setIsLoading(false)
        return
      }
      setSuccess(true)
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    // Redirect to job application if jobId is provided
    if (jobId) {
      router.push(`/jobs/${jobId}/apply/success`)
      return null
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted px-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Profile Created</CardTitle>
            <CardDescription>Your multi-step profile has been submitted successfully.</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-2">
            <p className="text-muted-foreground">You can now sign in to view jobs and track applications.</p>
          </CardContent>
          <CardFooter className="flex justify-center gap-4 flex-wrap">
            <Button onClick={() => router.push("/login")} className="min-w-[180px]">
              Go to Login
            </Button>
            <Button variant="outline" onClick={() => router.push("/")} className="min-w-[180px]">
              Browse Jobs
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <PersonalInfoStep
            personalInfo={personalInfo}
            onChange={handlePersonalInfoChange}
            clearFieldError={clearFieldError}
            getFieldError={getFieldError}
            maxDob={maxDob}
          />
        )
      case 1:
        return (
          <EducationStep
            entries={educationEntries}
            degreeOptions={degreeOptions}
            passingYearOptions={passingYearOptions}
            onEntryChange={upsertEducationEntry}
            onAddEntry={addEducationEntry}
            onRemoveEntry={removeEducationEntry}
            clearFieldError={clearFieldError}
            getFieldError={getFieldError}
          />
        )
      case 2:
        return (
          <ExperienceSkillsStep
            experiences={experiences}
            skills={skills}
            onExperienceChange={upsertExperienceEntry}
            onSkillChange={upsertSkillEntry}
            onAddExperience={addExperienceEntry}
            onRemoveExperience={removeExperienceEntry}
            onAddSkill={addSkillEntry}
            onRemoveSkill={removeSkillEntry}
            clearFieldError={clearFieldError}
            getFieldError={getFieldError}
          />
        )
      case 3:
        return (
          <JobPreferenceStep
            jobPreference={jobPreference}
            priorityOptions={priorityOptions}
            onChange={handleJobPreferenceChange}
            clearFieldError={clearFieldError}
            getFieldError={getFieldError}
          />
        )
      case 4:
        return (
          <SecurityStep
            personalInfo={personalInfo}
            password={password}
            confirmPassword={confirmPassword}
            agreements={agreements}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onAgreementChange={handleAgreementChange}
            clearFieldError={clearFieldError}
            getFieldError={getFieldError}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-background to-muted px-4 py-12">
      <Link href="/" className="absolute top-4 left-4">
        <Button variant="secondary" size="sm" className="flex items-center gap-2 shadow-sm">
          <ArrowLeft className="h-4 w-4" />
          Home
        </Button>
      </Link>
      <div className="w-full max-w-5xl mx-auto">
        <div className="text-center mb-10 space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-primary rounded-full">
              <Briefcase className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Create an Account</h1>
          {jobId && jobDetails ? (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Complete your profile to apply for
              </p>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 max-w-md mx-auto">
                <p className="font-semibold text-primary">{jobDetails.title}</p>
                <p className="text-sm text-muted-foreground">at {jobDetails.company}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Complete your profile in guided steps to apply for roles effortlessly.</p>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>{steps[currentStep].title}</CardTitle>
                <CardDescription>{steps[currentStep].description}</CardDescription>
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {steps.map((step, index) => (
                <div key={step.title} className={`h-2 flex-1 rounded-full ${index <= currentStep ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}
            {stepError && (
              <div className="p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                {stepError}
              </div>
            )}
            {renderCurrentStep()}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row w-full gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleBack}
                disabled={currentStep === 0 || isLoading}
              >
                Back
              </Button>
              {isLastStep ? (
                <Button className="flex-1" onClick={handleSubmit} disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Profile
                </Button>
              ) : (
                <Button className="flex-1" onClick={handleNext}>
                  Next
                </Button>
              )}
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Already registered?{" "}
              <Link
                href={jobId ? `/login?jobId=${jobId}` : "/login"}
                className="text-primary hover:underline font-medium"
              >
                Sign in here
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
