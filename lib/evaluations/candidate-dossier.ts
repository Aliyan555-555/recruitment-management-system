import { prisma } from "@/lib/prisma"
import { buildQuickTestRows, matchJobSkills, summarizeScreeningForm } from "./dossier-helpers"

const pct = (scored: number | null | undefined, max: number) => (scored == null || max <= 0 ? null : Math.round((scored / max) * 100))
const ts = (v: bigint | null | undefined) => (v == null ? null : v.toString())

/**
 * Everything an interviewer needs to know about the candidate, in one payload.
 * Callers MUST have verified the interviewer sits on the booking; ids come from that booking, never the client.
 * Only prior-round (screening) scorecards are included, never other focus-group panelists' scores.
 */
export async function buildCandidateDossier(args: {
  candidateId: bigint
  applicationId: bigint
  jobId: bigint
  currentPipelineStepId: bigint | null
}) {
  const { candidateId, applicationId, jobId } = args

  const [user, application, quickTest, jobSkills, userSkills, assessments, screeningStep] = await Promise.all([
    prisma.user.findUnique({
      where: { id: candidateId },
      include: {
        profileDetails: true,
        educations: { include: { educationLevel: true }, orderBy: { createdAt: "desc" } },
        experiences: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.jobsApplied.findUnique({ where: { id: applicationId }, select: { appliedAt: true } }),
    prisma.quickTestAttempt.findUnique({
      where: { jobId_userId: { jobId, userId: candidateId } },
      include: { questions: true, answers: true },
    }),
    prisma.jobSkill.findMany({ where: { jobId }, orderBy: { skillName: "asc" } }),
    prisma.userSkills.findMany({ where: { userId: candidateId } }),
    prisma.skillAssessment.findMany({
      where: { userId: candidateId, status: { in: ["PASSED", "FAILED", "SUBMITTED"] } },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.candidatePipelineStep.findFirst({
      where: {
        pipeline: { applicationId },
        workflowStep: { stepType: "SCREENING_INTERVIEW" },
        ...(args.currentPipelineStepId ? { id: { not: args.currentPipelineStepId } } : {}),
      },
      orderBy: { stepOrder: "asc" },
      include: {
        workflowStep: { select: { stepName: true } },
        stageEvaluations: {
          where: { submittedAt: { not: null } },
          include: { evaluator: { select: { firstname: true, lastname: true } } },
        },
      },
    }),
  ])

  // Latest finished assessment per skill
  const latestBySkill = new Map<string, (typeof assessments)[number]>()
  for (const a of assessments) {
    const key = a.skillName.trim().toUpperCase()
    if (!latestBySkill.has(key)) latestBySkill.set(key, a)
  }
  const assessmentPercentBySkill = new Map(
    [...latestBySkill.entries()].map(([k, a]) => [k, pct(a.scoredPoints, a.maxPoints)])
  )

  const skillMatch = matchJobSkills(
    jobSkills.map((s) => ({ skillName: s.skillName, priority: s.priority })),
    userSkills.map((s) => ({
      skillName: s.skillName,
      level: s.level,
      verifiedLevel: s.verifiedLevel,
      assessmentPercent: assessmentPercentBySkill.get(s.skillName.trim().toUpperCase()) ?? null,
    }))
  )

  const jobSkillKeys = new Set(jobSkills.map((s) => s.skillName.trim().toUpperCase()))
  const skillAssessments = [...latestBySkill.entries()]
    .map(([key, a]) => ({
      id: a.id.toString(),
      skillName: a.skillName,
      status: a.status,
      level: a.level,
      attemptNumber: a.attemptNumber,
      scoredPoints: a.scoredPoints,
      maxPoints: a.maxPoints,
      minPoints: a.minPoints,
      percentage: pct(a.scoredPoints, a.maxPoints),
      submittedAt: ts(a.submittedAt),
      relevantToJob: jobSkillKeys.has(key),
    }))
    .sort((a, b) => Number(b.relevantToJob) - Number(a.relevantToJob))

  const d = user?.profileDetails

  return {
    profile: {
      name: user ? `${user.firstname} ${user.lastname}` : "",
      email: user?.email ?? "",
      phone: user?.phone1 ?? null,
      phone2: user?.phone2 ?? null,
      city: user?.city ?? null,
      country: user?.country ?? null,
      dateOfBirth: d?.dateOfBirth ?? null,
      gender: d?.gender ?? null,
      nationality: d?.nationality ?? null,
      maritalStatus: d?.maritalStatus ?? null,
      bio: d?.bio ?? null,
      languages: d?.languages ?? null,
      certifications: d?.certifications ?? null,
      achievements: d?.achievements ?? null,
      availability: d?.availability ?? null,
      expectedSalary: d?.expectedSalary ?? null,
      noticePeriod: d?.noticePeriod ?? null,
      professionalGrade: d?.professionalGrade ?? null,
      links: [
        { label: "LinkedIn", url: d?.linkedinUrl },
        { label: "GitHub", url: d?.githubUrl },
        { label: "Portfolio", url: d?.portfolioUrl },
        { label: "Website", url: d?.websiteUrl },
      ].filter((l): l is { label: string; url: string } => !!l.url),
      appliedAt: ts(application?.appliedAt),
    },
    education: (user?.educations ?? []).map((e) => ({
      id: e.id.toString(),
      level: e.educationLevel.name,
      degreeTitle: e.degreeTitle,
      institute: e.institute,
      majorSubject: e.majorSubject,
      grade: e.grade,
      passingYear: e.passingYear,
    })),
    experience: (user?.experiences ?? []).map((e) => ({
      id: e.id.toString(),
      jobTitle: e.jobTitle,
      company: e.company,
      location: e.location,
      startDate: e.startDate,
      endDate: e.endDate,
      isCurrent: e.isCurrent,
    })),
    quickTest: quickTest
      ? {
          status: quickTest.status,
          scoredPoints: quickTest.scoredPoints,
          maxPoints: quickTest.maxPoints,
          scorePercent: quickTest.scorePercent ?? pct(quickTest.scoredPoints, quickTest.maxPoints),
          timeLimitMinutes: quickTest.timeLimitMinutes,
          startedAt: ts(quickTest.startedAt),
          submittedAt: ts(quickTest.submittedAt),
          questions: buildQuickTestRows(quickTest.questions, quickTest.answers),
        }
      : null,
    screening:
      screeningStep && screeningStep.stageEvaluations.length > 0
        ? {
            roundName: screeningStep.workflowStep.stepName,
            feedback: screeningStep.feedback,
            evaluations: screeningStep.stageEvaluations.map((e) => ({
              evaluatorName: `${e.evaluator.firstname} ${e.evaluator.lastname}`,
              submittedAt: ts(e.submittedAt),
              ...summarizeScreeningForm(e.formData),
            })),
          }
        : null,
    jobSkills: skillMatch,
    skillAssessments,
  }
}

export type CandidateDossier = Awaited<ReturnType<typeof buildCandidateDossier>>
