import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";

// GET /api/admin/jobs/[id]/rounds/[roundId]/candidates - Get candidates for a round
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string } },
) {
  try {
    const user = await requireAdmin();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // 'applied', 'shortlisted', etc.

    // Get all pipeline steps for this workflow step
    const pipelineSteps = await prisma.candidatePipelineStep.findMany({
      where: {
        workflowStepId: BigInt(params.roundId),
        pipeline: {
          jobId: BigInt(params.id),
          // Filter out shortlisted applications when status="applied"
          // When status="applied", we want all candidates in this step regardless of global status
          // EXCEPT those who have already completed this step (moved to next) or are rejected in this step
          // But actually, the status filter on the step itself handles most of this.
          // The global application status filter was hiding candidates who were shortlisted in previous rounds.
          ...(status === "shortlisted"
            ? {
                application: {
                  status: "SHORTLISTED",
                },
              }
            : {}),
        },
        ...(status === "shortlisted"
          ? {
              status: { in: ["IN_PROGRESS", "COMPLETED"] },
            }
          : status === "applied"
            ? {
                status: { in: ["PENDING", "REJECTED"] },
              }
            : {}),
      },
      include: {
        pipeline: {
          include: {
            candidate: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
              },
            },
            application: {
              select: {
                appliedAt: true,
                statusUpdatedAt: true,
                status: true,
              },
            },
          },
        },
        stageEvaluations: {
          include: {
            interviewer: {
              select: {
                firstname: true,
                lastname: true,
              },
            },
          },
        },
      },
    });

    const candidates = pipelineSteps.map((step) => {
      const evaluation = step.stageEvaluations[0]; // Get first evaluation

      return {
        id: step.pipeline.candidate.id.toString(),
        name: `${step.pipeline.candidate.firstname} ${step.pipeline.candidate.lastname}`,
        email: step.pipeline.candidate.email,
        appliedAt: step.pipeline.application.appliedAt.toString(),
        shortlistedAt:
          step.startedAt?.toString() ||
          step.pipeline.application.statusUpdatedAt?.toString(),
        status: step.status,
        applicationStatus: step.pipeline.application.status, // Include application status
        pipelineStepId: step.id.toString(),
        assessmentStatus: evaluation?.submittedAt
          ? "completed"
          : evaluation
            ? "in_progress"
            : "pending",
        assessmentScore: evaluation?.score,
        recommendation: evaluation?.recommendation,
        interviewer: evaluation?.interviewer
          ? `${evaluation.interviewer.firstname} ${evaluation.interviewer.lastname}`
          : undefined,
        assessedAt: evaluation?.submittedAt?.toString(),
      };
    });

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/admin/jobs/[id]/rounds/[roundId]/candidates - Perform bulk actions
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; roundId: string } },
) {
  try {
    const user = await requireAdmin();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { action, candidateIds } = body;

    if (!action || !candidateIds || !Array.isArray(candidateIds)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const roundId = BigInt(params.roundId);
    const jobId = BigInt(params.id);
    const now = BigInt(Math.floor(Date.now() / 1000));

    switch (action) {
      case "shortlist":
        // Validate that candidates are in PENDING status before shortlisting
        const pendingSteps = await prisma.candidatePipelineStep.findMany({
          where: {
            workflowStepId: roundId,
            pipeline: {
              jobId: jobId,
              candidateId: { in: candidateIds.map((id) => BigInt(id)) },
            },
            status: "PENDING",
          },
          select: { id: true },
        });

        if (pendingSteps.length !== candidateIds.length) {
          return NextResponse.json(
            {
              error:
                "Some candidates are not in PENDING status and cannot be shortlisted",
            },
            { status: 400 },
          );
        }

        // Update pipeline steps to IN_PROGRESS status
        await prisma.candidatePipelineStep.updateMany({
          where: {
            workflowStepId: roundId,
            pipeline: {
              jobId: jobId,
              candidateId: { in: candidateIds.map((id) => BigInt(id)) },
            },
            status: "PENDING", // Only update PENDING candidates
          },
          data: {
            status: "IN_PROGRESS",
            startedAt: now,
          },
        });

        // Update application status
        await prisma.jobsApplied.updateMany({
          where: {
            jobId: jobId,
            userId: { in: candidateIds.map((id) => BigInt(id)) },
          },
          data: {
            status: "SHORTLISTED",
            statusUpdatedAt: now,
          },
        });
        break;

      case "reject":
        // Validate that candidates are in PENDING or IN_PROGRESS status before rejecting
        const pendingStepsForReject =
          await prisma.candidatePipelineStep.findMany({
            where: {
              workflowStepId: roundId,
              pipeline: {
                jobId: jobId,
                candidateId: { in: candidateIds.map((id) => BigInt(id)) },
              },
              status: { in: ["PENDING", "IN_PROGRESS"] },
            },
            select: { id: true },
          });

        if (pendingStepsForReject.length !== candidateIds.length) {
          return NextResponse.json(
            {
              error:
                "Some candidates are not in PENDING or IN_PROGRESS status and cannot be rejected",
            },
            { status: 400 },
          );
        }

        // Update pipeline steps to REJECTED
        await prisma.candidatePipelineStep.updateMany({
          where: {
            workflowStepId: roundId,
            pipeline: {
              jobId: jobId,
              candidateId: { in: candidateIds.map((id) => BigInt(id)) },
            },
            status: { in: ["PENDING", "IN_PROGRESS"] },
          },
          data: {
            status: "REJECTED",
            completedAt: now,
          },
        });

        // Update overall pipeline status
        await prisma.candidatePipeline.updateMany({
          where: {
            jobId: jobId,
            candidateId: { in: candidateIds.map((id) => BigInt(id)) },
          },
          data: {
            overallStatus: "REJECTED",
            completedAt: now,
            lockState: "LOCKED_REJECTED",
          },
        });
        break;

      case "move_next":
        // Complete current step
        await prisma.candidatePipelineStep.updateMany({
          where: {
            workflowStepId: roundId,
            pipeline: {
              jobId: jobId,
              candidateId: { in: candidateIds.map((id) => BigInt(id)) },
            },
          },
          data: {
            status: "COMPLETED",
            completedAt: now,
          },
        });

        // Get next workflow step
        const currentStep = await prisma.workflowStep.findUnique({
          where: { id: roundId },
          select: { stepOrder: true, workflowId: true },
        });

        let nextStepId: string | null = null;

        if (currentStep) {
          const candidateIdsBigInt = candidateIds.map((id: string) =>
            BigInt(id),
          );

          const nextStep = await prisma.workflowStep.findFirst({
            where: {
              workflowId: currentStep.workflowId,
              stepOrder: { gt: currentStep.stepOrder },
            },
            orderBy: { stepOrder: "asc" },
          });

          if (nextStep) {
            nextStepId = nextStep.id.toString();

            // Update pipeline current step
            await prisma.candidatePipeline.updateMany({
              where: {
                jobId: jobId,
                candidateId: { in: candidateIdsBigInt },
              },
              data: {
                currentStepOrder: nextStep.stepOrder,
              },
            });

            // Ensure a pipeline step exists for the next step for each candidate
            const pipelines = await prisma.candidatePipeline.findMany({
              where: {
                jobId: jobId,
                candidateId: { in: candidateIdsBigInt },
              },
              select: { id: true, candidateId: true },
            });

            for (const pipeline of pipelines) {
              const existingNextStep =
                await prisma.candidatePipelineStep.findFirst({
                  where: {
                    workflowStepId: nextStep.id,
                    pipelineId: pipeline.id,
                  },
                });

              if (existingNextStep) {
                await prisma.candidatePipelineStep.update({
                  where: { id: existingNextStep.id },
                  data: {
                    status: "PENDING",
                    startedAt: now,
                    completedAt: null,
                  },
                });
              } else {
                await prisma.candidatePipelineStep.create({
                  data: {
                    workflowStepId: nextStep.id,
                    pipelineId: pipeline.id,
                    status: "PENDING",
                    startedAt: now,
                    stepOrder: nextStep.stepOrder,
                  },
                });
              }
            }
          } else {
            // No next step - mark pipeline as completed
            await prisma.candidatePipeline.updateMany({
              where: {
                jobId: jobId,
                candidateId: { in: candidateIds.map((id) => BigInt(id)) },
              },
              data: {
                overallStatus: "COMPLETED",
                completedAt: now,
              },
            });
          }
        }

        return NextResponse.json({
          success: true,
          action,
          count: candidateIds.length,
          nextStepId,
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      count: candidateIds.length,
    });
  } catch (error) {
    console.error("Error performing action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
