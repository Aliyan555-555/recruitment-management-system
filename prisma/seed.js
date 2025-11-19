const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function cleanDatabase() {
  console.log('🧹 Cleaning database...')
  
  // Delete all data in reverse order of dependencies
  // Start with child tables and work up to parent tables
  
  await prisma.batchCandidateEvaluation.deleteMany()
  await prisma.batchCandidate.deleteMany()
  await prisma.batch.deleteMany()
  await prisma.slotBooking.deleteMany()
  await prisma.interviewSlot.deleteMany()
  await prisma.stageEvaluation.deleteMany()
  await prisma.interview.deleteMany()
  await prisma.candidatePipelineStep.deleteMany()
  await prisma.candidatePipeline.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.workflowStep.deleteMany()
  await prisma.jobWorkflow.deleteMany()
  await prisma.jobsBookmark.deleteMany()
  await prisma.jobsApplied.deleteMany()
  await prisma.jobEducationRequirement.deleteMany()
  await prisma.jobLocation.deleteMany()
  await prisma.jobSkill.deleteMany()
  await prisma.job.deleteMany()
  await prisma.cvManagerCv.deleteMany()
  await prisma.userSkills.deleteMany()
  await prisma.userEducation.deleteMany()
  await prisma.user.deleteMany()
  await prisma.userEducationLevel.deleteMany()
  await prisma.institute.deleteMany()
  
  console.log('✅ Database cleaned')
}

async function seedEducationLevels() {
  console.log('📚 Seeding education levels...')
  
  const levels = [
    'High School',
    'Associate Degree',
    'Bachelor\'s Degree',
    'Master\'s Degree',
    'Doctorate',
    'Professional Certificate'
  ]
  
  for (const level of levels) {
    const existing = await prisma.userEducationLevel.findFirst({
      where: { name: level }
    })
    if (!existing) {
      await prisma.userEducationLevel.create({
        data: { name: level }
      })
    }
  }
  
  console.log('✅ Education levels seeded')
}

async function seedUsers() {
  console.log('👤 Creating demo users...')
  
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const now = BigInt(Math.floor(Date.now() / 1000))
  
  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {
      username: 'admin',
      password: hashedPassword,
      firstname: 'Admin',
      lastname: 'User',
      role: 'ADMIN',
      userStatus: 'ACTIVE',
      updatedAt: now
    },
    create: {
      role: 'ADMIN',
      userStatus: 'ACTIVE',
      username: 'admin',
      password: hashedPassword,
      firstname: 'Admin',
      lastname: 'User',
      email: 'admin@demo.com',
      suspended: false,
      createdAt: now,
      updatedAt: now
    }
  })
  
  // Interviewer users (create 2 interviewers)
  const interviewer1 = await prisma.user.upsert({
    where: { email: 'interviewer1@demo.com' },
    update: {
      username: 'interviewer1',
      password: hashedPassword,
      firstname: 'John',
      lastname: 'Interviewer',
      role: 'INTERVIEWER',
      userStatus: 'ACTIVE',
      updatedAt: now
    },
    create: {
      role: 'INTERVIEWER',
      userStatus: 'ACTIVE',
      username: 'interviewer1',
      password: hashedPassword,
      firstname: 'John',
      lastname: 'Interviewer',
      email: 'interviewer1@demo.com',
      suspended: false,
      createdAt: now,
      updatedAt: now
    }
  })
  
  const interviewer2 = await prisma.user.upsert({
    where: { email: 'interviewer2@demo.com' },
    update: {
      username: 'interviewer2',
      password: hashedPassword,
      firstname: 'Sarah',
      lastname: 'Smith',
      role: 'INTERVIEWER',
      userStatus: 'ACTIVE',
      updatedAt: now
    },
    create: {
      role: 'INTERVIEWER',
      userStatus: 'ACTIVE',
      username: 'interviewer2',
      password: hashedPassword,
      firstname: 'Sarah',
      lastname: 'Smith',
      email: 'interviewer2@demo.com',
      suspended: false,
      createdAt: now,
      updatedAt: now
    }
  })
  
  // Candidate users (create 5 candidates)
  const candidates = []
  const candidateData = [
    { firstname: 'Alice', lastname: 'Johnson', email: 'candidate1@demo.com', username: 'candidate1' },
    { firstname: 'Bob', lastname: 'Williams', email: 'candidate2@demo.com', username: 'candidate2' },
    { firstname: 'Charlie', lastname: 'Brown', email: 'candidate3@demo.com', username: 'candidate3' },
    { firstname: 'Diana', lastname: 'Davis', email: 'candidate4@demo.com', username: 'candidate4' },
    { firstname: 'Eve', lastname: 'Miller', email: 'candidate5@demo.com', username: 'candidate5' }
  ]
  
  for (const data of candidateData) {
    const candidate = await prisma.user.upsert({
      where: { email: data.email },
      update: {
        username: data.username,
        password: hashedPassword,
        firstname: data.firstname,
        lastname: data.lastname,
        role: 'CANDIDATE',
        userStatus: 'ACTIVE',
        updatedAt: now
      },
      create: {
        role: 'CANDIDATE',
        userStatus: 'ACTIVE',
        username: data.username,
        password: hashedPassword,
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        suspended: false,
        createdAt: now,
        updatedAt: now
      }
    })
    candidates.push(candidate)
  }
  
  console.log('✅ Demo users created')
  
  return { admin, interviewer1, interviewer2, candidates }
}

async function main() {
  try {
    console.log('🚀 Starting database cleanup and seeding...\n')
    
    // Step 1: Clean database
    await cleanDatabase()
    
    // Step 2: Seed education levels
    await seedEducationLevels()
    
    // Step 3: Seed users
    const users = await seedUsers()
    
    console.log('\n🎉 Seeding completed successfully!\n')
    console.log('='.repeat(60))
    console.log('📋 DEMO USER CREDENTIALS')
    console.log('='.repeat(60))
    console.log('\n🔐 Password for all users: admin123\n')
    console.log('👨‍💼 ADMIN:')
    console.log('   Email: admin@demo.com')
    console.log('   Username: admin')
    console.log('\n👨‍🏫 INTERVIEWERS:')
    console.log('   Email: interviewer1@demo.com')
    console.log('   Username: interviewer1')
    console.log('   Email: interviewer2@demo.com')
    console.log('   Username: interviewer2')
    console.log('\n👤 CANDIDATES:')
    users.candidates.forEach((c, i) => {
      console.log(`   ${i + 1}. Email: ${c.email}`)
      console.log(`      Username: candidate${i + 1}`)
    })
    console.log('\n' + '='.repeat(60))
    
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
