/**
 * Seeds demo candidates and applies them to a job.
 *
 *   npx tsx prisma/seed-candidates.ts demo       # create 4 demo jobs, 50 candidates apply to each (default)
 *   npx tsx prisma/seed-candidates.ts 1          # 50 candidates -> job id 1
 *   npx tsx prisma/seed-candidates.ts 1,3 25     # 25 candidates -> jobs 1 and 3
 *
 * Idempotent: candidates are keyed by email (seed.candidate.N@example.com), existing ones are
 * reused, and an application is only created if one does not exist. Password: Candidate123!
 * The mix of ages, education levels, institutes and grade formats exists to exercise the
 * shortlisting filters (age range, minimum education, "needs review" for missing data).
 */
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { ensurePipelineForApplication } from "../lib/services/pipeline-gate"

const prisma = new PrismaClient()

const jobArg = process.argv[2] ?? "demo"
const total = Number(process.argv[3] ?? "50")

// Demo jobs differ in education level, age range and skills so the shortlisting filters have something to do.
const DEMO_JOBS = [
  { jobCode: "SEED-JOB-001", title: "Senior Full Stack Engineer", company: "TechPulse Solutions", industry: "Software Development", edu: "Bachelor's Degree", minAge: 23, maxAge: 40, minimumExperience: "4+ years", successCriteria: "Built and scaled production web apps with React, Node.js and PostgreSQL.", skills: [["JAVASCRIPT", "REQUIRED"], ["REACT", "REQUIRED"], ["NODE.JS", "REQUIRED"], ["TYPESCRIPT", "PREFERRED"], ["DOCKER", "PREFERRED"]] },
  { jobCode: "SEED-JOB-002", title: "Data Scientist", company: "Insight Analytics", industry: "Data & AI", edu: "Master's Degree", minAge: 24, maxAge: 38, minimumExperience: "2+ years", successCriteria: "Delivered ML models to production and communicated results to business teams.", skills: [["PYTHON", "REQUIRED"], ["MACHINE LEARNING", "REQUIRED"], ["SQL", "REQUIRED"], ["TENSORFLOW", "PREFERRED"]] },
  { jobCode: "SEED-JOB-003", title: "Junior Frontend Developer", company: "PixelCraft Studio", industry: "Software Development", edu: "Intermediate / College (HSSC)", minAge: 19, maxAge: 30, minimumExperience: "0-1 years", successCriteria: "Eager to learn, comfortable with HTML, CSS and JavaScript fundamentals.", skills: [["HTML", "REQUIRED"], ["CSS", "REQUIRED"], ["JAVASCRIPT", "REQUIRED"], ["REACT", "PREFERRED"]] },
  { jobCode: "SEED-JOB-004", title: "Customer Support Executive", company: "ServiceHub", industry: "Customer Service", edu: "Matric / Secondary (SSC)", minAge: 18, maxAge: 35, minimumExperience: "None", successCriteria: "Clear communicator, patient with customers, comfortable with basic computer use.", skills: [["COMMUNICATION", "REQUIRED"], ["CUSTOMER SERVICE", "REQUIRED"], ["MS OFFICE", "PREFERRED"]] },
] as const

