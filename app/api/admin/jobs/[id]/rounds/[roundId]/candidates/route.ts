import { NextRequest, NextResponse } from "next/server";
import { aggregateEvaluations } from "@/lib/evaluations/scoring";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { admitToRound, rejectFromRound } from "@/lib/services/pipeline-gate";
import { advanceFromRound, RoundAdvanceError } from "@/lib/services/round-advance";

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
      // all interviewers' submitted scorecards count (average score, majority recommendation)
      const submittedEvals = step.stageEvaluations.filter((e) => e.submittedAt !== null);
      const evaluation = submittedEvals[0] ?? step.stageEvaluations[0];
      const agg = aggregateEvaluations(
        step.stageEvaluations.map((e) => ({
          submittedAt: e.submittedAt,
          recommendation: e.recommendation,
          formData: e.formData,
        })),
      );

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
        assessmentStatus:
          step.status === "COMPLETED" || (submittedEvals.length > 0 && submittedEvals.length === step.stageEvaluations.length)
            ? "completed"
            : step.stageEvaluations.length > 0
              ? "in_progress"
              : "pending",
        assessmentScore: submittedEvals.length > 0 ? agg.score : evaluation?.score,
        recommendation: agg.recommendation ?? evaluation?.recommendation,
        scorecardsSubmitted: submittedEvals.length,
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

      case "reject": {
        // A candidate can be rejected while waiting (PENDING / IN_PROGRESS) or after scoring (COMPLETED),
        // as long as they are still at this round.
        const roundForReject = await prisma.workflowStep.findUnique({
          where: { id: roundId },
          select: { stepOrder: true },
        });
        if (!roundForReject) {
          return NextResponse.json({ error: "Round not found" }, { status: 404 });
        }

        const rejectableSteps = await prisma.candidatePipelineStep.findMany({
          where: {
            workflowStepId: roundId,
            pipeline: {
              jobId: jobId,
              candidateId: { in: candidateIds.map((id) => BigInt(id)) },
              overallStatus: "IN_PROGRESS",
              lockState: "NONE",
              currentStepOrder: roundForReject.stepOrder,
            },
            status: { in: ["PENDING", "IN_PROGRESS", "COMPLETED"] },
          },
          select: { id: true },
        });

        if (rejectableSteps.length !== candidateIds.length) {
          return NextResponse.json(
            {
              error:
                "Some selected candidates are no longer in this round and cannot be rejected here",
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
      }

      case "move_next":
      case "skip_round": {
        const result = await prisma.$transaction((tx) =>
          advanceFromRound(tx, {
            jobId,
            workflowStepId: roundId,
            candidateIds: candidateIds.map((id: string) => BigInt(id)),
            actorId: BigInt(user.id),
            mode: action === "skip_round" ? "SKIP" : "COMPLETE",
            now,
          }),
        );

        if (result.advanced === 0) {
          return NextResponse.json(
            { error: "None of the selected candidates are currently in this round." },
            { status: 409 },
          );
        }

        return NextResponse.json({
          success: true,
          action,
          count: result.advanced,
          ignored: result.ignored,
          nextStepId: result.nextStepId,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      count: candidateIds.length,
    });
  } catch (error) {
    if (error instanceof RoundAdvanceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error performing action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
