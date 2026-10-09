import { parseStepMetadata, readStepConfig, toPublicStep } from "@/lib/workflow/step-config"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = BigInt(params.id)

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        deletedAt: null,
        status: true
      },
      include: {
        skills: true,
        locations: true,
        educationRequirements: {
          include: {
            educationLevel: true
          }
        },
        workflow: {
          include: {
            steps: {
              orderBy: {
                stepOrder: "asc"
              }
            }
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

    const workflowSteps = job.workflow?.steps.map((step) => {
      const cfg = readStepConfig(step)
      const meta = parseStepMetadata(step.stepMetadata)

      let timeline: string | undefined
      if (cfg.isInterview) {
        timeline = `${cfg.durationMins} min ${cfg.interviewMode ? cfg.interviewMode.toLowerCase() + " " : ""}interview`
      } else if (meta.weightage) {
        timeline = `Weightage: ${meta.weightage}%`
      }

      return {
        id: step.id.toString(),
        title: step.stepName,
        order: step.stepOrder,
        description: cfg.candidateInstructions || cfg.stepType || "Interview stage",
        timeline,
        // Public endpoint: only non-sensitive fields (no meeting links, interviewers or staff notes)
        metadata: toPublicStep(step),
      }
    }) || []

    return NextResponse.json({
      job: {
        id: job.id.toString(),
        title: job.title,
        company: job.company,
        jobType: job.jobType,
        jobStatus: job.jobStatus,
        employmentType: job.employmentType,
        employmentShift: job.employmentShift,
        minimumExperience: job.minimumExperience,
        minimumSalary: job.minimumSalary,
        benefits: job.benefits,
        skills: job.skills.map((skill) => skill.skillName),
        locations: job.locations.map((location) => ({
          city: location.city,
          country: location.country
        })),
        educationRequirements: job.educationRequirements.map((req) => ({
          level: req.educationLevel?.name,
          field: req.field,
          notes: req.notes
        })),
        workflowSteps
      }
    })
  } catch (error) {
    console.error("Error fetching public job:", error)
    return NextResponse.json(
      { error: "Failed to fetch job details" },
      { status: 500 }
    )
  }
}


