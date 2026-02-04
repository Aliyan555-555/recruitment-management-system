import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculatePipelineMetrics } from "@/lib/pipeline-metrics";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Fetch statistics in parallel
    const [
      totalJobs,
      activeCandidates,
      pendingInterviews,
      completedPipelines,
      totalPipelines,
      recentPipelines,
      recentJobs,
    ] = await Promise.all([
      // Total active jobs
      prisma.job.count({
        where: {
          deletedAt: null,
          status: true,
          postTo: {
            gte: new Date(),
          },
        },
      }),

      // Active candidates (in progress pipelines)
      prisma.candidatePipeline.count({
        where: {
          overallStatus: "IN_PROGRESS",
        },
      }),

      // Pending interviews (steps waiting for interviewer feedback)
      prisma.candidatePipelineStep.count({
        where: {
          status: "IN_PROGRESS",
        },
      }),

      // Completed pipelines
      prisma.candidatePipeline.count({
        where: {
          overallStatus: "COMPLETED",
        },
      }),

      // Total pipelines
      prisma.candidatePipeline.count(),

      // Recent pipelines (last 15)
      prisma.candidatePipeline.findMany({
        take: 15,
        include: {
          candidate: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true,
            },
          },
          job: {
            select: {
              id: true,
              title: true,
              company: true,
              workflow: {
                select: {
                  steps: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
          steps: {
            select: {
              status: true,
              stepOrder: true,
            },
            orderBy: {
              stepOrder: "asc",
            },
          },
        },
        orderBy: {
          startedAt: "desc",
        },
      }),

      // Recent jobs (last 10)
      prisma.job.findMany({
        take: 10,
        where: {
          deletedAt: null,
          status: true,
        },
        include: {
          _count: {
            select: {
              applications: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    // Calculate completion rate
    const completionRate =
      totalPipelines > 0
        ? Math.round((completedPipelines / totalPipelines) * 100)
        : 0;

    return NextResponse.json({
      stats: {
        totalJobs,
        activeCandidates,
        pendingInterviews,
        completionRate,
      },
      recentPipelines: recentPipelines.map((p) => {
        const pipelineSteps = p.steps ?? [];
        const totalWorkflowSteps = p.job.workflow?.steps.length ?? 0;
        const metrics = calculatePipelineMetrics({
          totalWorkflowSteps,
          pipelineSteps,
          currentStepOrder: p.currentStepOrder,
          overallStatus: p.overallStatus,
        });

        return {
          id: p.id.toString(),
          candidateId: p.candidate.id.toString(),
          candidateName: `${p.candidate.firstname} ${p.candidate.lastname}`,
          candidateEmail: p.candidate.email,
          jobTitle: p.job.title,
          jobCompany: p.job.company,
          status: p.overallStatus,
          currentStep: metrics.currentStep,
          totalSteps: metrics.totalSteps,
          completedSteps: metrics.completedSteps,
          progressPercent: metrics.progressPercent,
          startedAt: new Date(Number(p.startedAt) * 1000).toISOString(),
        };
      }),
      recentJobs: recentJobs.map((job) => ({
        id: job.id.toString(),
        title: job.title,
        company: job.company,
        applicationCount: job._count.applications,
        createdAt: job.createdAt.toString(),
      })),
    });
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard statistics" },
      { status: 500 },
    );
  }
}
