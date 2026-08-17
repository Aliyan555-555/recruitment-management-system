const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "stage_evaluation" RENAME COLUMN "interviewer_id" TO "evaluator_id";`)
    console.log('Renamed in stage_evaluation')
  } catch(e) { console.error(e) }
  
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "batch_candidate_evaluation" RENAME COLUMN "interviewer_id" TO "evaluator_id";`)
    console.log('Renamed in batch_candidate_evaluation')
  } catch(e) { console.error(e) }
}

main().catch(console.error).finally(() => prisma.$disconnect())
