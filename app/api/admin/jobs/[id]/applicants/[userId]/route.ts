import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { eligibilityFromApplication, SHORTLIST_PIPELINE_SELECT } from "@/lib/admin/shortlist-eligibility"
import { ageFromDob, experienceYears } from "@/lib/admin/applicant-serializers"
import { serializeShortlistResult } from "@/lib/ai-shortlist/serializers"
import { buildSkillPercentageMap } from "@/lib/assessments/skill-percentage"
import { loadCandidateFilterFacts } from "@/lib/services/candidate-filter-facts"
import { MAX_APPLICANT_NOTE_LENGTH, updateApplicantNote } from "@/lib/services/applicant-review-service"

function parseIds(params: { id: string; userId: string }) {
  if (!/^\d+$/.test(params.id) || !/^\d+$/.test(params.userId)) return null
  return { jobId: BigInt(params.id), userId: BigInt(params.userId) }
}

/** Full CV-style profile of one applicant for this job (admin only). */
export async function GET(_req: NextRequest, { params }: { params: { id: string; userId: string } }) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    const ids = parseIds(params)
    if (!ids) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    const { jobId, userId } = ids

    const application = await prisma.jobsApplied.findUnique({
      where: { jobId_userId: { jobId, userId } },
      include: { pipeline: { select: SHORTLIST_PIPELINE_SELECT } },
    })
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 })

    const [user, quickTest, aiResult, facts, reviewer] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          phone1: true,
          phone2: true,
          city: true,
          country: true,
          address: true,
          avatar: true,
          profileDetails: true,
          jobPreference: { select: { firstPriority: true, secondPriority: true, thirdPriority: true, summary: true } },
          educations: {
            select: {
              id: true,
              degreeTitle: true,
              institute: true,
              instituteRef: { select: { name: true } },
              majorSubject: true,
              grade: true,
              passingYear: true,
              educationLevel: { select: { name: true, rank: true } },
            },
          },
          experiences: {
            select: { id: true, jobTitle: true, company: true, location: true, startDate: true, endDate: true, isCurrent: true },
            orderBy: { createdAt: "desc" },
          },
          skills: {
            select: { id: true, skillName: true, level: true, verifiedLevel: true, lastAssessmentId: true },
            orderBy: { level: "desc" },
          },
        },
      }),
      prisma.quickTestAttempt.findFirst({
        where: { jobId, userId },
        orderBy: { createdAt: "desc" },
        select: { status: true, scorePercent: true, scoredPoints: true, maxPoints: true, questionCount: true, submittedAt: true },
      }),
      prisma.aiCandidateShortlistResult.findFirst({
        where: { jobId, candidateId: userId },
        orderBy: { createdAt: "desc" },
      }),
      loadCandidateFilterFacts([userId]),
      application.reviewedBy
        ? prisma.user.findUnique({ where: { id: application.reviewedBy }, select: { firstname: true, lastname: true } })
        : Promise.resolve(null),
    ])
    if (!user) return NextResponse.json({ error: "Candidate not found" }, { status: 404 })

    const assessmentIds = user.skills.map((s) => s.lastAssessmentId).filter((v): v is bigint => v != null)
    const assessments = assessmentIds.length
      ? await prisma.skillAssessment.findMany({
          where: { id: { in: assessmentIds } },
          select: { id: true, scoredPoints: true, maxPoints: true },
        })
      : []
    const pctMap = buildSkillPercentageMap(assessments)
    const eligibility = eligibilityFromApplication(application)
    const pd = user.profileDetails
    const f = facts.get(userId.toString()) ?? null

    return NextResponse.json({
      candidate: {
        id: user.id.toString(),
        name: `${user.firstname} ${user.lastname}`.trim(),
        email: user.email,
        phone: user.phone1,
        phone2: user.phone2,
        city: user.city,
        country: user.country,
        address: user.address,
        avatar: user.avatar,
        age: ageFromDob(f?.dob),
        dateOfBirth: f?.dob ?? null,
        profile: pd
          ? {
              title: pd.title,
              gender: pd.gender,
              nationality: pd.nationality,
              maritalStatus: pd.maritalStatus,
              preferredCity: pd.preferredCity,
              professionalGrade: pd.professionalGrade,
              linkedinUrl: pd.linkedinUrl,
              portfolioUrl: pd.portfolioUrl,
              githubUrl: pd.githubUrl,
              websiteUrl: pd.websiteUrl,
              bio: pd.bio,
              availability: pd.availability,
              expectedSalary: pd.expectedSalary,
              noticePeriod: pd.noticePeriod,
              languages: pd.languages,
              certifications: pd.certifications,
              achievements: pd.achievements,
            }
          : null,
        jobPreference: user.jobPreference,
        educations: [...user.educations]
          .sort((a, b) => (b.educationLevel?.rank ?? 0) - (a.educationLevel?.rank ?? 0))
          .map((e) => ({
            id: e.id.toString(),
            level: e.educationLevel?.name ?? null,
            degree: e.degreeTitle,
            institute: e.instituteRef?.name ?? e.institute,
            major: e.majorSubject,
            grade: e.grade,
            passingYear: e.passingYear,
          })),
        experiences: user.experiences.map((x) => ({
          id: x.id.toString(),
          title: x.jobTitle,
          company: x.company,
          location: x.location,
          startDate: x.startDate,
          endDate: x.endDate,
          isCurrent: x.isCurrent,
        })),
        experienceYears: experienceYears(user.experiences),
        skills: user.skills.map((s) => ({
          id: s.id.toString(),
          name: s.skillName,
          level: s.level,
          verifiedLevel: s.verifiedLevel,
          assessmentPercent: s.lastAssessmentId ? pctMap.get(s.lastAssessmentId.toString()) ?? null : null,
        })),
      },
      application: {
        id: application.id.toString(),
        status: application.status,
        appliedAt: application.appliedAt.toString(),
        note: application.note,
        reviewFlag: application.reviewFlag,
        reviewedAt: application.reviewedAt?.toString() ?? null,
        reviewedBy: reviewer ? `${reviewer.firstname} ${reviewer.lastname}`.trim() : null,
        actionable: eligibility.actionable,
        actionBlockedReason: eligibility.actionBlockedReason,
        statusLabel: eligibility.statusLabel,
      },
      quickTest: quickTest
        ? {
            status: quickTest.status,
            scorePercent: quickTest.scorePercent,
            scoredPoints: quickTest.scoredPoints,
            maxPoints: quickTest.maxPoints,
            questionCount: quickTest.questionCount,
            submittedAt: quickTest.submittedAt?.toString() ?? null,
          }
        : null,
      ai: aiResult ? serializeShortlistResult(aiResult) : null,
      filterFacts: f,
    })
  } catch (error: any) {
    console.error("Error fetching applicant detail:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch applicant" }, { status: 500 })
  }
}

/** Updates the reviewer note on this application. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string; userId: string } }) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    const ids = parseIds(params)
    if (!ids) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    if (typeof body?.note !== "string") return NextResponse.json({ error: "note must be a string" }, { status: 400 })
    if (body.note.length > MAX_APPLICANT_NOTE_LENGTH) {
      return NextResponse.json({ error: `Note must be at most ${MAX_APPLICANT_NOTE_LENGTH} characters` }, { status: 400 })
    }

    const result = await updateApplicantNote(ids.jobId, ids.userId, body.note, BigInt(admin.id))
    if (!result) return NextResponse.json({ error: "Application not found" }, { status: 404 })
    return NextResponse.json({ success: true, note: result.note })
  } catch (error: any) {
    console.error("Error updating applicant note:", error)
    return NextResponse.json({ error: error.message || "Failed to update note" }, { status: 500 })
  }
}
