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

    const where: any = {
      deletedAt: null,
      status: true,
      jobStatus: "ACTIVE",
      postTo: {
        gte: new Date(),
      },
    };

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

    // Fetch counts for all rounds for each job in parallel
    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => {
        const workflow = (job as any).workflow;
        const steps = workflow?.steps || [];

        const roundCounts: Record<
          string,
          { shortlisted: number; unshortlisted: number }
        > = {};

        // Calculate counts for each step type
        const stepTypes = [
          "TEST",
          "SCREENING_INTERVIEW",
          "FOCUS_GROUP",
          "FINAL_INTERVIEW",
          "OFFER",
        ];

        for (const stepType of stepTypes) {
          const step = steps.find((s: any) => s.stepType === stepType);

          if (step) {
            // Count shortlisted candidates (in progress or completed in this step)
            const shortlisted = await prisma.candidatePipelineStep.count({
              where: {
                workflowStepId: step.id,
                pipeline: {
                  jobId: job.id,
                  application: {
                    status: "SHORTLISTED",
                  },
                },
                status: { in: ["IN_PROGRESS", "COMPLETED"] },
              },
            });

            // Count unshortlisted candidates (pending, in progress, or rejected in this step)
            const unshortlisted = await prisma.candidatePipelineStep.count({
              where: {
                workflowStepId: step.id,
                pipeline: {
                  jobId: job.id,
                  application: {
                    status: { not: "SHORTLISTED" },
                  },
                },
                status: { in: ["PENDING", "IN_PROGRESS", "REJECTED"] },
              },
            });

            roundCounts[stepType] = {
              shortlisted,
              unshortlisted,
            };
          }
        }

        return {
          job,
          roundCounts,
        };
      }),
    );

    return NextResponse.json({
      jobs: jobsWithCounts.map(({ job, roundCounts }) => ({
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
