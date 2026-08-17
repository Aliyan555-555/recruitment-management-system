import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const department = searchParams.get("department");
    const location = searchParams.get("location");
    const includeExpired = searchParams.get("includeExpired") === "1";

    const isAdmin = session.user.role === "ADMIN";
    const showAllJobs = isAdmin && includeExpired;

    const where: any = {
      deletedAt: null,
      status: true,
    };

    if (!showAllJobs) {
      where.jobStatus = "ACTIVE";
      where.postTo = { gte: new Date() };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { shortDescription: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (department && department !== "all") {
      where.industry = department;
    }

    if (location && location !== "all") {
      where.locations = {
        some: {
          city: { contains: location, mode: "insensitive" },
        },
      };
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        skills: true,
        educationRequirements: {
          include: {
            educationLevel: true,
          },
        },
        locations: {
          select: {
            city: true,
            country: true,
          },
        },
        creator: {
          select: {
            firstname: true,
            lastname: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
        workflow: {
          include: {
            steps: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get all job IDs
    const jobIds = jobs.map(j => j.id);

    // 1. Bulk fetch JobsApplied counts
    const jobsAppliedCounts = await prisma.jobsApplied.groupBy({
      by: ['jobId', 'status'],
      where: { jobId: { in: jobIds } },
      _count: true,
    });

    // 2. Bulk fetch PipelineSteps for these jobs
    const pipelineSteps = await prisma.candidatePipelineStep.findMany({
      where: {
        pipeline: { jobId: { in: jobIds } },
      },
      select: {
        status: true,
        workflowStepId: true,
        pipeline: {
          select: {
            jobId: true,
            application: { select: { status: true } }
          }
        }
      }
    });

    // Process counts synchronously
    const jobsWithCounts = jobs.map((job) => {
      const workflow = (job as any).workflow;
      const steps = workflow?.steps || [];

      const roundCounts: Record<string, { shortlisted: number; unshortlisted: number }> = {};
      const stepTypes = ["TEST", "SCREENING_INTERVIEW", "FOCUS_GROUP", "FINAL_INTERVIEW", "OFFER"];

      for (const stepType of stepTypes) {
        const step = steps.find((s: any) => s.stepType === stepType);
        if (step) {
          // Filter in memory
          const stepRecords = pipelineSteps.filter(ps => 
            ps.workflowStepId === step.id && ps.pipeline.jobId === job.id
          );

          const shortlisted = stepRecords.filter(ps => 
            ps.pipeline.application?.status === "SHORTLISTED" && 
            (ps.status === "IN_PROGRESS" || ps.status === "COMPLETED")
          ).length;

          const unshortlisted = stepRecords.filter(ps => 
            ps.pipeline.application?.status !== "SHORTLISTED" && 
            (ps.status === "PENDING" || ps.status === "IN_PROGRESS" || ps.status === "REJECTED")
          ).length;

          roundCounts[stepType] = { shortlisted, unshortlisted };
        }
      }

      // Calculate shortlist counts
      const jobApplications = jobsAppliedCounts.filter(jac => jac.jobId === job.id);
      
      const shortlisted = jobApplications
        .filter(jac => jac.status === "SHORTLISTED" || jac.status === "BATCH_ASSIGNED")
        .reduce((sum, jac) => sum + jac._count, 0);

      const unshortlisted = jobApplications
        .filter(jac => jac.status === "APPLIED" || jac.status === "SUBMITTED")
        .reduce((sum, jac) => sum + jac._count, 0);

      return {
        job,
        roundCounts,
        shortlistCount: { shortlisted, unshortlisted },
      };
    });

    return NextResponse.json({
      jobs: jobsWithCounts.map(({ job, roundCounts, shortlistCount }) => ({
        id: job.id.toString(),
        title: job.title,
        company: job.company,
        status: job.status,
        jobType: (job as any).jobType || "NORMAL",
        jobStatus: (job as any).jobStatus || "ACTIVE",
        shortDescription: job.shortDescription || "",
        description: job.description || undefined,
        locations: job.locations?.map((loc) => ({
          city: loc.city,
          country: loc.country || "",
        })),
        employmentType: job.employmentType,
        postFrom: job.postFrom.toISOString(),
        postTo: job.postTo.toISOString(),
        skills: job.skills?.map((s) => s.skillName) || [],
        minimumEducation:
          job.educationRequirements?.[0]?.educationLevel?.name || undefined,
        createdBy: `${job.creator.firstname} ${job.creator.lastname}`,
        applicationCount: job._count.applications,
        _count: {
          applications: job._count.applications,
        },
        workflow: (job as any).workflow
          ? {
              id: (job as any).workflow.id.toString(),
              steps: (job as any).workflow.steps
                .map((step: any) => ({
                  id: step.id.toString(),
                  name: step.stepName,
                  type: step.stepType,
                  order: step.stepOrder,
                }))
                .sort((a: any, b: any) => a.order - b.order),
            }
          : null,
        roundCounts: roundCounts,
        shortlistCount: shortlistCount,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch jobs" },
      { status: 500 },
    );
  }
}
