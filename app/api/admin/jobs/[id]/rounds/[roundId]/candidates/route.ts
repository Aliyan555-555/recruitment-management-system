import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { admitToRound, rejectFromRound } from "@/lib/services/pipeline-gate";

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
    const status = searchParams.get("status"); // 'pending', 'rejected', 'shortlisted', 'applied' (legacy)

    const jobId = BigInt(params.id);
    const roundId = BigInt(params.roundId);

    const allPipelineSteps = await prisma.candidatePipelineStep.findMany({
      where: {
        workflowStepId: roundId,
        pipeline: { jobId },
      },
      select: { status: true },
    });

    const pending = allPipelineSteps.filter((ps) => ps.status === "PENDING").length;
    const inProgress = allPipelineSteps.filter((ps) => ps.status === "IN_PROGRESS").length;
    const completed = allPipelineSteps.filter((ps) => ps.status === "COMPLETED").length;
    const rejected = allPipelineSteps.filter((ps) => ps.status === "REJECTED").length;
    const counts = {
      pending,
      inProgress,
      completed,
      rejected,
      shortlisted: inProgress + completed,
      total: allPipelineSteps.length,
    };

    const stepStatusFilter =
      status === "shortlisted"
        ? { in: ["IN_PROGRESS", "COMPLETED"] as ("IN_PROGRESS" | "COMPLETED")[] }
        : status === "rejected"
          ? ("REJECTED" as const)
          : status === "pending" || status === "applied"
            ? ("PENDING" as const)
            : undefined;

    // Get all pipeline steps for this workflow step
    const pipelineSteps = await prisma.candidatePipelineStep.findMany({
      where: {
        workflowStepId: roundId,
        pipeline: {
          jobId,
          ...(status === "shortlisted"
            ? {
                application: {
                  status: "SHORTLISTED",
                },
              }
            : {}),
        },
        ...(stepStatusFilter
          ? typeof stepStatusFilter === "object"
            ? { status: stepStatusFilter }
            : { status: stepStatusFilter }
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
            evaluator: {
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
        interviewer: evaluation?.evaluator
          ? `${evaluation.evaluator.firstname} ${evaluation.evaluator.lastname}`
          : undefined,
        assessedAt: evaluation?.submittedAt?.toString(),
      };
    });

    return NextResponse.json({ counts, candidates });
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

        // Same end state as the job-level shortlist (see lib/services/pipeline-gate.ts)
        await prisma.$transaction((tx) =>
          admitToRound(tx, {
            jobId,
            userIds: candidateIds.map((id) => BigInt(id)),
            workflowStepId: roundId,
            now,
          }),
        );
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

        await prisma.$transaction((tx) =>
          rejectFromRound(tx, {
            jobId,
            userIds: candidateIds.map((id) => BigInt(id)),
            workflowStepId: roundId,
            now,
          }),
        );
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
