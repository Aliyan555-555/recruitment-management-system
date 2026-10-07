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

  // 4. Define Demo Jobs Data (4 jobs spanning full-stack, AI/ML, DevOps, and frontend)
  const demoJobsData = [
    {
      code: "FS",
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
      code: "AI",
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
      code: "DO",
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
    {
      code: "FE",
      title: "Frontend Engineer (React & Design Systems)",
      jobCode: "JOB-FE-004",
      company: "Northgate Digital",
      description:
        "<p>We're hiring a Frontend Engineer to build accessible, high-performance UI using React, TypeScript, and a shared design system consumed across multiple products.</p>",
      successCriteria:
        "2+ years shipping production React/TypeScript interfaces, strong CSS/design-system fluency, and experience integrating GraphQL APIs.",
      minimumExperience: "2+ years",
      certification: "None required",
      minimumSalary: "$75,000 - $105,000",
      postFrom: new Date(),
      postTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      employmentType: "Permanent" as const,
      industry: "Software Development",
      skills: [
        { skillName: "REACT", priority: "REQUIRED" as const },
        { skillName: "TYPESCRIPT", priority: "REQUIRED" as const },
        { skillName: "TAILWINDCSS", priority: "PREFERRED" as const },
        { skillName: "GRAPHQL", priority: "PREFERRED" as const },
      ],
      requiredEdu: "Bachelor's Degree",
    },
  ]

  const jobCodeById = new Map<string, bigint>()

  for (const jobData of demoJobsData) {
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
    jobCodeById.set(jobData.code, job.id)
  }

  // 5. Define 10 distinct demo candidates with proper, differentiated profiles.
  // Skill scores/coverage are deliberately varied per candidate so AI shortlisting
  // runs produce a realistic spread of SHORTLIST / MAYBE / REJECT outcomes.
  type CandidateSkill = { skillName: string; scorePercent: number }
  type CandidateSpec = {
    firstname: string
    lastname: string
    emailPrefix: string
    city: string
    country: string
    bio: string
    certifications: string
    achievements: string
    noticePeriod: string
    availability: string
    educationLevel: string
    degreeTitle: string
    institute: string
    majorSubject: string
    grade: string
    passingYear: string
    experience: {
      jobTitle: string
      company: string
      location: string
      startDate: string
      endDate: string | null
      isCurrent: boolean
    }
    skills: CandidateSkill[]
    applyTo: string[] // job "code" values from demoJobsData
  }

  const candidates: CandidateSpec[] = [
    {
      firstname: "Alex",
      lastname: "Mercer",
      emailPrefix: "alex.mercer",
      city: "Lahore",
      country: "PK",
      bio: "Full stack engineer with 5 years building production Next.js and Node.js applications, from API design through deployment.",
      certifications: "AWS Certified Developer Associate",
      achievements: "Led migration of a monolithic Express API to a Next.js/Node.js microservices architecture serving 500k MAU.",
      noticePeriod: "1 month",
      availability: "Immediate",
      educationLevel: "Bachelor's Degree",
      degreeTitle: "Bachelor of Science in Software Engineering",
      institute: "National University of Sciences and Technology",
      majorSubject: "Software Engineering",
      grade: "3.7 / 4.0",
      passingYear: "2019",
      experience: {
        jobTitle: "Senior Full Stack Developer",
        company: "Global Tech Solutions",
        location: "Lahore, PK",
        startDate: "2021-01-01",
        endDate: null,
        isCurrent: true,
      },
      skills: [
        { skillName: "JAVASCRIPT", scorePercent: 92 },
        { skillName: "REACT", scorePercent: 88 },
        { skillName: "NODE.JS", scorePercent: 90 },
        { skillName: "TYPESCRIPT", scorePercent: 80 },
        { skillName: "DOCKER", scorePercent: 65 },
      ],
      applyTo: ["FS", "FE"],
    },
    {
      firstname: "Sophia",
      lastname: "Chen",
      emailPrefix: "sophia.chen",
      city: "Karachi",
      country: "PK",
      bio: "Machine learning engineer focused on NLP and retrieval-augmented generation, with production experience fine-tuning transformer models and shipping FastAPI inference services.",
      certifications: "TensorFlow Developer Certificate",
      achievements: "Built a RAG pipeline reducing customer support response latency by 40% for a SaaS product with 2M documents indexed.",
      noticePeriod: "2 weeks",
      availability: "Immediate",
      educationLevel: "Master's Degree",
      degreeTitle: "Master of Science in Computer Science",
      institute: "Lahore University of Management Sciences",
      majorSubject: "Artificial Intelligence",
      grade: "3.9 / 4.0",
      passingYear: "2021",
      experience: {
        jobTitle: "Machine Learning Engineer",
        company: "Aether Data Systems",
        location: "Karachi, PK",
        startDate: "2021-08-01",
        endDate: null,
        isCurrent: true,
      },
      skills: [
        { skillName: "PYTHON", scorePercent: 95 },
        { skillName: "PYTORCH", scorePercent: 89 },
        { skillName: "FASTAPI", scorePercent: 83 },
        { skillName: "DOCKER", scorePercent: 60 },
      ],
      applyTo: ["AI"],
    },
    {
      firstname: "Marcus",
      lastname: "Vance",
      emailPrefix: "marcus.vance",
      city: "Islamabad",
      country: "PK",
      bio: "Cloud infrastructure engineer specializing in Kubernetes administration, Terraform-driven IaC, and zero-downtime deployment pipelines across AWS.",
      certifications: "Certified Kubernetes Administrator (CKA), AWS SysOps Administrator",
      achievements: "Migrated a 40-service platform from EC2 to EKS, cutting infrastructure costs by 30% and deployment time by 70%.",
      noticePeriod: "1 month",
      availability: "1 month",
      educationLevel: "Bachelor's Degree",
      degreeTitle: "Bachelor of Science in Computer Science",
      institute: "FAST National University",
      majorSubject: "Computer Science",
      grade: "3.5 / 4.0",
      passingYear: "2018",
      experience: {
        jobTitle: "DevOps Engineer",
        company: "CloudMatrix Infrastructure",
        location: "Islamabad, PK",
        startDate: "2020-03-01",
        endDate: null,
        isCurrent: true,
      },
      skills: [
        { skillName: "DOCKER", scorePercent: 93 },
        { skillName: "KUBERNETES", scorePercent: 91 },
        { skillName: "AWS", scorePercent: 87 },
        { skillName: "PYTHON", scorePercent: 55 },
      ],
      applyTo: ["DO"],
    },
    {
      firstname: "Elena",
      lastname: "Rostova",
      emailPrefix: "elena.rostova",
      city: "Lahore",
      country: "PK",
      bio: "Frontend engineer building accessible, design-system-driven React and TypeScript interfaces, with a strong eye for performance and UI consistency.",
      certifications: "Meta Front-End Developer Professional Certificate",
      achievements: "Built and maintained a shared component library adopted across 6 product teams, cutting UI development time by 35%.",
      noticePeriod: "2 weeks",
      availability: "Immediate",
      educationLevel: "Bachelor's Degree",
      degreeTitle: "Bachelor of Science in Software Engineering",
      institute: "University of Engineering and Technology",
      majorSubject: "Software Engineering",
      grade: "3.6 / 4.0",
      passingYear: "2020",
      experience: {
        jobTitle: "Frontend Engineer",
        company: "Northgate Digital",
        location: "Lahore, PK",
        startDate: "2021-06-01",
        endDate: null,
        isCurrent: true,
      },
      skills: [
        { skillName: "REACT", scorePercent: 90 },
        { skillName: "TYPESCRIPT", scorePercent: 85 },
        { skillName: "JAVASCRIPT", scorePercent: 88 },
        { skillName: "TAILWINDCSS", scorePercent: 78 },
      ],
      applyTo: ["FE", "FS"],
    },
    {
      firstname: "David",
      lastname: "Kim",
      emailPrefix: "david.kim",
      city: "Karachi",
      country: "PK",
      bio: "Full stack developer with growing machine learning experience, comfortable shipping both Node.js/React features and Python data pipelines.",
      certifications: "None",
      achievements: "Shipped a recommendation feature combining a Node.js API with a Python scoring service, increasing engagement 12%.",
      noticePeriod: "1 month",
      availability: "2 weeks",
      educationLevel: "Master's Degree",
      degreeTitle: "Master of Science in Computer Science",
      institute: "Institute of Business Administration",
      majorSubject: "Computer Science",
      grade: "3.4 / 4.0",
      passingYear: "2022",
      experience: {
        jobTitle: "Software Engineer",
        company: "Vertex Software House",
        location: "Karachi, PK",
        startDate: "2022-02-01",
        endDate: null,
        isCurrent: true,
      },
      skills: [
        { skillName: "JAVASCRIPT", scorePercent: 75 },
        { skillName: "REACT", scorePercent: 68 },
        { skillName: "NODE.JS", scorePercent: 70 },
        { skillName: "PYTHON", scorePercent: 58 },
      ],
      applyTo: ["FS", "AI"],
    },
    {
      firstname: "Sarah",
      lastname: "Jenkins",
      emailPrefix: "sarah.jenkins",
      city: "Islamabad",
      country: "PK",
      bio: "PhD researcher turned applied ML engineer, specializing in deep learning model architecture, training pipelines, and TensorFlow production deployment.",
      certifications: "Deep Learning Specialization (deeplearning.ai)",
      achievements: "Published 3 peer-reviewed papers on transformer efficiency; deployed a production model serving 1M+ daily inference requests.",
      noticePeriod: "1 month",
      availability: "1 month",
      educationLevel: "Doctorate / PhD",
      degreeTitle: "PhD in Computer Science (Machine Learning)",
      institute: "National University of Sciences and Technology",
      majorSubject: "Machine Learning",
      grade: "N/A",
      passingYear: "2023",
      experience: {
        jobTitle: "Applied Research Scientist",
        company: "Aether AI Labs",
        location: "Islamabad, PK",
        startDate: "2023-09-01",
        endDate: null,
        isCurrent: true,
      },
      skills: [
        { skillName: "PYTHON", scorePercent: 96 },
        { skillName: "PYTORCH", scorePercent: 92 },
        { skillName: "TENSORFLOW", scorePercent: 85 },
      ],
      applyTo: ["AI"],
    },
    {
      firstname: "Tariq",
      lastname: "Mahmood",
      emailPrefix: "tariq.mahmood",
      city: "Faisalabad",
      country: "PK",
      bio: "Backend-leaning DevOps engineer with hands-on Docker and AWS experience, plus working Python scripting for infrastructure automation.",
      certifications: "AWS Certified Cloud Practitioner",
      achievements: "Automated deployment pipelines for a 15-service backend, reducing manual release effort from 2 days to 2 hours.",
      noticePeriod: "1 month",
      availability: "1 month",
      educationLevel: "Bachelor's Degree",
      degreeTitle: "Bachelor of Science in Information Technology",
      institute: "University of Agriculture Faisalabad",
      majorSubject: "Information Technology",
      grade: "3.2 / 4.0",
      passingYear: "2019",
      experience: {
        jobTitle: "Infrastructure Engineer",
        company: "PixelForge Systems",
        location: "Faisalabad, PK",
        startDate: "2019-11-01",
        endDate: null,
        isCurrent: true,
      },
      skills: [
        { skillName: "DOCKER", scorePercent: 72 },
        { skillName: "AWS", scorePercent: 68 },
        { skillName: "PYTHON", scorePercent: 62 },
      ],
      applyTo: ["DO", "AI"],
    },
    {
      firstname: "Jessica",
      lastname: "Taylor",
      emailPrefix: "jessica.taylor",
      city: "Lahore",
      country: "PK",
      bio: "Junior web developer with one year of professional experience building React components under senior guidance; still building depth in TypeScript and testing.",
      certifications: "None",
      achievements: "Delivered several UI features and bug fixes as part of a 4-person agile team.",
      noticePeriod: "2 weeks",
      availability: "Immediate",
      educationLevel: "Bachelor's Degree",
      degreeTitle: "Bachelor of Science in Computer Science",
      institute: "Punjab University",
      majorSubject: "Computer Science",
      grade: "3.0 / 4.0",
      passingYear: "2023",
      experience: {
        jobTitle: "Junior Frontend Developer",
        company: "Bright Web Studio",
        location: "Lahore, PK",
        startDate: "2023-06-01",
        endDate: null,
        isCurrent: true,
      },
      skills: [
        { skillName: "JAVASCRIPT", scorePercent: 55 },
        { skillName: "REACT", scorePercent: 48 },
      ],
      applyTo: ["FS", "FE"],
    },
    {
      firstname: "Omar",
      lastname: "Farooq",
      emailPrefix: "omar.farooq",
      city: "Rawalpindi",
      country: "PK",
      bio: "Senior cloud infrastructure engineer with deep Kubernetes and Terraform expertise, having designed multi-region AWS architectures for high-availability platforms.",
      certifications: "CKA, AWS Solutions Architect Professional",
      achievements: "Designed a multi-region active-active AWS/Kubernetes architecture achieving 99.99% uptime for a fintech platform.",
      noticePeriod: "1 month",
      availability: "1 month",
      educationLevel: "Master's Degree",
      degreeTitle: "Master of Science in Computer Engineering",
      institute: "National University of Sciences and Technology",
      majorSubject: "Computer Engineering",
      grade: "3.8 / 4.0",
      passingYear: "2017",
      experience: {
        jobTitle: "Senior DevOps Engineer",
        company: "CloudMatrix Infrastructure",
        location: "Rawalpindi, PK",
        startDate: "2018-04-01",
        endDate: null,
        isCurrent: true,
      },
      skills: [
        { skillName: "KUBERNETES", scorePercent: 96 },
        { skillName: "AWS", scorePercent: 94 },
        { skillName: "DOCKER", scorePercent: 90 },
        { skillName: "PYTHON", scorePercent: 66 },
      ],
      applyTo: ["DO"],
    },
    {
      firstname: "Hannah",
      lastname: "Abbott",
      emailPrefix: "hannah.abbott",
      city: "Multan",
      country: "PK",
      bio: "Early-career backend developer with Node.js exposure from bootcamp projects and a short internship; still developing React and TypeScript proficiency.",
      certifications: "None",
      achievements: "Completed a 3-month backend development bootcamp and built two portfolio REST API projects.",
      noticePeriod: "Immediate",
      availability: "Immediate",
      educationLevel: "Associate Degree",
      degreeTitle: "Associate Degree in Information Technology",
      institute: "Virtual University of Pakistan",
      majorSubject: "Information Technology",
      grade: "2.9 / 4.0",
      passingYear: "2024",
      experience: {
        jobTitle: "Backend Development Intern",
        company: "StartHub Technologies",
        location: "Multan, PK",
        startDate: "2024-01-01",
        endDate: "2024-06-30",
        isCurrent: false,
      },
      skills: [{ skillName: "NODE.JS", scorePercent: 45 }],
      applyTo: ["FS", "FE"],
    },
    {
      // Has not applied anywhere: use this account to try the quick test flow (e.g. on JOB-DO-003).
      firstname: "Zara",
      lastname: "Malik",
      emailPrefix: "zara.malik",
      city: "Lahore",
      country: "PK",
      bio: "Cloud engineer with hands-on Docker, Kubernetes and AWS experience, automating deployments and monitoring for production services.",
      certifications: "AWS Certified Cloud Practitioner",
      achievements: "Cut deployment time by 60% by containerising legacy services and introducing CI/CD pipelines.",
      noticePeriod: "2 weeks",
      availability: "2 weeks",
      educationLevel: "Bachelor's Degree",
      degreeTitle: "Bachelor of Science in Computer Science",
      institute: "Lahore University of Management Sciences",
      majorSubject: "Computer Science",
      grade: "3.4 / 4.0",
      passingYear: "2020",
      experience: {
        jobTitle: "Cloud Engineer",
        company: "NimbusWorks",
        location: "Lahore, PK",
        startDate: "2020-08-01",
        endDate: null,
        isCurrent: true,
      },
      skills: [
        { skillName: "DOCKER", scorePercent: 82 },
        { skillName: "KUBERNETES", scorePercent: 74 },
        { skillName: "AWS", scorePercent: 78 },
        { skillName: "PYTHON", scorePercent: 62 },
      ],
      applyTo: [],
    },
    {
      // Has not applied anywhere: a second account for trying the quick test flow.
      firstname: "Bilal",
      lastname: "Ahmed",
      emailPrefix: "bilal.ahmed",
      city: "Karachi",
      country: "PK",
      bio: "Site reliability engineer experienced with Kubernetes, Docker and AWS, focused on observability, incident response and infrastructure automation.",
      certifications: "CKA",
      achievements: "Reduced production incident response time by 40% through improved alerting and runbooks.",
      noticePeriod: "1 month",
      availability: "1 month",
      educationLevel: "Bachelor's Degree",
      degreeTitle: "Bachelor of Engineering in Software Engineering",
      institute: "NED University of Engineering and Technology",
      majorSubject: "Software Engineering",
      grade: "3.2 / 4.0",
      passingYear: "2019",
      experience: {
        jobTitle: "Site Reliability Engineer",
        company: "Orbit Systems",
        location: "Karachi, PK",
        startDate: "2019-09-01",
        endDate: null,
        isCurrent: true,
      },
      skills: [
        { skillName: "KUBERNETES", scorePercent: 85 },
        { skillName: "DOCKER", scorePercent: 80 },
        { skillName: "AWS", scorePercent: 72 },
        { skillName: "PYTHON", scorePercent: 58 },
      ],
      applyTo: [],
    },
  ]

  const hashedCandPassword = await bcrypt.hash("Candidate123!", 10)
  const credentialRows: { name: string; email: string; specialty: string }[] = []

  for (const spec of candidates) {
    const email = `${spec.emailPrefix}@example.com`
    const username = spec.emailPrefix.replace(/\./g, "_")

    let candidate = await prisma.user.findUnique({ where: { email } })
    if (!candidate) {
      candidate = await prisma.user.create({
        data: {
          role: "CANDIDATE",
          userStatus: "ACTIVE",
          username,
          email,
          password: hashedCandPassword,
          firstname: spec.firstname,
          lastname: spec.lastname,
          city: spec.city,
          country: spec.country,
          createdAt: now,
          updatedAt: now,
          profileDetails: {
            create: {
              bio: spec.bio,
              certifications: spec.certifications,
              achievements: spec.achievements,
              noticePeriod: spec.noticePeriod,
              availability: spec.availability,
              createdAt: now,
              updatedAt: now,
            },
          },
          educations: {
            create: [
              {
                educationLevelId: eduLevelMap.get(spec.educationLevel)!,
                degreeTitle: spec.degreeTitle,
                institute: spec.institute,
                majorSubject: spec.majorSubject,
                grade: spec.grade,
                passingYear: spec.passingYear,
                createdAt: now,
                updatedAt: now,
              },
            ],
          },
          experiences: {
            create: [
              {
                jobTitle: spec.experience.jobTitle,
                company: spec.experience.company,
                location: spec.experience.location,
                startDate: spec.experience.startDate,
                endDate: spec.experience.endDate,
                isCurrent: spec.experience.isCurrent,
                createdAt: now,
                updatedAt: now,
              },
            ],
          },
        },
      })
      console.log(`✅ Candidate Created: ${spec.firstname} ${spec.lastname} (${email})`)
    } else {
      console.log(`ℹ️ Candidate already exists: ${email}`)
    }

    // Seed skills + assessment scores
    for (const skill of spec.skills) {
      let userSkill = await prisma.userSkills.findFirst({
        where: { userId: candidate.id, skillName: skill.skillName },
      })

      if (!userSkill) {
        const verifiedLevel: VerifiedSkillLevel =
          skill.scorePercent >= 90
            ? "EXPERT"
            : skill.scorePercent >= 70
            ? "PROFESSIONAL"
            : skill.scorePercent >= 40
            ? "INTERMEDIATE"
            : "BEGINNER"

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

        const assessment = await prisma.skillAssessment.create({
          data: {
            userId: candidate.id,
            userSkillId: userSkill.id,
            skillName: skill.skillName,
            level: verifiedLevel,
            attemptNumber: 1,
            status: "SUBMITTED",
            scoredPoints: skill.scorePercent,
            minPoints: 60,
            maxPoints: 100,
            totalPoints: 100,
            startedAt: now - BigInt(3600),
            submittedAt: now,
            createdAt: now,
            updatedAt: now,
          },
        })

        await prisma.userSkills.update({
          where: { id: userSkill.id },
          data: { lastAssessmentId: assessment.id },
        })
      }
    }

    // Apply to the jobs this candidate is targeting
    for (const jobCode of spec.applyTo) {
      const jobId = jobCodeById.get(jobCode)
      if (!jobId) continue

      const existingApp = await prisma.jobsApplied.findUnique({
        where: { jobId_userId: { jobId, userId: candidate.id } },
      })

      if (!existingApp) {
        await prisma.jobsApplied.create({
          data: {
            jobId,
            userId: candidate.id,
            status: "SUBMITTED",
            appliedAt: now - BigInt(1800),
          },
        })
      }
    }

    credentialRows.push({
      name: `${spec.firstname} ${spec.lastname}`,
      email,
      specialty: spec.skills.map((s) => s.skillName).join(", "),
    })
  }

  for (const jobData of demoJobsData) {
    const jobId = jobCodeById.get(jobData.code)!
    const appCount = await prisma.jobsApplied.count({ where: { jobId } })
    console.log(`✅ ${appCount} candidate(s) applied to "${jobData.title}".`)
  }

  console.log("\n🎉 Seeding complete successfully!\n")
  console.log("=".repeat(70))
  console.log("DEMO CANDIDATE CREDENTIALS  (all passwords: Candidate123!)")
  console.log("=".repeat(70))
  for (const row of credentialRows) {
    console.log(`${row.name.padEnd(20)} ${row.email.padEnd(30)} ${row.specialty}`)
  }
  console.log("=".repeat(70))
  console.log("ADMIN LOGIN: admin@example.com / Admin123! (if no other admin existed)")
  console.log("=".repeat(70))
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
