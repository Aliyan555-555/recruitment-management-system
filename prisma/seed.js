const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function upsertUser(email, role, username, firstname, lastname, password, now) {
  const hashed = await bcrypt.hash(password, 10)
  return prisma.user.upsert({
    where: { email },
    update: { username, firstname, lastname, password: hashed, role, updatedAt: now },
    create: {
      role,
      username,
      password: hashed,
      firstname,
      lastname,
      email,
      suspended: false,
      createdAt: now,
      updatedAt: now
    }
  })
}

async function main() {
  console.log('🌱 Seeding demo users only...')
  const now = BigInt(Math.floor(Date.now() / 1000))

  const admin = await upsertUser('admin@recruitment.com', 'ADMIN', 'admin', 'John', 'Admin', 'admin123', now)
  const interviewer = await upsertUser('interviewer@recruitment.com', 'INTERVIEWER', 'interviewer', 'Ivy', 'Nguyen', 'admin123', now)
  const candidate = await upsertUser('candidate@recruitment.com', 'CANDIDATE', 'candidate', 'Sara', 'Lee', 'admin123', now)

  console.log('\n👤 Users created/updated:')
  console.log(`Admin:       ${admin.email} / admin123`)
  console.log(`Interviewer: ${interviewer.email} / admin123`)
  console.log(`Candidate:   ${candidate.email} / admin123\n`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
