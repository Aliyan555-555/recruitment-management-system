/**
 * Create the missing step-1 pipeline for NORMAL-job applications that have none
 * (legacy or seeded data). Dry-run by default.
 *
 *   npx tsx scripts/backfill-missing-pipelines.ts           # report only
 *   npx tsx scripts/backfill-missing-pipelines.ts --apply   # write changes
 */
import { PrismaClient } from "@prisma/client"
import { admitToRound, ensurePipelineForApplication } from "../lib/services/pipeline-gate"

const prisma = new PrismaClient()

async function main() {
  const apply = process.argv.includes("--apply")

  const orphans = await prisma.jobsApplied.findMany({
    where: {
      pipeline: null,
      status: { in: ["SUBMITTED", "SHORTLISTED"] },
      job: { jobType: "NORMAL", workflow: { isNot: null } },
    },
    select: { id: true, jobId: true, userId: true, appliedAt: true, status: true },
    orderBy: { id: "asc" },
  })

  console.log(`${orphans.length} application(s) without a pipeline.`)
  if (!apply) {
    for (const o of orphans) {
      console.log(`  application ${o.id} (job ${o.jobId}, user ${o.userId}, ${o.status})`)
    }
    console.log("Dry run only. Re-run with --apply to create them.")
    return
  }

  let created = 0
  for (const o of orphans) {
    const result = await prisma.$transaction(async (tx) => {
      const pipeline = await ensurePipelineForApplication(tx, {
        applicationId: o.id,
        jobId: o.jobId,
        userId: o.userId,
        startedAt: o.appliedAt,
      })
      // Already shortlisted at the job level: put them In Round, matching admitToRound.
      if (pipeline?.created && o.status === "SHORTLISTED") {
        const roundOne = await tx.workflowStep.findFirst({
          where: { stepOrder: 1, workflow: { jobId: o.jobId } },
          select: { id: true },
        })
        if (roundOne) {
          await admitToRound(tx, { jobId: o.jobId, userIds: [o.userId], workflowStepId: roundOne.id })
        }
      }
      return pipeline
    })
    if (result?.created) created++
  }
  console.log(`Created ${created} pipeline(s).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
