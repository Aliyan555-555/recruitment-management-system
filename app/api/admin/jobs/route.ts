import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { generateJobCode } from "@/lib/utils"

// Helper function to convert stepType to human-readable stepName
function getStepNameFromType(stepType: string): string {
  const stepTypeMap: Record<string, string> = {
    "TEST": "Test",
    "SCREENING_INTERVIEW": "Screening Interview",
    "FOCUS_GROUP": "Focus Group",
    "FINAL_INTERVIEW": "Final Interview",
    "OFFER": "Offer"
  }
  return stepTypeMap[stepType] || stepType
}

interface WorkflowStepInput {
  stepName?: string // Optional, for backward compatibility/display
  stepType: string // Required: TEST, SCREENING_INTERVIEW, FOCUS_GROUP, FINAL_INTERVIEW, OFFER
  stepOrder: number
  interviewerId?: string
  // Extended fields stored in stepMetadata
  durationMins?: number
  weightage?: number
  scoreThreshold?: number
  interviewMode?: string
  meetingLink?: string
  interviewerIds?: string[] // Multi-select interviewer IDs
}

interface JobLocationInput {
  city: string
  country?: string
}

interface JobEducationRequirementInput {
  educationLevelId?: string
  educationLevelName?: string
  field?: string
  minimumGpa?: string
  gpaScale?: string
  isRequired?: boolean
  notes?: string
}

interface CreateJobRequest {
  title: string
  shortDescription?: string
  description?: string
  company: string
  postFrom: string
  postTo: string
  jobType?: "NORMAL" | "BULK"
  industry?: string
  employmentType: string
  employmentShift?: string
  totalPositions?: number
  minimumExperience?: string
  certification?: string
  minimumSalary?: string
  benefits?: string
  organizationAlias?: string
  status?: boolean
  skills?: string[]
  locations?: JobLocationInput[]
  educationRequirements?: JobEducationRequirementInput[]
  workflowSteps: WorkflowStepInput[]
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const body: CreateJobRequest = await req.json()
    const now = BigInt(Math.floor(Date.now() / 1000))
    const adminId = BigInt(user.id)

    // Validate workflow steps
    if (!body.workflowSteps || body.workflowSteps.length === 0) {
      return NextResponse.json(
        { error: "Workflow must have at least one step" },
        { status: 400 }
      )
    }

    // Validate step orders
    const stepOrders = body.workflowSteps.map(s => s.stepOrder).sort()
    for (let i = 0; i < stepOrders.length; i++) {
      if (stepOrders[i] !== i + 1) {
        return NextResponse.json(
          { error: "Step orders must be sequential starting from 1" },
          { status: 400 }
        )
      }
    }

    // Validate that Offer step exists and is last
    const offerStepIndex = body.workflowSteps.findIndex(s => s.stepType === "OFFER")
    if (offerStepIndex === -1) {
      return NextResponse.json(
        { error: "Offer step is mandatory and must be the last step in the workflow" },
        { status: 400 }
      )
    }
    if (offerStepIndex !== body.workflowSteps.length - 1) {
      return NextResponse.json(
        { error: `Step ${body.workflowSteps[offerStepIndex].stepOrder}: Offer step must be the last step in the workflow` },
        { status: 400 }
      )
    }

    // Validate step types are valid
    const validStepTypes = ["TEST", "SCREENING_INTERVIEW", "FOCUS_GROUP", "FINAL_INTERVIEW", "OFFER"]
    for (const step of body.workflowSteps) {
      if (!step.stepType || !validStepTypes.includes(step.stepType)) {
        return NextResponse.json(
          { error: `Step ${step.stepOrder}: Invalid step type. Must be one of: ${validStepTypes.join(", ")}` },
          { status: 400 }
        )
      }
    }

    // Validate required fields for each step
    for (const step of body.workflowSteps) {
      // stepName is optional now, but we'll use stepType for validation
      if (!step.stepType || step.stepType.trim() === "") {
        return NextResponse.json(
          { error: `Step ${step.stepOrder}: Step Type is required` },
          { status: 400 }
        )
      }

      // Validate meeting link is required for Remote interviews
      if (step.interviewMode === "Remote" && (!step.meetingLink || step.meetingLink.trim() === "")) {
        return NextResponse.json(
          { error: `Step ${step.stepOrder}: Meeting Link is required for Remote interviews` },
          { status: 400 }
        )
      }

      // Validate meeting link is a valid URL if provided
      if (step.meetingLink && step.meetingLink.trim() !== "") {
        try {
          new URL(step.meetingLink)
        } catch {
          return NextResponse.json(
            { error: `Step ${step.stepOrder}: Meeting Link must be a valid URL` },
            { status: 400 }
          )
        }
      }

      // Validate weightage is between 0-100 if provided
      if (step.weightage !== undefined && (step.weightage < 0 || step.weightage > 100)) {
        return NextResponse.json(
          { error: `Step ${step.stepOrder}: Weightage must be between 0 and 100` },
          { status: 400 }
        )
      }

      // Validate score threshold is between 0-100 if provided
      if (step.scoreThreshold !== undefined && (step.scoreThreshold < 0 || step.scoreThreshold > 100)) {
        return NextResponse.json(
          { error: `Step ${step.stepOrder}: Score Threshold must be between 0 and 100` },
          { status: 400 }
        )
      }

      // Validate duration is positive if provided
      if (step.durationMins !== undefined && step.durationMins < 0) {
        return NextResponse.json(
          { error: `Step ${step.stepOrder}: Duration must be a positive number` },
          { status: 400 }
        )
      }
    }