async function ensureDemoJobs(): Promise<bigint[]> {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } })
  if (!admin) throw new Error("No admin user found; run the main seed first")
  const levels = await prisma.userEducationLevel.findMany()
  const now = BigInt(Math.floor(Date.now() / 1000))
  const ids: bigint[] = []
  for (const j of DEMO_JOBS) {
    let job = await prisma.job.findUnique({ where: { jobCode: j.jobCode } })
    if (!job) {
      const level = levels.find((l) => l.name === j.edu)
      job = await prisma.job.create({
        data: {
          jobCode: j.jobCode,
          title: j.title,
          company: j.company,
          description: `<p>${j.title} at ${j.company} (seeded demo job).</p>`,
          successCriteria: j.successCriteria,
          minimumExperience: j.minimumExperience,
          industry: j.industry,
          postFrom: new Date(),
          postTo: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          employmentType: "Permanent",
          minAge: j.minAge,
          maxAge: j.maxAge,
          createdBy: admin.id,
          updatedBy: admin.id,
          createdAt: now,
          updatedAt: now,
          skills: { create: j.skills.map(([skillName, priority]) => ({ skillName, priority })) },
          ...(level
            ? { educationRequirements: { create: [{ educationLevelId: level.id, isRequired: true, createdAt: now, updatedAt: now }] } }
            : {}),
          workflow: {
            create: {
              createdAt: now,
              updatedAt: now,
              steps: {
                create: [
                  { stepName: "Screening Interview", stepType: "SCREENING_INTERVIEW", stepOrder: 1, isRequired: true, isSkippable: false, status: "ACTIVE", createdAt: now, updatedAt: now },
                  { stepName: "Offer", stepType: "OFFER", stepOrder: 2, isRequired: true, isSkippable: false, status: "ACTIVE", createdAt: now, updatedAt: now },
                ],
              },
            },
          },
        },
      })
      console.log(`Job created: ${job.title} (${job.jobCode}, id ${job.id})`)
    } else {
      console.log(`Job exists: ${job.title} (${job.jobCode}, id ${job.id})`)
    }
    ids.push(job.id)
  }
  return ids
}

// Small deterministic PRNG so reruns produce the same population
let seedState = 20261008
const rand = () => {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296
  return seedState / 4294967296
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))

const FIRST_M = ["Ahmed", "Ali", "Hassan", "Bilal", "Usman", "Hamza", "Faisal", "Imran", "Saad", "Zain", "Omar", "Danish", "Kashif", "Asad", "Raza"]
const FIRST_F = ["Ayesha", "Fatima", "Sana", "Hira", "Maryam", "Zainab", "Noor", "Iqra", "Mehwish", "Rabia", "Sidra", "Areeba", "Laiba", "Hina", "Amna"]
const LAST = ["Khan", "Ahmed", "Siddiqui", "Sheikh", "Malik", "Qureshi", "Ansari", "Hussain", "Raza", "Memon", "Baig", "Farooqui", "Butt", "Chaudhry", "Zaidi"]
const CITIES = ["Karachi", "Lahore", "Islamabad", "Hyderabad", "Faisalabad", "Rawalpindi"]

type Profile = {
  level: string // education level name
  degree: string
  major: string | null
  institutes: string[] // names; some are aliases / free text on purpose
}
const PROFILES: Profile[] = [
  { level: "Bachelor's Degree", degree: "BS Computer Science", major: "Computer Science", institutes: ["NED University of Engineering and Technology", "NEDUET", "University of Karachi", "FAST National University of Computer and Emerging Sciences", "Iqra University", "Some Private College"] },
  { level: "Bachelor's Degree", degree: "BE Software Engineering", major: "Software Engineering", institutes: ["NED University of Engineering and Technology", "Karachi University", "COMSATS University Islamabad", "Bahria University"] },
  { level: "Master's Degree", degree: "MS Data Science", major: "Data Science", institutes: ["FAST NUCES", "University of Karachi", "Institute of Business Administration Karachi", "NED University"] },
  { level: "Intermediate / College (HSSC)", degree: "Intermediate (Pre-Engineering)", major: null, institutes: ["Government College Karachi", "Adamjee Science College", "DJ Science College"] },
  { level: "Matric / Secondary (SSC)", degree: "Matriculation", major: null, institutes: ["Government High School", "City School", "Beaconhouse"] },
  { level: "Associate Degree", degree: "Associate Degree in IT", major: "Information Technology", institutes: ["Aptech Learning", "Government Polytechnic Institute", "Iqra University"] },
]
const GRADE_STYLES = [(c: number) => c.toFixed(1), (c: number) => `${c.toFixed(2)}/4`, (c: number) => `${Math.round((c / 4) * 100)}%`, () => "A+", () => ""]

