import { NextRequest, NextResponse } from "next/server"
import {
  buildStepColumns,
  buildStepMetadata,
  normalizeStep,
  syncStepInterviewers,
  validateWorkflow,
  type WorkflowStepPayload,
} from "@/lib/workflow/step-persistence"
import { parseStepMetadata, readStepConfig } from "@/lib/workflow/step-config"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { parseAndValidateSkillNames } from "@/lib/skills"
import { HiringCriteriaInput, parseHiringCriteria } from "@/lib/job-criteria"
import { parseQuickTestConfigInput, upsertJobQuickTest } from "@/lib/services/quick-test-service"

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
  workflowSteps?: WorkflowStepPayload[]
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
              },
              include: { interviewers: { select: { interviewerId: true } } }
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
            const cfg = readStepConfig(s)
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
              stepType: cfg.stepType,
              skipReason: metadata.skipReason,
              durationMins: cfg.isInterview ? cfg.durationMins : undefined,
              interviewMode: cfg.interviewMode,
              panelSize: cfg.panelSize,
              groupSize: cfg.groupSize,
              bufferMins: cfg.bufferMins,
              weightage: metadata.weightage,
              scoreThreshold: metadata.scoreThreshold,
              meetingLink: cfg.meetingLink,
              location: cfg.location,
              interviewerIds: s.interviewers.map(i => i.interviewerId.toString()),
              routeVisibility: metadata.routeVisibility || [],
              evaluationCriteria: metadata.evaluationCriteria || [],
              candidateInstructions: cfg.candidateInstructions,
              interviewerInstructions: cfg.interviewerInstructions,
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
                id: true,
                stepType: true,
                stepOrder: true,
                stepMetadata: true
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

    // Workflow validation. Candidates already in the pipeline => settings may change, structure may not.
    let workflowStructureLocked = false
    if (body.workflowSteps && existingJob.workflow) {
      const workflowError = validateWorkflow(body.workflowSteps as WorkflowStepPayload[])
      if (workflowError) {
        return NextResponse.json({ error: workflowError }, { status: 400 })
      }

      const workflowStepIds = existingJob.workflow.steps.map(s => s.id)
      const stepsInUse = await prisma.candidatePipelineStep.findFirst({
        where: { workflowStepId: { in: workflowStepIds } },
        select: { id: true },
      })
      workflowStructureLocked = !!stepsInUse

      if (workflowStructureLocked) {
        const existingById = new Map(existingJob.workflow.steps.map(s => [s.id.toString(), s]))
        const incoming = body.workflowSteps as WorkflowStepPayload[]
        const sameStructure =
          incoming.length === existingById.size &&
          incoming.every(step => {
            const current = step.id ? existingById.get(String(step.id)) : undefined
            return !!current && (current.stepType ?? parseStepMetadata(current.stepMetadata).stepType) === step.stepType && current.stepOrder === step.stepOrder
          })
        if (!sameStructure) {
          return NextResponse.json(
            { error: "Candidates are already in this workflow. You can change round settings, but not add, remove or reorder rounds." },
            { status: 400 }
          )
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

      // Update workflow in place so slots, interviewer pools and bookings survive edits
      if (body.workflowSteps !== undefined && existingJob.workflow) {
        const workflowId = existingJob.workflow.id
        const existingSteps = new Map(existingJob.workflow.steps.map(st => [st.id.toString(), st]))
        const incoming = [...(body.workflowSteps as WorkflowStepPayload[])].sort((x, y) => x.stepOrder - y.stepOrder)
        const keepIds = new Set<string>()

        // Park existing orders first so reordering cannot trip any ordering constraint
        for (const st of existingJob.workflow.steps) {
          await tx.workflowStep.update({ where: { id: st.id }, data: { stepOrder: st.stepOrder + 1000 } })
        }

        for (const raw of incoming) {
          const step = normalizeStep(raw)
          const current = raw.id ? existingSteps.get(String(raw.id)) : undefined
          const columns = buildStepColumns(step)
          let stepId: bigint
          if (current) {
            keepIds.add(current.id.toString())
            await tx.workflowStep.update({
              where: { id: current.id },
              data: { ...columns, status: 'ACTIVE', stepMetadata: buildStepMetadata(step, current.stepMetadata), updatedAt: now },
            })
            stepId = current.id
          } else {
            const created = await tx.workflowStep.create({
              data: { workflowId, ...columns, status: 'ACTIVE', stepMetadata: buildStepMetadata(step), createdAt: now, updatedAt: now },
            })
            stepId = created.id
          }
          await syncStepInterviewers(tx, stepId, step.interviewerIds, now)
        }

        if (!workflowStructureLocked) {
          const removed = existingJob.workflow.steps.filter(st => !keepIds.has(st.id.toString())).map(st => st.id)
          if (removed.length > 0) await tx.workflowStep.deleteMany({ where: { id: { in: removed } } })
        }

        await tx.jobWorkflow.update({ where: { id: workflowId }, data: { updatedAt: now } })
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

