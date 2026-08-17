import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notifyAdminNewApplication, notifyInterviewerAssignment } from "@/lib/notifications"
import { sendApplicationConfirmationEmail, sendInterviewerAssignmentEmail, sendAdminNewApplicationEmail } from "@/lib/email"
import { handleBulkApplication } from "@/lib/services/bulk-hiring-service"
import { ensureJobStatusCurrent } from "@/lib/middleware/job-status-check"
import { getMandatoryAssessmentStatus } from "@/lib/assessments/mandatory"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const mandatoryStatus = await getMandatoryAssessmentStatus(BigInt(session.user.id))
    if (mandatoryStatus.required) {
      return NextResponse.json(
        {
          error:
            mandatoryStatus.reason === "no_skills"
              ? "Add skills to your profile and complete AI assessments before applying."
              : "Complete AI assessments for all skills before applying to jobs.",
          code: "MANDATORY_ASSESSMENTS_PENDING",
          redirectTo: "/candidate/assessments/required",
        },
        { status: 403 }
      )
    }

    const body = await req.json()
    const jobId = BigInt(params.id)
    const userId = session.user.id
    const userIdBig = BigInt(userId)
    const now = BigInt(Math.floor(Date.now() / 1000))

    // Ensure job status is current
    await ensureJobStatusCurrent(jobId)

    // Get job to check type
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        jobType: true,
        jobStatus: true,
        postTo: true
      }
    })

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      )
    }

    // Check if already applied
    const existing = await prisma.jobsApplied.findUnique({
      where: {
        jobId_userId: {
          jobId,
          userId: userIdBig
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: "You have already applied for this job" },
        { status: 400 }
      )
    }

    // Handle bulk hiring differently
    if (job.jobType === "BULK") {
      // Check if job is still accepting applications
      if (job.jobStatus === "ADMIN_SHORTLISTING" || job.jobStatus === "CLOSED") {
        return NextResponse.json(
          { error: "Application deadline has passed" },
          { status: 400 }
        )
      }

      // Use bulk application handler
      try {
        const applicationId = await handleBulkApplication(jobId, userIdBig)
        
        const application = await prisma.jobsApplied.findUnique({
          where: { id: applicationId },
          include: {
            job: {
              select: {
                title: true,
                company: true
              }
            },
            user: {
              select: {
                firstname: true,
                lastname: true,
                email: true
              }
            }
          }
        })

        if (!application) {
          throw new Error("Application not found after creation")
        }

        const candidateName = `${application.user.firstname} ${application.user.lastname}`
        const jobTitle = application.job.title
        const jobCompany = application.job.company || ""

        // Notify all admins
        const admins = await prisma.user.findMany({
          where: { role: "ADMIN" },
          select: { id: true, email: true, firstname: true, lastname: true }
        })

        await Promise.all(
          admins.map(async (admin) => {
            await notifyAdminNewApplication(admin.id, candidateName, jobTitle)

            if (admin.email) {
              await sendAdminNewApplicationEmail(
                admin.email,
                `${admin.firstname} ${admin.lastname}`,
                candidateName,
                jobTitle,
                jobCompany,
                application.id.toString()
              )
            }
          })
        )

        // Send confirmation to candidate
        if (application.user.email) {
          await sendApplicationConfirmationEmail(
            application.user.email,
            candidateName,
            jobTitle,
            jobCompany,
            application.id.toString()
          )
        }

        return NextResponse.json({
          success: true,
          application: {
            id: application.id.toString(),
            status: application.status,
            appliedAt: new Date(Number(application.appliedAt) * 1000).toISOString()
          }
        })
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message || "Failed to submit application" },
          { status: 400 }
        )
      }
    }

    // Normal hiring - create application and pipeline
    const application = await prisma.jobsApplied.create({
      data: {
        jobId,
        userId: userIdBig,
        status: "SUBMITTED",
        appliedAt: now
      },
      include: {
        job: {
          select: {
            title: true,
            company: true,
            workflow: {
              include: {
                steps: true
              }
            }
          }
        },
        user: {
          select: {
            firstname: true,
            lastname: true,
            email: true
          }
        }
      }
    })

    const candidateName = `${application.user.firstname} ${application.user.lastname}`
    const jobTitle = application.job.title
    const jobCompany = application.job.company || ""

    // Create pipeline if job has a workflow
    if (application.job.workflow && application.job.workflow.steps.length > 0) {
      const workflow = application.job.workflow
      
      // Find step 1
      const firstStep = workflow.steps.find(step => step.stepOrder === 1)
      
      if (!firstStep) {
        return NextResponse.json(
          { error: "Workflow must have a step 1" },
          { status: 400 }
        )
      }

      // Create pipeline with ONLY step 1 initially
      // Next steps will be created when previous step is completed
      await (prisma as any).candidatePipeline.create({
        data: {
          candidateId: userIdBig,
          jobId,
          applicationId: application.id,
          currentStepOrder: 1,
          overallStatus: "IN_PROGRESS",
          lockState: "NONE",
          pipelineMode: "INDIVIDUAL",
          startedAt: now,
          steps: {
            create: {
              workflowStepId: firstStep.id,
              stepOrder: 1,
              status: "PENDING",
              startedAt: now,
            }
          }
        }
      })

    }

    // Notify all admins (in-app notification + email)
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true, email: true, firstname: true, lastname: true }
    })

    await Promise.all(
      admins.map(async (admin) => {
        await notifyAdminNewApplication(admin.id, candidateName, jobTitle)

        if (admin.email) {
          await sendAdminNewApplicationEmail(
            admin.email,
            `${admin.firstname} ${admin.lastname}`,
            candidateName,
            jobTitle,
            jobCompany,
            application.id.toString()
          )
        }
      })
    )

    // Send confirmation to candidate
    if (application.user.email) {
      await sendApplicationConfirmationEmail(
        application.user.email,
        candidateName,
        jobTitle,
        jobCompany,
        application.id.toString()
      )
    }

    return NextResponse.json({
      success: true,
      application: {
        id: application.id.toString(),
        status: application.status,
        appliedAt: new Date(Number(application.appliedAt) * 1000).toISOString()
      }
    })
  } catch (error: any) {
    console.error("Apply error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to submit application" },
      { status: 500 }
    )
  }
}
