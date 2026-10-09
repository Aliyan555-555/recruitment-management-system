import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { generateJobCode } from "@/lib/utils"
import { parseAndValidateSkillNames } from "@/lib/skills"
import { HiringCriteriaInput, parseHiringCriteria } from "@/lib/job-criteria"
import {
  buildStepColumns,
  buildStepMetadata,
  normalizeStep,
  syncStepInterviewers,
  validateWorkflow,
  type WorkflowStepPayload,
} from "@/lib/workflow/step-persistence"
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
  successCriteria?: string
  organizationAlias?: string
  status?: boolean
  skills?: Array<string | { skillName: string; priority?: "REQUIRED" | "PREFERRED" }>
  locations?: JobLocationInput[]
  educationRequirements?: JobEducationRequirementInput[]
  hiringCriteria?: HiringCriteriaInput
  workflowSteps: WorkflowStepPayload[]
  quickTest?: { enabled: boolean; questionCount?: number; timeLimitMinutes?: number }
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

    const quickTestResult = parseQuickTestConfigInput(body.quickTest)
    if (!quickTestResult.ok) {
      return NextResponse.json({ error: quickTestResult.error }, { status: 400 })
    }

    // Validate workflow steps (order, offer-last, per-step interview settings)
    const workflowError = validateWorkflow(body.workflowSteps as WorkflowStepPayload[])
    if (workflowError) {
      return NextResponse.json({ error: workflowError }, { status: 400 })
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

    let parsedJobSkills: Array<{ skillName: string; priority: "REQUIRED" | "PREFERRED" }> = []
    if (body.skills && body.skills.length > 0) {
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
    }

    const criteriaResult = parseHiringCriteria(body.hiringCriteria)
    if (!criteriaResult.valid) {
      return NextResponse.json({ error: criteriaResult.error }, { status: 400 })
    }
    const criteria = criteriaResult.data
    if (criteria.instituteIds.length > 0) {
      const found = await prisma.institute.count({ where: { id: { in: criteria.instituteIds }, deletedAt: null } })
      if (found !== criteria.instituteIds.length) {
        return NextResponse.json({ error: "One or more selected institutes do not exist" }, { status: 400 })
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
          successCriteria: body.successCriteria || null,
          minAge: criteria.minAge,
          maxAge: criteria.maxAge,
          minCgpa: criteria.minCgpa,
          cgpaScale: criteria.cgpaScale,
          createdBy: adminId,
          updatedBy: adminId,
          createdAt: now,
          updatedAt: now,
        },
      })

      if (criteria.instituteIds.length > 0) {
        await tx.jobAllowedInstitute.createMany({
          data: criteria.instituteIds.map((instituteId) => ({ jobId: newJob.id, instituteId })),
        })
      }

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
      if (parsedJobSkills.length > 0) {
        await tx.jobSkill.createMany({
          data: parsedJobSkills.map(skill => ({
            jobId: newJob.id,
            skillName: skill.skillName,
            priority: skill.priority as any,
          }))
        })
      }

      // Create workflow + steps (typed columns) and the interviewer pool of each step
      const workflow = await tx.jobWorkflow.create({
        data: { jobId: newJob.id, createdAt: now, updatedAt: now },
      })
      const orderedSteps = [...(body.workflowSteps as WorkflowStepPayload[])].sort((x, y) => x.stepOrder - y.stepOrder)
      for (const raw of orderedSteps) {
        const step = normalizeStep(raw)
        const created = await tx.workflowStep.create({
          data: {
            workflowId: workflow.id,
            ...buildStepColumns(step),
            status: "ACTIVE",
            stepMetadata: buildStepMetadata(step),
            createdAt: now,
            updatedAt: now,
          },
        })
        if (step.interviewerIds.length > 0) {
          await syncStepInterviewers(tx, created.id, step.interviewerIds, now)
        }
      }

      if (quickTestResult.value) {
        await upsertJobQuickTest(tx, newJob.id, quickTestResult.value)
      }

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

