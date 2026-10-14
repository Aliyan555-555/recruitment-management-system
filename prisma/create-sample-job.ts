/**
 * Creates one fully-configured sample job: Screening Interview -> Focus Group -> Offer.
 * Mirrors POST /api/admin/jobs (same normalize/validate/persist helpers).
 * Run: npx tsx prisma/create-sample-job.ts
 */
import { PrismaClient } from "@prisma/client"
import { generateJobCode } from "../lib/utils"
import { parseAndValidateSkillNames } from "../lib/skills"
import {
  buildStepColumns,
  buildStepMetadata,
  normalizeStep,
  syncStepInterviewers,
  validateWorkflow,
  type WorkflowStepPayload,
} from "../lib/workflow/step-persistence"

const prisma = new PrismaClient()

async function main() {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN", suspended: false, deletedAt: null } })
  if (!admin) throw new Error("No admin user found - run `npm run seed` first")

  const interviewers = await prisma.user.findMany({
    where: { role: "INTERVIEWER", suspended: false, deletedAt: null },
    select: { id: true, username: true },
    orderBy: { id: "asc" },
    take: 3,
  })
  console.log("Interviewers found:", interviewers.map((i) => i.username))
  if (interviewers.length < 2) throw new Error("Need at least 2 active interviewers (focus group panel = 2)")

  const ids = interviewers.map((i) => i.id.toString())
  const steps: WorkflowStepPayload[] = [
    {
      stepType: "SCREENING_INTERVIEW",
      stepOrder: 1,
      isRequired: true,
      interviewMode: "REMOTE",
      durationMins: 30,
      panelSize: 1,
      groupSize: 1,
      bufferMins: 10,
      meetingLink: "https://meet.google.com/abc-defg-hij",
      candidateInstructions:
        "A 30-minute introductory call. Be ready to discuss your background, recent projects and salary expectations. Join 5 minutes early with a working camera and microphone.",
      interviewerInstructions:
        "Verify the CV against the candidate's account, assess communication and motivation, and confirm notice period and salary expectations.",
      evaluationCriteria: ["Communication", "Relevant experience", "Motivation & culture fit", "Salary & availability alignment"],
      weightage: 40,
      scoreThreshold: 60,
      interviewerIds: ids,
    },
    {
      stepType: "FOCUS_GROUP",
      stepOrder: 2,
      isRequired: true,
      interviewMode: "ONSITE",
      durationMins: 90,
      panelSize: 2,
      groupSize: 5,
      bufferMins: 15,
      location: "Head Office, 4th Floor Conference Room, Gulberg III, Lahore",
      candidateInstructions:
        "A 90-minute group exercise with up to 5 candidates. You will solve a product/engineering case together and present your approach. Bring a valid photo ID and arrive 15 minutes early.",
      interviewerInstructions:
        "Observe collaboration, leadership, problem-solving and communication under time pressure. Score each candidate individually; avoid comparing candidates in front of the group.",
      evaluationCriteria: ["Collaboration & teamwork", "Problem solving", "Leadership & initiative", "Presentation clarity"],
      weightage: 60,
      scoreThreshold: 65,
      interviewerIds: ids,
    },
    { stepType: "OFFER", stepOrder: 3, isRequired: true },
  ]

  const err = validateWorkflow(steps)
  if (err) throw new Error(`Workflow invalid: ${err}`)

  const skills = parseAndValidateSkillNames(["REACT", "TYPESCRIPT", "NODEJS", "POSTGRESQL", "GIT"])
  if (!skills.valid) throw new Error(skills.error)
  const preferred = new Set(["GIT"])

  let jobCode = ""
  for (;;) {
    jobCode = await generateJobCode("NGD")
    if (!(await prisma.job.findUnique({ where: { jobCode } }))) break
  }

  const level = await prisma.userEducationLevel.findFirst({ where: { name: "Bachelor's Degree" } })

  const job = await prisma.$transaction(async (tx) => {
    const j = await tx.job.create({
      data: {
        jobCode,
        title: "Full Stack Engineer (React & Node.js)",
        shortDescription: "Build and ship customer-facing features across our React frontend and Node.js/PostgreSQL backend.",
        description:
          "<p>We are looking for a Full Stack Engineer to join our product team in Lahore. You will design, build and maintain web features end to end - from database schema and REST APIs to polished React interfaces.</p>" +
          "<h3>Responsibilities</h3><ul><li>Build and maintain features using React, TypeScript and Node.js</li><li>Design PostgreSQL schemas and write efficient queries</li><li>Review code, write tests and improve CI/CD</li><li>Collaborate with design and product on scoping and delivery</li></ul>" +
          "<h3>What we offer</h3><ul><li>Hybrid working, 3 days onsite</li><li>Medical insurance and annual bonus</li><li>Learning budget</li></ul>",
        company: "Northgate Digital",
        postFrom: new Date(),
        postTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: true,
        jobType: "NORMAL",
        jobStatus: "ACTIVE",
        industry: "Software Development",
        employmentType: "Permanent" as any,
        employmentShift: "Day",
        totalPositions: 2,
        minimumExperience: "2+ years",
        certification: "None required",
        minimumSalary: "PKR 250,000 - 400,000 / month",
        benefits: "Medical insurance, annual bonus, hybrid work, learning budget",
        successCriteria:
          "2+ years building production React/TypeScript apps, solid Node.js and SQL skills, and clear written and spoken communication.",
        createdBy: admin.id,
        updatedBy: admin.id,
        createdAt: now,
        updatedAt: now,
      },
    })

    await tx.jobLocation.create({ data: { jobId: j.id, city: "Lahore", country: "PK", createdAt: now, updatedAt: now } })
    await tx.jobSkill.createMany({
      data: skills.normalized.map((skillName) => ({
        jobId: j.id,
        skillName,
        priority: preferred.has(skillName) ? ("PREFERRED" as const) : ("REQUIRED" as const),
      })),
    })
    if (level) {
      await tx.jobEducationRequirement.create({
        data: { jobId: j.id, educationLevelId: level.id, field: "Computer Science or related", isRequired: true, createdAt: now, updatedAt: now },
      })
    }

    const workflow = await tx.jobWorkflow.create({ data: { jobId: j.id, createdAt: now, updatedAt: now } })
    for (const raw of steps) {
      const step = normalizeStep(raw)
      const created = await tx.workflowStep.create({
        data: {
          workflowId: workflow.id,
          ...buildStepColumns(step),
          status: "ACTIVE",
          stepMetadata: buildStepMetadata(step),
          createdAt: now,
          updatedAt: now,
        },
      })
      if (step.interviewerIds && step.interviewerIds.length > 0) {
        await syncStepInterviewers(tx, created.id, step.interviewerIds, now)
      }
    }
    return j
  })

  console.log(`Created job #${job.id} ${job.jobCode}: ${job.title}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
