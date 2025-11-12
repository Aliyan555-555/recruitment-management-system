const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function cleanDatabase() {
  console.log('🧹 Cleaning database...')
  
  // Delete all data in reverse order of dependencies
  await prisma.slotBooking.deleteMany()
  await prisma.interviewSlot.deleteMany()
  await prisma.interview.deleteMany()
  await prisma.stageEvaluation.deleteMany()
  await prisma.candidatePipelineStep.deleteMany()
  await prisma.candidatePipeline.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.workflowStep.deleteMany()
  await prisma.jobWorkflow.deleteMany()
  await prisma.jobEducationRequirement.deleteMany()
  await prisma.jobLocation.deleteMany()
  await prisma.jobSkill.deleteMany()
  await prisma.jobsApplied.deleteMany()
  await prisma.jobsBookmark.deleteMany()
  await prisma.job.deleteMany()
  await prisma.cvManagerCv.deleteMany()
  await prisma.userSkills.deleteMany()
  await prisma.userEducation.deleteMany()
  await prisma.user.deleteMany()
  
  console.log('✅ Database cleaned')
}

async function upsertUser(email, role, username, firstname, lastname, password, now) {
  const hashed = await bcrypt.hash(password, 10)
  return prisma.user.upsert({
    where: { email },
    update: { 
      username, 
      firstname, 
      lastname, 
      password: hashed, 
      role, 
      userStatus: 'ACTIVE',
      suspended: false,
      updatedAt: now 
    },
    create: {
      role,
      username,
      password: hashed,
      firstname,
      lastname,
      email,
      userStatus: 'ACTIVE',
      suspended: false,
      createdAt: now,
      updatedAt: now
    }
  })
}

async function main() {
  console.log('🌱 Starting database seed...\n')
  
  // Clean database first
  await cleanDatabase()
  
  const now = BigInt(Math.floor(Date.now() / 1000))
  const defaultPassword = 'admin123'

  // Create users with specified emails
  console.log('👤 Creating users...')
  
  const admin = await upsertUser(
    'aliyansiddiqui555@gmail.com', 
    'ADMIN', 
    'admin', 
    'Admin', 
    'User', 
    defaultPassword, 
    now
  )
  
  const interviewer = await upsertUser(
    'aliyansiddiqui5555@mail.com', 
    'INTERVIEWER', 
    'interviewer', 
    'Interviewer', 
    'User', 
    defaultPassword, 
    now
  )
  
  const candidate = await upsertUser(
    'aliyansiddiqui551@gmail.com', 
    'CANDIDATE', 
    'candidate', 
    'Candidate', 
    'User', 
    defaultPassword, 
    now
  )

  console.log('\n✅ Seed completed successfully!\n')
  console.log('📧 User Credentials:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Admin:       ${admin.email}`)
  console.log(`             Password: ${defaultPassword}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Interviewer: ${interviewer.email}`)
  console.log(`             Password: ${defaultPassword}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Candidate:   ${candidate.email}`)
  console.log(`             Password: ${defaultPassword}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
