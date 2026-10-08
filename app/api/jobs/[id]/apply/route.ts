import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notifyAdminNewApplication, notifyInterviewerAssignment } from "@/lib/notifications"
import { sendApplicationConfirmationEmail, sendInterviewerAssignmentEmail, sendAdminNewApplicationEmail } from "@/lib/email"
import { handleBulkApplication } from "@/lib/services/bulk-hiring-service"
import { ensurePipelineForApplication } from "@/lib/services/pipeline-gate"
import { ensureJobStatusCurrent } from "@/lib/middleware/job-status-check"
import {
  getEnabledQuickTest,
  hasCompletedQuickTest,
  linkAttemptToApplication,
} from "@/lib/services/quick-test-service"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    // Jobs with a quick test require a finished attempt before the application can be created
    const quickTestConfig = await getEnabledQuickTest(jobId)
    if (quickTestConfig && !(await hasCompletedQuickTest(jobId, userIdBig))) {
      return NextResponse.json(
        {
          error: "Complete the quick test before submitting your application.",
          code: "QUICK_TEST_REQUIRED",
          redirectTo: `/candidate/quick-test/${jobId.toString()}`,
        },
        { status: 403 }
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
        await linkAttemptToApplication(jobId, userIdBig, applicationId)
        
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

    await linkAttemptToApplication(jobId, userIdBig, application.id)

    const candidateName = `${application.user.firstname} ${application.user.lastname}`
    const jobTitle = application.job.title
    const jobCompany = application.job.company || ""

    // Create pipeline if job has a workflow
    if (application.job.workflow && application.job.workflow.steps.length > 0) {
      // Create pipeline with ONLY step 1 initially
      // Next steps will be created when previous step is completed
      const pipeline = await prisma.$transaction((tx) =>
        ensurePipelineForApplication(tx, {
          applicationId: application.id,
          jobId,
          userId: userIdBig,
          startedAt: now,
        })
      )

      if (!pipeline) {
        return NextResponse.json(
          { error: "Workflow must have a step 1" },
          { status: 400 }
        )
      }
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