async function main() {
  const jobIds = jobArg === "demo" ? await ensureDemoJobs() : jobArg.split(",").map((v) => BigInt(v.trim()))
  const jobs = await prisma.job.findMany({ where: { id: { in: jobIds } }, include: { skills: true } })
  if (jobs.length !== jobIds.length) throw new Error(`Some jobs were not found: ${jobArg}`)
  const skillPool = Array.from(new Set(jobs.flatMap((j) => j.skills.map((s) => s.skillName))))
  console.log(`Seeding ${total} candidates and applying to ${jobs.length} job(s): ${jobs.map((j) => `#${j.id} ${j.title}`).join(", ")}`)

  const levels = await prisma.userEducationLevel.findMany()
  const levelByName = new Map(levels.map((l) => [l.name, l.id]))
  const institutes = await prisma.institute.findMany({ where: { deletedAt: null } })
  const instituteIdByName = new Map(institutes.map((i) => [i.name.toLowerCase(), i.id]))

  const password = await bcrypt.hash("Candidate123!", 10)
  const now = BigInt(Math.floor(Date.now() / 1000))
  const year = new Date().getFullYear()
  let created = 0
  let applied = 0

  for (let n = 1; n <= total; n++) {
    const female = rand() < 0.45
    const firstname = pick(female ? FIRST_F : FIRST_M)
    const lastname = pick(LAST)
    const email = `seed.candidate.${n}@example.com`
    const username = `seed_candidate_${n}`

    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // ~8% have no education at all; ~6% have no date of birth (exercise "needs review")
      const noEducation = rand() < 0.08
      const noDob = rand() < 0.06
      const age = between(19, 46)
      const dob = new Date(Date.UTC(year - age, between(0, 11), between(1, 28))).toISOString().slice(0, 10)

      const profile = pick(PROFILES)
      const instName = pick(profile.institutes)
      const cgpa = 2 + rand() * 2 // 2.0 - 4.0
      const grade = pick(GRADE_STYLES)(cgpa)
      const levelId = levelByName.get(profile.level)

      user = await prisma.user.create({
        data: {
          role: "CANDIDATE",
          userStatus: "ACTIVE",
          username,
          email,
          password,
          firstname,
          lastname,
          phone1: `03${between(0, 4)}${between(10000000, 99999999)}`,
          city: pick(CITIES),
          country: "PK",
          createdAt: now,
          updatedAt: now,
          profileDetails: {
            create: {
              dateOfBirth: noDob ? null : dob,
              gender: female ? "Female" : "Male",
              nationality: "Pakistani",
              religion: "Islam",
              cnic: `42101-${between(1000000, 9999999)}-${between(1, 9)}`,
              bio: `${firstname} is a ${profile.degree} candidate based in Karachi (seeded demo profile).`,
              disclaimersAgreed: true,
              createdAt: now,
              updatedAt: now,
            },
          },
          ...(noEducation || !levelId
            ? {}
            : {
                educations: {
                  create: [
                    {
                      educationLevelId: levelId,
                      degreeTitle: profile.degree,
                      institute: instName,
                      instituteId: instituteIdByName.get(instName.toLowerCase()) ?? null,
                      majorSubject: profile.major,
                      grade,
                      passingYear: String(year - between(0, 12)),
                      country: "Pakistan",
                      createdAt: now,
                      updatedAt: now,
                    },
                  ],
                },
              }),
        },
      })
      created++

    }

    // Give each candidate a random subset of the jobs' skills (also fills in candidates seeded earlier)
    const have = new Set((await prisma.userSkills.findMany({ where: { userId: user.id }, select: { skillName: true } })).map((x) => x.skillName))
    for (const skillName of skillPool) {
      if (!have.has(skillName) && rand() < 0.6) {
        await prisma.userSkills.create({
          data: { userId: user.id, skillName, level: between(2, 5), createdAt: now, updatedAt: now },
        })
      }
    }

    for (const jobId of jobIds) {
      const existing = await prisma.jobsApplied.findUnique({
        where: { jobId_userId: { jobId, userId: user.id } },
      })
      if (!existing) {
        const appliedAt = now - BigInt(between(60, 86400 * 5))
        const app = await prisma.jobsApplied.create({
          data: { jobId, userId: user.id, status: "SUBMITTED", appliedAt },
        })
        await prisma.$transaction((tx) =>
          ensurePipelineForApplication(tx, { applicationId: app.id, jobId, userId: user!.id, startedAt: appliedAt })
        )
        applied++
      }
    }
  }

  console.log(`Done: ${created} candidates created, ${applied} applications added across ${jobIds.length} job(s).`)
  console.log("Login: seed.candidate.N@example.com / Candidate123!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
