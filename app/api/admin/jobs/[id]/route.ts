import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { parseAndValidateSkillNames } from "@/lib/skills"
import { HiringCriteriaInput, parseHiringCriteria } from "@/lib/job-criteria"
import { parseQuickTestConfigInput, upsertJobQuickTest } from "@/lib/services/quick-test-service"

interface WorkflowStepInput {
  stepName: string
  stepOrder: number
  isRequired: boolean
  isSkippable: boolean
  interviewerId?: string
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
  candidateInstructions?: string
  interviewerInstructions?: string
  attachments?: Array<{
    id: string
    fileName: string
    fileSize: number
    fileType: string
    access: string[]
  }>
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

interface UpdateJobRequest {
  title?: string
  shortDescription?: string
  description?: string
  company?: string
  postFrom?: string
  postTo?: string
  industry?: string
  employmentType?: string
  employmentShift?: string
  totalPositions?: number
  minimumExperience?: string
  certification?: string
  minimumSalary?: string
  benefits?: string
  successCriteria?: string
  organizationAlias?: string
  status?: boolean
  skills?: Array<string | { skillName: string; priority?: "REQUIRED" | "PREFERRED" }>
  locations?: JobLocationInput[]
  educationRequirements?: JobEducationRequirementInput[]
  hiringCriteria?: HiringCriteriaInput
  workflowSteps?: WorkflowStepInput[]
  quickTest?: { enabled: boolean; questionCount?: number; timeLimitMinutes?: number }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const jobId = BigInt(params.id)

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        skills: {
          select: {
            skillName: true,
            priority: true
          }
        },
        locations: {
          orderBy: {
            city: 'asc'
          }
        },
        educationRequirements: {
          include: {
            educationLevel: {
              select: {
                id: true,
                name: true,
                rank: true
              }
            }
          }
        },
        allowedInstitutes: {
          select: { institute: { select: { id: true, name: true } } }
        },
        quickTest: true,
        workflow: {
          include: {
            steps: {
              orderBy: {
                stepOrder: 'asc'
              }
            }
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      }
    })

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      job: {
        id: job.id.toString(),
        jobCode: job.jobCode,
        title: job.title,
        shortDescription: job.shortDescription || null,
        company: job.company,
        description: job.description,
        postFrom: job.postFrom.toISOString().split('T')[0],
        postTo: job.postTo.toISOString().split('T')[0],
        status: job.status,
        jobType: (job as any).jobType || "NORMAL",
        jobStatus: (job as any).jobStatus || "ACTIVE",
        industry: job.industry,
        employmentType: job.employmentType,
        employmentShift: job.employmentShift,
        totalPositions: job.totalPositions,
        minimumExperience: job.minimumExperience,
        certification: job.certification,
        minimumSalary: job.minimumSalary,
        benefits: job.benefits,
        successCriteria: job.successCriteria || null,
        hiringCriteria: {
          minEducation: job.educationRequirements[0]
            ? {
                id: job.educationRequirements[0].educationLevel.id.toString(),
                name: job.educationRequirements[0].educationLevel.name,
                rank: job.educationRequirements[0].educationLevel.rank
              }
            : null,
          minAge: job.minAge,
          maxAge: job.maxAge,
          minCgpa: job.minCgpa,
          cgpaScale: job.cgpaScale,
          institutes: job.allowedInstitutes.map(a => ({
            id: a.institute.id.toString(),
            name: a.institute.name
          }))
        },
        locations: job.locations.map(loc => ({
          id: loc.id.toString(),
          city: loc.city,
          country: loc.country
        })),
        educationRequirements: job.educationRequirements.map(req => ({
          id: req.id.toString(),
          educationLevelId: req.educationLevelId.toString(),
          educationLevel: req.educationLevel.name,
          field: req.field,
          minimumGpa: req.minimumGpa,
          gpaScale: req.gpaScale,
          isRequired: req.isRequired,
          notes: req.notes
        })),
        createdAt: job.createdAt.toString(),
        updatedAt: job.updatedAt.toString(),
        deletedAt: job.deletedAt?.toString(),
        skills: job.skills.map(s => ({ skillName: s.skillName, priority: s.priority })),
        quickTest: job.quickTest
          ? {
              enabled: job.quickTest.isEnabled,
              questionCount: job.quickTest.questionCount,
              timeLimitMinutes: job.quickTest.timeLimitMinutes
            }
          : { enabled: false, questionCount: 10, timeLimitMinutes: 15 },
        workflow: job.workflow ? {
          id: job.workflow.id.toString(),
          jobId: job.workflow.jobId.toString(),
          createdAt: job.workflow.createdAt.toString(),
          updatedAt: job.workflow.updatedAt.toString(),
          steps: job.workflow.steps.map(s => {
            const metadata = (s.stepMetadata as any) || {}
            return {
              id: s.id.toString(),
              workflowId: s.workflowId.toString(),
              stepName: s.stepName,
              stepOrder: s.stepOrder,
              isRequired: s.isRequired,
              isSkippable: s.isSkippable,
              status: s.status,
              createdAt: s.createdAt.toString(),
              updatedAt: s.updatedAt.toString(),
              interviewer: null,
              // Include stepMetadata fields
              stepType: metadata.stepType,
              skipReason: metadata.skipReason,
              durationMins: metadata.durationMins,
              weightage: metadata.weightage,
              scoreThreshold: metadata.scoreThreshold,
              interviewMode: metadata.interviewMode,
              meetingLink: metadata.meetingLink,
              interviewerIds: metadata.interviewerIds || [],
              routeVisibility: metadata.routeVisibility || [],
              evaluationCriteria: metadata.evaluationCriteria || [],
              candidateInstructions: metadata.candidateInstructions,
              interviewerInstructions: metadata.interviewerInstructions,
              attachments: metadata.attachments || []
            }
          })
        } : null,
        _count: job._count
      }
    })
  } catch (error: any) {
    console.error("Error fetching job:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch job" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const jobId = BigInt(params.id)

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      )
    }

    // Delete job (cascade will delete applications, pipelines, workflow, skills, locations, etc.)
    await prisma.job.delete({
      where: { id: jobId }
    })

    return NextResponse.json(
      { message: "Job deleted successfully" },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error deleting job:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete job" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const jobId = BigInt(params.id)
    const body: UpdateJobRequest = await req.json()
    const now = BigInt(Math.floor(Date.now() / 1000))

    const quickTestResult = parseQuickTestConfigInput(body.quickTest)
    if (!quickTestResult.ok) {
      return NextResponse.json({ error: quickTestResult.error }, { status: 400 })
    }

    // Check if job exists
    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        workflow: {
          include: {
            steps: {
              select: {
                id: true
              }
            }
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      }
    })

    if (!existingJob) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      )
    }

    // Check if workflow steps are being updated and if any are in use
    if (body.workflowSteps && existingJob.workflow) {
      // Check if any workflow steps are being used in candidate pipelines
      const workflowStepIds = existingJob.workflow.steps.map(s => s.id)
      const stepsInUse = await prisma.candidatePipelineStep.findFirst({
        where: {
          workflowStepId: { in: workflowStepIds }
        }
      })
      
      if (stepsInUse) {
        return NextResponse.json(
          { error: "Cannot update workflow steps that are already in use by candidate pipelines" },
          { status: 400 }
        )
      }

      // Validate workflow steps
      if (body.workflowSteps.length === 0) {
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

      // Validate required fields for each step
      for (const step of body.workflowSteps) {
        if (!step.stepName || step.stepName.trim() === "") {
          return NextResponse.json(
            { error: `Step ${step.stepOrder}: Step Name is required` },
            { status: 400 }
          )
        }

        if (step.interviewMode === "Remote" && (!step.meetingLink || step.meetingLink.trim() === "")) {
          return NextResponse.json(
            { error: `Step ${step.stepOrder}: Meeting Link is required for Remote interviews` },
            { status: 400 }
          )
        }

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
      }
    }

    // Validate date range if dates are being updated
    if (body.postFrom && body.postTo) {
      const postFrom = new Date(body.postFrom)
      const postTo = new Date(body.postTo)
      if (postTo < postFrom) {
        return NextResponse.json(
          { error: "Post To date must be after or equal to Post From date" },
          { status: 400 }
        )
      }
    } else if (body.postFrom || body.postTo) {
      const postFrom = body.postFrom ? new Date(body.postFrom) : existingJob.postFrom
      const postTo = body.postTo ? new Date(body.postTo) : existingJob.postTo
      if (postTo < postFrom) {
        return NextResponse.json(
          { error: "Post To date must be after or equal to Post From date" },
          { status: 400 }
        )
      }
    }

    let parsedJobSkills: Array<{ skillName: string; priority: "REQUIRED" | "PREFERRED" }> | undefined
    if (body.skills !== undefined) {
      if (body.skills.length > 0) {
        const rawNames = body.skills.map((s) => (typeof s === "string" ? s : s.skillName))
        const skillsResult = parseAndValidateSkillNames(rawNames)
        if (!skillsResult.valid) {
          return NextResponse.json({ error: skillsResult.error }, { status: 400 })
        }
        parsedJobSkills = skillsResult.normalized.map((norm, idx) => {
          const item = body.skills![idx]
          const priority = typeof item === "object" && item.priority === "PREFERRED" ? "PREFERRED" : "REQUIRED"
          return { skillName: norm, priority }
        })
      } else {
        parsedJobSkills = []
      }
    }

    let parsedCriteria: ReturnType<typeof parseHiringCriteria> | undefined
    if (body.hiringCriteria !== undefined) {
      parsedCriteria = parseHiringCriteria(body.hiringCriteria)
      if (!parsedCriteria.valid) {
        return NextResponse.json({ error: parsedCriteria.error }, { status: 400 })
      }
      if (parsedCriteria.data.instituteIds.length > 0) {
        const found = await prisma.institute.count({
          where: { id: { in: parsedCriteria.data.instituteIds }, deletedAt: null }
        })
        if (found !== parsedCriteria.data.instituteIds.length) {
          return NextResponse.json({ error: "One or more selected institutes do not exist" }, { status: 400 })
        }
      }
    }

    // Update job using transaction
    const updatedJob = await prisma.$transaction(async (tx) => {
      // Update job basic info
      const updateData: any = {
        updatedAt: now
      }

      if (body.title !== undefined) updateData.title = body.title
      if (body.shortDescription !== undefined) updateData.shortDescription = body.shortDescription
      if (body.description !== undefined) updateData.description = body.description
      if (body.company !== undefined) updateData.company = body.company
      if (body.postFrom !== undefined) updateData.postFrom = new Date(body.postFrom)
      if (body.postTo !== undefined) updateData.postTo = new Date(body.postTo)
      if (body.status !== undefined) updateData.status = body.status
      if (body.industry !== undefined) updateData.industry = body.industry
      if (body.employmentType !== undefined) updateData.employmentType = body.employmentType
      if (body.employmentShift !== undefined) updateData.employmentShift = body.employmentShift
      if (body.totalPositions !== undefined) updateData.totalPositions = body.totalPositions
      if (body.minimumExperience !== undefined) updateData.minimumExperience = body.minimumExperience
      if (body.certification !== undefined) updateData.certification = body.certification
      if (body.minimumSalary !== undefined) updateData.minimumSalary = body.minimumSalary
      if (body.benefits !== undefined) updateData.benefits = body.benefits
      if (body.successCriteria !== undefined) updateData.successCriteria = body.successCriteria || null
      if (parsedCriteria && parsedCriteria.valid) {
        updateData.minAge = parsedCriteria.data.minAge
        updateData.maxAge = parsedCriteria.data.maxAge
        updateData.minCgpa = parsedCriteria.data.minCgpa
        updateData.cgpaScale = parsedCriteria.data.cgpaScale
      }
      if (body.organizationAlias !== undefined) updateData.organizationAlias = body.organizationAlias

      const job = await tx.job.update({
        where: { id: jobId },
        data: updateData
      })

      // Update locations if provided
      if (body.locations !== undefined) {
        // Delete existing locations
        await tx.jobLocation.deleteMany({
          where: { jobId: jobId }
        })

        // Create new locations
        if (body.locations.length > 0) {
          await tx.jobLocation.createMany({
            data: body.locations.map(location => ({
              jobId: jobId,
              city: location.city,
              country: location.country,
              createdAt: now,
              updatedAt: now
            }))
          })
        }
      }

      // Update skills if provided
      if (parsedJobSkills !== undefined) {
        // Delete existing skills
        await tx.jobSkill.deleteMany({
          where: { jobId: jobId }
        })

        // Create new skills
        if (parsedJobSkills.length > 0) {
          await tx.jobSkill.createMany({
            data: parsedJobSkills.map(skill => ({
              jobId: jobId,
              skillName: skill.skillName,
              priority: skill.priority as any
            }))
          })
        }
      }

      if (parsedCriteria && parsedCriteria.valid) {
        await tx.jobAllowedInstitute.deleteMany({ where: { jobId: jobId } })
        if (parsedCriteria.data.instituteIds.length > 0) {
          await tx.jobAllowedInstitute.createMany({
            data: parsedCriteria.data.instituteIds.map((instituteId) => ({ jobId: jobId, instituteId }))
          })
        }
      }

      // Update education requirements if provided
      if (body.educationRequirements !== undefined) {
        // Delete existing education requirements
        await tx.jobEducationRequirement.deleteMany({
          where: { jobId: jobId }
        })

        // Create new education requirements
        if (body.educationRequirements.length > 0) {
          const eduData = [] as any[]
          for (const req of body.educationRequirements) {
            let levelId: bigint | null = null
            if (req.educationLevelId) {
              levelId = BigInt(req.educationLevelId)
            } else if (req.educationLevelName) {
              const level = await tx.userEducationLevel.findFirst({ 
                where: { name: req.educationLevelName } 
              })
              if (level) levelId = level.id
            }
            if (levelId) {
              eduData.push({
                jobId: jobId,
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
      }

      // Update workflow if provided
      if (body.workflowSteps !== undefined && existingJob.workflow) {
        // Delete existing workflow steps (only if not in use, which we checked above)
        await tx.workflowStep.deleteMany({
          where: { workflowId: existingJob.workflow.id }
        })

        // Create new workflow steps
        for (const step of body.workflowSteps) {
          const primaryInterviewerId = step.interviewerIds && step.interviewerIds.length > 0
            ? step.interviewerIds[0]
            : step.interviewerId

          // Build stepMetadata JSON
          const stepMetadata: any = {}
          
          if (step.stepType) stepMetadata.stepType = step.stepType
          if (step.skipReason) stepMetadata.skipReason = step.skipReason
          if (step.durationMins !== undefined) stepMetadata.durationMins = step.durationMins
          if (step.weightage !== undefined) stepMetadata.weightage = step.weightage
          if (step.scoreThreshold !== undefined) stepMetadata.scoreThreshold = step.scoreThreshold
          if (step.interviewMode) stepMetadata.interviewMode = step.interviewMode
          if (step.meetingLink) stepMetadata.meetingLink = step.meetingLink
          if (step.interviewerIds && step.interviewerIds.length > 0) stepMetadata.interviewerIds = step.interviewerIds
          if (step.routeVisibility && step.routeVisibility.length > 0) stepMetadata.routeVisibility = step.routeVisibility
          if (step.evaluationCriteria && step.evaluationCriteria.length > 0) stepMetadata.evaluationCriteria = step.evaluationCriteria
          if (step.candidateInstructions) stepMetadata.candidateInstructions = step.candidateInstructions
          if (step.interviewerInstructions) stepMetadata.interviewerInstructions = step.interviewerInstructions
          if (step.attachments && step.attachments.length > 0) {
            stepMetadata.attachments = step.attachments.map(att => ({
              id: att.id,
              fileName: att.fileName,
              fileSize: att.fileSize,
              fileType: att.fileType,
              access: att.access
            }))
          }

          await tx.workflowStep.create({
            data: {
              workflowId: existingJob.workflow.id,
              stepName: step.stepName,
              stepOrder: step.stepOrder,
              isRequired: step.isRequired,
              isSkippable: step.isSkippable,
              status: 'ACTIVE',
              stepMetadata: Object.keys(stepMetadata).length > 0 ? stepMetadata : null,
              createdAt: now,
              updatedAt: now
            }
          })
        }

        // Update workflow updatedAt
        await tx.jobWorkflow.update({
          where: { id: existingJob.workflow.id },
          data: { updatedAt: now }
        })
      }

      if (quickTestResult.value) {
        await upsertJobQuickTest(tx, jobId, quickTestResult.value)
      }

      return job
    })

    return NextResponse.json({
      success: true,
      message: "Job updated successfully",
      job: {
        id: updatedJob.id.toString(),
        jobCode: updatedJob.jobCode,
        title: updatedJob.title
      }
    })
  } catch (error: any) {
    console.error("Error updating job:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update job" },
      { status: 500 }
    )
  }
}

