import { PrismaClient, VerifiedSkillLevel } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const GLOBAL_SKILL_CONFIG = "__GLOBAL__"

async function main() {
  console.log("🌱 Starting seed script...")
  const now = BigInt(Math.floor(Date.now() / 1000))

  // 1. Seed Global Skill Assessment Config
  await prisma.skillAssessmentConfig.upsert({
    where: { skillName: GLOBAL_SKILL_CONFIG },
    update: {
      questionCount: 10,
      minPassPoints: 60,
      maxPoints: 100,
      levelThresholds: {
        beginner: 0,
        intermediate: 40,
        professional: 70,
        expert: 90,
      },
      maxAttempts: 3,
      cooldownHours: 24,
      attemptTimeoutMinutes: 60,
      isActive: true,
      updatedAt: now,
    },
    create: {
      skillName: GLOBAL_SKILL_CONFIG,
      questionCount: 10,
      minPassPoints: 60,
      maxPoints: 100,
      levelThresholds: {
        beginner: 0,
        intermediate: 40,
        professional: 70,
        expert: 90,
      },
      maxAttempts: 3,
      cooldownHours: 24,
      attemptTimeoutMinutes: 60,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  })
  console.log("✅ Global Skill Assessment Config seeded.")

  // 2. Seed Education Levels
  const eduLevelNames = [
    "High School Diploma",
    "Associate Degree",
    "Bachelor's Degree",
    "Master's Degree",
    "Doctorate / PhD",
  ]
  const eduLevelMap = new Map<string, bigint>()

  for (const name of eduLevelNames) {
    let level = await prisma.userEducationLevel.findFirst({ where: { name } })
    if (!level) {
      level = await prisma.userEducationLevel.create({ data: { name } })
    }
    eduLevelMap.set(name, level.id)
  }
  console.log("✅ Education levels seeded.")

  // 3. Ensure Admin User exists
  let admin = await prisma.user.findFirst({ where: { role: "ADMIN" } })
  if (!admin) {
    const hashedPassword = await bcrypt.hash("Admin123!", 10)
    admin = await prisma.user.create({
      data: {
        role: "ADMIN",
        userStatus: "ACTIVE",
        username: "admin_demo",
        email: "admin@example.com",
        password: hashedPassword,
        firstname: "System",
        lastname: "Administrator",
        createdAt: now,
        updatedAt: now,
      },
    })
    console.log("✅ Default Admin created (admin@example.com / Admin123!).")
  } else {
    console.log(`✅ Admin user found: ${admin.email}`)
  }

  // 4. Define Demo Jobs Data
  const demoJobsData = [
    {
      title: "Senior Full Stack Engineer (Next.js & Node.js)",
      jobCode: "JOB-FS-001",
      company: "TechPulse Solutions",
      description:
        "<p>We are seeking a seasoned Senior Full Stack Engineer to architect and scale web applications using React, Next.js, and Node.js backend services.</p>",
      successCriteria:
        "4+ years building high-throughput web applications with Next.js, TypeScript, PostgreSQL, and microservices architecture.",
      minimumExperience: "4+ years",
      certification: "AWS Certified Developer / Solutions Architect Preferred",
      minimumSalary: "$100,000 - $140,000",
      postFrom: new Date(),
      postTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      employmentType: "Permanent" as const,
      industry: "Software Development",
      skills: [
        { skillName: "JAVASCRIPT", priority: "REQUIRED" as const },
        { skillName: "REACT", priority: "REQUIRED" as const },
        { skillName: "NODE.JS", priority: "REQUIRED" as const },
        { skillName: "TYPESCRIPT", priority: "PREFERRED" as const },
        { skillName: "DOCKER", priority: "PREFERRED" as const },
      ],
      requiredEdu: "Bachelor's Degree",
    },
    {
      title: "AI / Machine Learning Engineer",
      jobCode: "JOB-AI-002",
      company: "Aether AI Labs",
      description:
        "<p>Join our AI research and product engineering team building LLM integrations, retrieval-augmented generation (RAG) pipelines, and intelligent agentic workflows.</p>",
      successCriteria:
        "Hands-on NLP, PyTorch, model fine-tuning experience, vector databases, and Python backend service development.",
      minimumExperience: "3+ years",
      certification: "TensorFlow / PyTorch / Deep Learning Certification",
      minimumSalary: "$110,000 - $150,000",
      postFrom: new Date(),
      postTo: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      employmentType: "Permanent" as const,
      industry: "Data Science",
      skills: [
        { skillName: "PYTHON", priority: "REQUIRED" as const },
        { skillName: "PYTORCH", priority: "REQUIRED" as const },
        { skillName: "FASTAPI", priority: "PREFERRED" as const },
        { skillName: "DOCKER", priority: "PREFERRED" as const },
      ],
      requiredEdu: "Master's Degree",
    },
    {
      title: "DevOps & Cloud Infrastructure Specialist",
      jobCode: "JOB-DO-003",
      company: "CloudMatrix Infrastructure",
      description:
        "<p>Looking for a Cloud Infrastructure Specialist to manage Kubernetes clusters, automate Terraform CI/CD pipelines, and secure AWS infrastructure.</p>",
      successCriteria:
        "Strong experience with Kubernetes administration, Terraform IaC, Prometheus monitoring, and zero-downtime deployment pipelines.",
      minimumExperience: "3+ years",
      certification: "AWS Certified SysOps Administrator or CKA Kubernetes",
      minimumSalary: "$95,000 - $135,000",
      postFrom: new Date(),
      postTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      employmentType: "Contract" as const,
      industry: "IT Infrastructure",
      skills: [
        { skillName: "DOCKER", priority: "REQUIRED" as const },
        { skillName: "KUBERNETES", priority: "REQUIRED" as const },
        { skillName: "AWS", priority: "REQUIRED" as const },
        { skillName: "PYTHON", priority: "PREFERRED" as const },
      ],
      requiredEdu: "Bachelor's Degree",
    },
  ]

  const candidatePoolData = [
    { firstname: "Alex", lastname: "Mercer", emailPrefix: "alex.mercer" },
    { firstname: "Sophia", lastname: "Chen", emailPrefix: "sophia.chen" },
    { firstname: "Marcus", lastname: "Vance", emailPrefix: "marcus.vance" },
    { firstname: "Elena", lastname: "Rostova", emailPrefix: "elena.rostova" },
    { firstname: "David", lastname: "Kim", emailPrefix: "david.kim" },
    { firstname: "Sarah", lastname: "Jenkins", emailPrefix: "sarah.jenkins" },
    { firstname: "Tariq", lastname: "Mahmood", emailPrefix: "tariq.mahmood" },
    { firstname: "Jessica", lastname: "Taylor", emailPrefix: "jessica.taylor" },
    { firstname: "Omar", lastname: "Farooq", emailPrefix: "omar.farooq" },
    { firstname: "Hannah", lastname: "Abbott", emailPrefix: "hannah.abbott" },
    { firstname: "Liam", lastname: "O'Connor", emailPrefix: "liam.oconnor" },
    { firstname: "Amara", lastname: "Okafor", emailPrefix: "amara.okafor" },
  ]

  const hashedCandPassword = await bcrypt.hash("Candidate123!", 10)

  // 5. Create Jobs and Candidate Applications (min 10 candidates per job)
  for (let jobIdx = 0; jobIdx < demoJobsData.length; jobIdx++) {
    const jobData = demoJobsData[jobIdx]

    // Create or update job
    let job = await prisma.job.findUnique({ where: { jobCode: jobData.jobCode } })
    if (!job) {
      job = await prisma.job.create({
        data: {
          jobCode: jobData.jobCode,
          title: jobData.title,
          company: jobData.company,
          description: jobData.description,
          successCriteria: jobData.successCriteria,
          minimumExperience: jobData.minimumExperience,
          certification: jobData.certification,
          minimumSalary: jobData.minimumSalary,
          postFrom: jobData.postFrom,
          postTo: jobData.postTo,
          employmentType: jobData.employmentType,
          industry: jobData.industry,
          createdBy: admin.id,
          updatedBy: admin.id,
          createdAt: now,
          updatedAt: now,
          skills: {
            create: jobData.skills.map((s) => ({
              skillName: s.skillName,
              priority: s.priority,
            })),
          },
          educationRequirements: {
            create: [
              {
                educationLevelId: eduLevelMap.get(jobData.requiredEdu)!,
                isRequired: true,
                createdAt: now,
                updatedAt: now,
              },
            ],
          },
          workflow: {
            create: {
              createdAt: now,
              updatedAt: now,
              steps: {
                create: [
                  {
                    stepName: "Screening Interview",
                    stepType: "SCREENING_INTERVIEW",
                    stepOrder: 1,
                    isRequired: true,
                    isSkippable: false,
                    status: "ACTIVE",
                    createdAt: now,
                    updatedAt: now,
                  },
                  {
                    stepName: "Offer",
                    stepType: "OFFER",
                    stepOrder: 2,
                    isRequired: true,
                    isSkippable: false,
                    status: "ACTIVE",
                    createdAt: now,
                    updatedAt: now,
                  },
                ],
              },
            },
          },
        },
      })
      console.log(`✅ Job Created: "${job.title}" (${job.jobCode})`)
    } else {
      console.log(`ℹ️ Job already exists: "${job.title}" (${job.jobCode})`)
    }

    // Generate 12 applicants for this job
    for (let candIdx = 0; candIdx < candidatePoolData.length; candIdx++) {
      const candInfo = candidatePoolData[candIdx]
      const email = `${candInfo.emailPrefix}.j${jobIdx + 1}@example.com`
      const username = `${candInfo.emailPrefix}_j${jobIdx + 1}`

      let candidate = await prisma.user.findUnique({ where: { email } })
      if (!candidate) {
        candidate = await prisma.user.create({
          data: {
            role: "CANDIDATE",
            userStatus: "ACTIVE",
            username,
            email,
            password: hashedCandPassword,
            firstname: candInfo.firstname,
            lastname: candInfo.lastname,
            city: "Lahore",
            country: "PK",
            createdAt: now,
            updatedAt: now,
            profileDetails: {
              create: {
                bio: `Experienced software professional specializing in ${jobData.skills[0].skillName} and cloud systems. Driven by software quality and clean code.`,
                certifications: jobData.certification,
                achievements: "Built multi-tenant microservices architecture serving 500k monthly active users.",
                noticePeriod: "1 month",
                availability: "Immediate",
                createdAt: now,
                updatedAt: now,
              },
            },
            educations: {
              create: [
                {
                  educationLevelId: eduLevelMap.get(
                    candIdx % 3 === 0 ? "Master's Degree" : "Bachelor's Degree"
                  )!,
                  degreeTitle:
                    candIdx % 3 === 0
                      ? "Master of Science in Computer Science"
                      : "Bachelor of Science in Software Engineering",
                  institute: "National University of Sciences and Technology",
                  majorSubject: "Computer Science",
                  grade: "3.7 / 4.0",
                  passingYear: "2020",
                  createdAt: now,
                  updatedAt: now,
                },
              ],
            },
            experiences: {
              create: [
                {
                  jobTitle: `Software Developer (${jobData.skills[0].skillName})`,
                  company: "Global Tech Solutions",
                  location: "Islamabad, PK",
                  startDate: "2021-01-01",
                  endDate: "2024-06-30",
                  isCurrent: true,
                  createdAt: now,
                  updatedAt: now,
                },
              ],
            },
          },
        })
      }

      // Add skills and assessment scores to candidate profile
      for (let sIdx = 0; sIdx < jobData.skills.length; sIdx++) {
        const skill = jobData.skills[sIdx]

        // Vary candidate skill matches: strongest candidates get higher match/assessments
        const isMatchedCandidate = candIdx < 8 || sIdx === 0
        if (!isMatchedCandidate && sIdx > 0) continue // Some candidates lack certain skills

        let userSkill = await prisma.userSkills.findFirst({
          where: { userId: candidate.id, skillName: skill.skillName },
        })

        if (!userSkill) {
          const scorePercent = 50 + ((candIdx * 7 + sIdx * 11) % 46) // Score between 50 and 95%
          const verifiedLevel: VerifiedSkillLevel =
            scorePercent >= 90
              ? "EXPERT"
              : scorePercent >= 70
              ? "PROFESSIONAL"
              : scorePercent >= 40
              ? "INTERMEDIATE"
              : "BEGINNER"

          // 1. Create UserSkills row first
          userSkill = await prisma.userSkills.create({
            data: {
              userId: candidate.id,
              skillName: skill.skillName,
              level: 3,
              verifiedLevel,
              verifiedAt: now,
              createdAt: now,
              updatedAt: now,
            },
          })

          // 2. Create SkillAssessment row linked to userSkill.id
          const assessment = await prisma.skillAssessment.create({
            data: {
              userId: candidate.id,
              userSkillId: userSkill.id,
              skillName: skill.skillName,
              level: verifiedLevel,
              attemptNumber: 1,
              status: "SUBMITTED",
              scoredPoints: scorePercent,
              minPoints: 60,
              maxPoints: 100,
              totalPoints: 100,
              startedAt: now - BigInt(3600),
              submittedAt: now,
              createdAt: now,
              updatedAt: now,
            },
          })

          // 3. Set lastAssessmentId on UserSkills
          await prisma.userSkills.update({
            where: { id: userSkill.id },
            data: { lastAssessmentId: assessment.id },
          })
        }
      }

      // Apply candidate to job if not applied
      const existingApp = await prisma.jobsApplied.findUnique({
        where: { jobId_userId: { jobId: job.id, userId: candidate.id } },
      })

      if (!existingApp) {
        await prisma.jobsApplied.create({
          data: {
            jobId: job.id,
            userId: candidate.id,
            status: "SUBMITTED",
            appliedAt: now - BigInt(candIdx * 1800),
          },
        })
      }
    }

    const appCount = await prisma.jobsApplied.count({ where: { jobId: job.id } })
    console.log(`✅ Seeded ${appCount} applications for "${job.title}".`)
  }

  console.log("🎉 Seeding complete successfully!")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error("❌ Seeding failed:", error)
    await prisma.$disconnect()
    process.exit(1)
  })
