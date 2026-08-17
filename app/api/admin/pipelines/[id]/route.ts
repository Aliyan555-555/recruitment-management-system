import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { buildSkillPercentageMap } from "@/lib/assessments/skill-percentage"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const pipelineId = BigInt(params.id)

    const pipeline = await prisma.candidatePipeline.findUnique({
      where: { id: pipelineId },
      include: {
        candidate: {
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
            institution: true,
            department: true,
            experiences: {
              orderBy: {
                createdAt: 'desc'
              }
            },
            educations: {
              include: {
                educationLevel: true,
                instituteRef: true
              },
              orderBy: {
                createdAt: 'desc'
              }
            },
            skills: {
              orderBy: {
                createdAt: 'desc'
              }
            },
            profileDetails: true,
            jobPreference: true
          }
        },
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            description: true,
            industry: true,
            employmentType: true,
            minimumExperience: true,
            minimumSalary: true
          }
        },
        application: {
          select: {
            id: true,
            status: true,
            appliedAt: true
          }
        },
        steps: {
          include: {
            workflowStep: {
              select: {
                stepName: true,
                stepOrder: true,
                isRequired: true,
                isSkippable: true
              }
            },
            interviews: true
          },
          orderBy: {
            stepOrder: 'asc'
          }
        }
      }
    })

    if (!pipeline) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 }
      )
    }

    const lastAssessmentIds = (pipeline as any).candidate.skills
      .map((skill: any) => skill.lastAssessmentId)
      .filter((id: any): id is bigint => id != null)

    const lastAssessments =
      lastAssessmentIds.length > 0
        ? await prisma.skillAssessment.findMany({
            where: { id: { in: lastAssessmentIds } },
            select: {
              id: true,
              scoredPoints: true,
              maxPoints: true,
            },
          })
        : []

    const percentageByAssessmentId = buildSkillPercentageMap(lastAssessments)

    const p = pipeline as any;

    return NextResponse.json({
      pipeline: {
        id: p.id.toString(),
        candidate: {
          id: p.candidate.id.toString(),
          name: `${p.candidate.firstname} ${p.candidate.lastname}`,
          firstname: p.candidate.firstname,
          lastname: p.candidate.lastname,
          email: p.candidate.email,
          phone: p.candidate.phone1,
          phone2: p.candidate.phone2,
          address: p.candidate.address,
          city: p.candidate.city,
          country: p.candidate.country,
          location: `${p.candidate.city || ''}, ${p.candidate.country || ''}`.trim(),
          institution: p.candidate.institution,
          department: p.candidate.department,
          experiences: p.candidate.experiences.map((exp: any) => ({
            id: exp.id.toString(),
            jobTitle: exp.jobTitle,
            company: exp.company,
            location: exp.location,
            startDate: exp.startDate,
            endDate: exp.endDate,
            isCurrent: exp.isCurrent,
            createdAt: exp.createdAt.toString()
          })),
          educations: p.candidate.educations.map((edu: any) => ({
            id: edu.id.toString(),
            educationLevel: edu.educationLevel.name,
            degreeTitle: edu.degreeTitle,
            institute: edu.institute,
            instituteName: edu.instituteRef?.name,
            majorSubject: edu.majorSubject,
            grade: edu.grade,
            passingYear: edu.passingYear,
            country: edu.country,
            createdAt: edu.createdAt.toString()
          })),
          skills: p.candidate.skills.map((skill: any) => ({
            id: skill.id.toString(),
            skillName: skill.skillName,
            verifiedLevel: skill.verifiedLevel,
            verifiedAt: skill.verifiedAt?.toString() ?? null,
            skillPercentage: skill.lastAssessmentId
              ? percentageByAssessmentId.get(skill.lastAssessmentId.toString()) ?? null
              : null,
            lastAssessmentId: skill.lastAssessmentId?.toString() ?? null,
            createdAt: skill.createdAt.toString()
          })),
          profileDetails: p.candidate.profileDetails ? {
            title: p.candidate.profileDetails.title,
            fatherName: p.candidate.profileDetails.fatherName,
            religion: p.candidate.profileDetails.religion,
            nationality: p.candidate.profileDetails.nationality,
            dateOfBirth: p.candidate.profileDetails.dateOfBirth,
            cnic: p.candidate.profileDetails.cnic,
            gender: p.candidate.profileDetails.gender,
            maritalStatus: p.candidate.profileDetails.maritalStatus,
            preferredCity: p.candidate.profileDetails.preferredCity,
            postalCode: p.candidate.profileDetails.postalCode,
            professionalGrade: p.candidate.profileDetails.professionalGrade,
            linkedinUrl: p.candidate.profileDetails.linkedinUrl,
            portfolioUrl: p.candidate.profileDetails.portfolioUrl,
            githubUrl: p.candidate.profileDetails.githubUrl,
            websiteUrl: p.candidate.profileDetails.websiteUrl,
            bio: p.candidate.profileDetails.bio,
            availability: p.candidate.profileDetails.availability,
            expectedSalary: p.candidate.profileDetails.expectedSalary,
            noticePeriod: p.candidate.profileDetails.noticePeriod,
            languages: p.candidate.profileDetails.languages,
            certifications: p.candidate.profileDetails.certifications,
            achievements: p.candidate.profileDetails.achievements,
            references: p.candidate.profileDetails.references
          } : null,
          jobPreference: p.candidate.jobPreference ? {
            firstPriority: p.candidate.jobPreference.firstPriority,
            secondPriority: p.candidate.jobPreference.secondPriority,
            thirdPriority: p.candidate.jobPreference.thirdPriority,
            summary: p.candidate.jobPreference.summary
          } : null
        },
        job: {
          id: p.job.id.toString(),
          title: p.job.title,
          company: p.job.company,
          description: p.job.description,
          industry: p.job.industry,
          employmentType: p.job.employmentType,
          minimumExperience: p.job.minimumExperience,
          minimumSalary: p.job.minimumSalary
        },
        application: {
          id: p.application?.id.toString(),
          status: p.application?.status,
          appliedAt: p.application?.appliedAt.toString()
        },
        status: p.overallStatus,
        lockState: p.lockState || 'NONE',
        currentStep: p.currentStepOrder,
        startedAt: p.startedAt.toString(),
        completedAt: p.completedAt?.toString(),
        steps: p.steps.map((s: any) => ({
          id: s.id.toString(),
          stepName: s.workflowStep.stepName,
          stepOrder: s.stepOrder,
          status: s.status,
          isRequired: s.workflowStep.isRequired,
          isSkippable: s.workflowStep.isSkippable,
          interviewer: null,
          feedback: s.feedback,
          startedAt: s.startedAt?.toString(),
          completedAt: s.completedAt?.toString(),
          interviews: s.interviews.map((i: any) => ({
            feedback: i.feedback,
            rating: i.rating,
            recommendation: i.recommendation,
            submittedAt: i.submittedAt?.toString()
          }))
        }))
      }
    })
  } catch (error: any) {
    console.error("Error fetching pipeline:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch pipeline" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const pipelineId = BigInt(params.id)
    const body = await req.json()
    const now = BigInt(Math.floor(Date.now() / 1000))

    const updateData: any = {
      updatedAt: now
    }

    if (body.status) {
      updateData.overallStatus = body.status
      if (body.status === 'COMPLETED' || body.status === 'REJECTED') {
        updateData.completedAt = now
      }
    }

    const pipeline = await prisma.candidatePipeline.update({
      where: { id: pipelineId },
      data: updateData,
      select: {
        id: true,
        overallStatus: true
      }
    })

    return NextResponse.json({
      success: true,
      pipeline: {
        id: pipeline.id.toString(),
        status: pipeline.overallStatus
      }
    })
  } catch (error: any) {
    console.error("Error updating pipeline:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update pipeline" },
      { status: 500 }
    )
  }
}

