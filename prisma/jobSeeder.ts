import { PrismaClient, EmploymentType, User } from '@prisma/client'

/**
 * Seed demo jobs for the Recruitment System.
 *
 * @param prisma - PrismaClient instance
 * @param users - Object with admin, interviewer (and optional others) and now (BigInt)
 */
export async function seedJobs(prisma: PrismaClient, users: { admin: User, interviewer: User, candidate?: User, now: bigint; }) {
  console.log('\n🧑‍💼 Creating demo jobs...')
  const { admin, interviewer, now } = users;
  const jobEntries = [
    {
      jobCode: 'JOB001',
      title: 'Frontend Developer',
      shortDescription: 'Join our team as a React.js Frontend Developer.',
      description: 'Responsible for UI implementation, working closely with designers and backend teams.',
      company: 'Acme Tech',
      postFrom: new Date(),
      postTo: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      status: true,
      industry: 'Software',
      employmentType: EmploymentType.Permanent,
      employmentShift: 'Day',
      totalPositions: 2,
      minimumExperience: '2 years',
      minimumSalary: '50000',
      createdBy: admin.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      jobCode: 'JOB002',
      title: 'Backend API Engineer',
      shortDescription: 'Build and maintain scalable APIs.',
      description: 'API & database logic in Node.js/Express and PostgreSQL.',
      company: 'Innovatech',
      postFrom: new Date(),
      postTo: new Date(Date.now() + 45 * 24 * 3600 * 1000),
      status: true,
      industry: 'Technology',
      employmentType: EmploymentType.Permanent,
      employmentShift: 'Day',
      totalPositions: 1,
      minimumExperience: '3 years',
      minimumSalary: '60000',
      createdBy: interviewer.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      jobCode: 'JOB003',
      title: 'QA Automation Engineer',
      shortDescription: 'Automate test cases and ensure software quality.',
      description: 'Write scripts in Cypress/Selenium for test automation.',
      company: 'TestHub',
      postFrom: new Date(),
      postTo: new Date(Date.now() + 60 * 24 * 3600 * 1000),
      status: true,
      industry: 'QA',
      employmentType: EmploymentType.PartTime,
      employmentShift: 'Day',
      totalPositions: 1,
      minimumExperience: '2 years',
      minimumSalary: '55000',
      createdBy: admin.id,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const job of jobEntries) {
    // Upsert by jobCode so repeated seeding does not fail
    await prisma.job.upsert({
      where: { jobCode: job.jobCode },
      update: job,
      create: job,
    })
  }
  console.log('\n🎉 Demo jobs seeded!')
}