    // Generate unique job code
    let jobCode: string
    let isUnique = false
    while (!isUnique) {
      jobCode = await generateJobCode(body.organizationAlias)
      const existing = await prisma.job.findUnique({
        where: { jobCode }
      })
      if (!existing) {
        isUnique = true
      }
    }

    // Create job with workflow
    const job = await prisma.$transaction(async (tx) => {
      // Create the job
      const newJob = await tx.job.create({
        data: {
          jobCode: jobCode!,
          title: body.title,
          shortDescription: body.shortDescription || null,
          description: body.description || null,
          company: body.company,
          postFrom: new Date(body.postFrom),
          postTo: new Date(body.postTo),
          status: body.status !== undefined ? !!body.status : true,
          jobType: (body.jobType || "NORMAL") as any,
          jobStatus: "ACTIVE",
          industry: body.industry,
          employmentType: body.employmentType as any,
          employmentShift: body.employmentShift,
          totalPositions: body.totalPositions || 1,
          minimumExperience: body.minimumExperience,
          certification: body.certification,
          minimumSalary: body.minimumSalary,
          benefits: body.benefits,
          createdBy: adminId,
          updatedBy: adminId,
          createdAt: now,
          updatedAt: now,
        },
      })

      // Create job locations if provided
      if (body.locations && body.locations.length > 0) {
        await tx.jobLocation.createMany({
          data: body.locations.map(location => ({
            jobId: newJob.id,
            city: location.city,
            country: location.country,
            createdAt: now,
            updatedAt: now
          }))
        })
      }

      // Create job education requirements if provided
      if (body.educationRequirements && body.educationRequirements.length > 0) {
        const eduData = [] as any[]
        for (const req of body.educationRequirements) {
          let levelId: bigint | null = null
          if (req.educationLevelId) {
            levelId = BigInt(req.educationLevelId)
          } else if (req.educationLevelName) {
            const level = await tx.userEducationLevel.findFirst({ where: { name: req.educationLevelName } })
            if (level) levelId = level.id
          }
          if (levelId) {
            eduData.push({
              jobId: newJob.id,
              educationLevelId: levelId,
              field: req.field,
              minimumGpa: req.minimumGpa,
              gpaScale: req.gpaScale,
              isRequired: req.isRequired !== undefined ? req.isRequired : true,
              notes: req.notes,
              createdAt: now,
              updatedAt: now
            })
          }
        }
        if (eduData.length > 0) {
          await tx.jobEducationRequirement.createMany({ data: eduData })
        }
      }

      // Create job skills if provided
      if (body.skills && body.skills.length > 0) {
        await tx.jobSkill.createMany({
          data: body.skills.map(skill => ({
            jobId: newJob.id,
            skillName: skill
          }))
        })
      }

      // Create workflow
      const workflow = await tx.jobWorkflow.create({
        data: {
          jobId: newJob.id,
          createdAt: now,
          updatedAt: now,
          steps: {
            create: body.workflowSteps.map(step => {
              // Use first interviewerId from interviewerIds array if provided, otherwise use single interviewerId
              const primaryInterviewerId = step.interviewerIds && step.interviewerIds.length > 0
                ? step.interviewerIds[0]
                : step.interviewerId

              // Build stepMetadata JSON with extended fields
              const stepMetadata: any = {}
              
              if (step.stepType) stepMetadata.stepType = step.stepType
              if (step.durationMins !== undefined) stepMetadata.durationMins = step.durationMins
              if (step.weightage !== undefined) stepMetadata.weightage = step.weightage
              if (step.scoreThreshold !== undefined) stepMetadata.scoreThreshold = step.scoreThreshold
              if (step.interviewMode) stepMetadata.interviewMode = step.interviewMode
              if (step.meetingLink) stepMetadata.meetingLink = step.meetingLink
              if (step.interviewerIds && step.interviewerIds.length > 0) stepMetadata.interviewerIds = step.interviewerIds

              // Auto-populate stepName from stepType
              const stepName = getStepNameFromType(step.stepType)

              return {
                stepName: stepName, // Auto-populated from stepType
                stepType: step.stepType as any, // Store stepType in database field
                stepOrder: step.stepOrder,
                isRequired: true, // Default: all steps are required
                isSkippable: false, // Default: steps are not skippable
                interviewerId: primaryInterviewerId ? BigInt(primaryInterviewerId) : null,
                status: 'ACTIVE',
                stepMetadata: Object.keys(stepMetadata).length > 0 ? stepMetadata : null,
                createdAt: now,
                updatedAt: now
              }
            })
          }
        }
      })

      return { job: newJob, workflow }
    })

    return NextResponse.json({
      success: true,
      job: {
        id: job.job.id.toString(),
        jobCode: job.job.jobCode,
        title: job.job.title,
        workflowSteps: body.workflowSteps.length
      }
    })
  } catch (error: any) {
    console.error("Error creating job:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create job" },
      { status: 500 }
    )
  }
}

