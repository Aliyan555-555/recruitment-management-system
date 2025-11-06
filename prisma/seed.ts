import { PrismaClient, EmploymentType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { seedJobs } from './jobSeeder'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding demo users only...')

  // Hash password
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const now = BigInt(Math.floor(Date.now() / 1000))

  // =================== USER SEEDING ===================
  // Upsert three demo users: Admin, Interviewer, Candidate
  console.log('👤 Creating users...')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@recruitment.com' },
    update: { username: 'admin', firstname: 'John', lastname: 'Admin', password: hashedPassword, role: 'ADMIN', updatedAt: now },
    create: {
      role: 'ADMIN',
      username: 'admin',
      password: hashedPassword,
      firstname: 'John',
      lastname: 'Admin',
      email: 'admin@recruitment.com',
      suspended: false,
      createdAt: now,
      updatedAt: now
    }
  })
  const interviewer = await prisma.user.upsert({
    where: { email: 'interviewer@recruitment.com' },
    update: { username: 'interviewer', firstname: 'Ivy', lastname: 'Nguyen', password: hashedPassword, role: 'INTERVIEWER', updatedAt: now },
    create: {
      role: 'INTERVIEWER',
      username: 'interviewer',
      password: hashedPassword,
      firstname: 'Ivy',
      lastname: 'Nguyen',
      email: 'interviewer@recruitment.com',
      suspended: false,
      createdAt: now,
      updatedAt: now
    }
  })
  const candidate = await prisma.user.upsert({
    where: { email: 'candidate@recruitment.com' },
    update: { username: 'candidate', firstname: 'Sara', lastname: 'Lee', password: hashedPassword, role: 'CANDIDATE', updatedAt: now },
    create: {
      role: 'CANDIDATE',
      username: 'candidate',
      password: hashedPassword,
      firstname: 'Sara',
      lastname: 'Lee',
      email: 'candidate@recruitment.com',
      suspended: false,
      createdAt: now,
      updatedAt: now
    }
  })
  console.log('\n🎉 Users seeded successfully!')

  // ======== Call external (separate) job seeder with users ========
  await seedJobs(prisma, { admin, interviewer, candidate, now });

  console.log('\n🎉 Users seeded successfully!\n')
  console.log('Login credentials:')
  console.log('Admin:       admin@recruitment.com / admin123')
  console.log('Interviewer: interviewer@recruitment.com / admin123')
  console.log('Candidate:   candidate@recruitment.com / admin123\n')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
