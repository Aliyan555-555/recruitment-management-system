
import { PrismaClient, UserRole, UserStatus, JobType, JobStatus, EmploymentType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const jobTitles = [
  "Senior Software Engineer",
  "Product Manager",
  "UX Designer",
  "Data Scientist",
  "DevOps Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "QA Engineer",
  "Technical Lead"
]

const companies = [
  "TechCorp Solutions",
  "InnovateX",
  "CloudSystems Inc",
  "DataDriven Co",
  "DesignStudio",
  "FutureTech",
  "SoftWarez",
  "WebSolutions",
  "AppMasters",
  "NetWorks"
]

const skills = ["React", "Node.js", "TypeScript", "Python", "Java", "AWS", "Docker", "Figma", "SQL", "MongoDB"]

const firstNames = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth"]
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]

async function main() {
  console.log('Start seeding ...')

  // 1. Ensure Admin Exists
  const adminEmail = 'admin@demo.com'
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } })

  if (!admin) {
    const hashedPassword = await bcrypt.hash('password123', 10)
    admin = await prisma.user.create({
      data: {
        username: 'admin_demo',
        email: adminEmail,
        password: hashedPassword,
        firstname: 'Admin',
        lastname: 'User',
        role: UserRole.ADMIN,
        userStatus: UserStatus.ACTIVE,
        createdAt: BigInt(Math.floor(Date.now() / 1000)),
        updatedAt: BigInt(Math.floor(Date.now() / 1000))
      }
    })
    console.log(`Created admin user: ${admin.email}`)
  } else {
    console.log(`Using existing admin user: ${admin.email}`)
  }

  // 1.5 Seed Education Levels
  const educationLevels = [
    "Matric / O-Level",
    "Intermediate / A-Level",
    "Diploma",
    "Bachelor's",
    "Master's",
    "MPhil / MS",
    "PhD",
    "Professional Certification"
  ]

  console.log('Seeding education levels...')
  for (const levelName of educationLevels) {
    const existing = await prisma.userEducationLevel.findFirst({
      where: { name: levelName }
    })
    if (!existing) {
      await prisma.userEducationLevel.create({
        data: { name: levelName }
      })
    }
  }
  console.log(`✓ Education levels seeded (${educationLevels.length} levels)`)



  // 2. Create 10 Candidates with Profile Data
  for (let i = 0; i < 10; i++) {
    const email = `candidate${i + 1}@demo.com`
    const exists = await prisma.user.findUnique({ where: { email } })
    
    if (!exists) {
      const hashedPassword = await bcrypt.hash('password123', 10)
      const firstName = firstNames[i]
      const lastName = lastNames[i]
      
      const user = await prisma.user.create({
        data: {
          username: `user_${firstName.toLowerCase()}${i}`,
          email,
          password: hashedPassword,
          firstname: firstName,
          lastname: lastName,
          role: UserRole.CANDIDATE,
          userStatus: UserStatus.ACTIVE,
          phone1: `+1555010${i}`,
          city: "New York",
          country: "US",
          createdAt: BigInt(Math.floor(Date.now() / 1000)),
          updatedAt: BigInt(Math.floor(Date.now() / 1000)),
          
          // Profile Details
          profileDetails: {
            create: {
              title: "Software Developer",
              bio: `Experienced professional with a passion for building great software. Skilled in various technologies including ${skills[i % skills.length]}.`,
              expectedSalary: "$100,000",
              availability: "Immediate",
              professionalGrade: "Mid-Level",
              linkedinUrl: "https://linkedin.com/in/demo",
              githubUrl: "https://github.com/demo",
              createdAt: BigInt(Math.floor(Date.now() / 1000)),
              updatedAt: BigInt(Math.floor(Date.now() / 1000))
            }
          },

          // Skills
          skills: {
            create: [
              { skillName: skills[i % skills.length], level: 4, createdAt: BigInt(Math.floor(Date.now() / 1000)), updatedAt: BigInt(Math.floor(Date.now() / 1000)) },
              { skillName: skills[(i + 1) % skills.length], level: 3, createdAt: BigInt(Math.floor(Date.now() / 1000)), updatedAt: BigInt(Math.floor(Date.now() / 1000)) }
            ]
          },

          // Experience
          experiences: {
             create: [
                {
                    jobTitle: `Junior ${jobTitles[i]}`,
                    company: companies[i],
                    location: "Remote",
                    startDate: "2020-01-01",
                    endDate: "2022-01-01",
                    isCurrent: false,
                    createdAt: BigInt(Math.floor(Date.now() / 1000)),
                    updatedAt: BigInt(Math.floor(Date.now() / 1000))
                }
             ]
          },

          // Education
          educations: {
             create: {
                 educationLevel: {
                     connectOrCreate: {
                         where: { id: BigInt(1) }, // Assuming ID 1 exists or creates default
                         create: { name: "Bachelors" } 
                     }
                 },
                 degreeTitle: "Computer Science",
                 institute: "University of Tech",
                 passingYear: "2019",
                 createdAt: BigInt(Math.floor(Date.now() / 1000)),
                 updatedAt: BigInt(Math.floor(Date.now() / 1000))
             }
          }
        }
      })
      console.log(`Created candidate: ${user.email}`)
    } else {
      console.log(`Candidate ${email} already exists`)
    }
  }

  // 3. Create 10 Jobs
  for (let i = 0; i < 10; i++) {
     const jobCode = `JOB-${2025000 + i}`
     const exists = await prisma.job.findUnique({ where: { jobCode } })

     if (!exists) {
         const job = await prisma.job.create({
             data: {
                 jobCode: jobCode,
                 title: jobTitles[i],
                 company: companies[i],
                 shortDescription: `We are looking for a ${jobTitles[i]} to join our team.`,
                 description: `<p>We are seeking a talented <strong>${jobTitles[i]}</strong> to help us build the next generation of our platform.</p><ul><li>Work with ${skills[i % skills.length]}</li><li>Collaborate with cross-functional teams</li></ul>`,
                 postFrom: new Date(),
                 postTo: new Date(new Date().setMonth(new Date().getMonth() + 2)), // 2 months from now
                 status: true,
                 jobType: JobType.NORMAL,
                 jobStatus: JobStatus.ACTIVE,
                 employmentType: EmploymentType.Permanent,
                 totalPositions: 3,
                 minimumExperience: "3-5 Years",
                 minimumSalary: "80,000",
                 createdBy: admin.id,
                 createdAt: BigInt(Math.floor(Date.now() / 1000)),
                 updatedAt: BigInt(Math.floor(Date.now() / 1000)),
                 
                 // Skills
                 skills: {
                     create: [
                         { skillName: skills[i % skills.length] },
                         { skillName: skills[(i + 1) % skills.length] }
                     ]
                 },
                 
                 // Locations
                 locations: {
                     create: {
                         city: "New York",
                         country: "United States",
                         createdAt: BigInt(Math.floor(Date.now() / 1000)),
                         updatedAt: BigInt(Math.floor(Date.now() / 1000))
                     }
                 }
             }
         })
         console.log(`Created job: ${job.title} (${job.jobCode})`)
     } else {
         console.log(`Job ${jobCode} already exists`)
     }
  }

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
