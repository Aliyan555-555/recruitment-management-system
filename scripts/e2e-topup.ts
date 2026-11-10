/**
 * Test helper: tops job <jobId> up to <total> SUBMITTED applications using bulk inserts (2 round-trips).
 * Usage: npx tsx scripts/e2e-topup.ts 1 50
 * Candidates are e2e.bulk.N@example.com. Idempotent.
 */
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()
const jobId = BigInt(process.argv[2] ?? "1")
const total = Number(process.argv[3] ?? "50")

async function main() {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const have = await prisma.jobsApplied.count({ where: { jobId } })
  const need = total - have
  if (need <= 0) return console.log(`Job ${jobId} already has ${have} applications.`)

  const password = await bcrypt.hash("Candidate123!", 4)
  await prisma.user.createMany({
    data: Array.from({ length: need }, (_, i) => ({
      role: "CANDIDATE" as const,
      username: `e2e.bulk.${i + 1}`,
      password,
      firstname: `Bulk${i + 1}`,
      lastname: "Tester",
      email: `e2e.bulk.${i + 1}@example.com`,
      phone1: `0300${String(1000000 + i).slice(-7)}`,
      city: "Karachi",
      country: "PK",
      createdAt: now,
      updatedAt: now,
    })),
    skipDuplicates: true,
  })

  const users = await prisma.user.findMany({
    where: { email: { startsWith: "e2e.bulk." } },
    select: { id: true },
    take: need,
    orderBy: { id: "asc" },
  })
  const result = await prisma.jobsApplied.createMany({
    data: users.map((u, i) => ({ jobId, userId: u.id, status: "SUBMITTED" as const, appliedAt: now - BigInt(i * 3600) })),
    skipDuplicates: true,
  })
  console.log(`Added ${result.count} applications; job ${jobId} now has ${await prisma.jobsApplied.count({ where: { jobId } })}.`)
}

main().finally(() => prisma.$disconnect())
