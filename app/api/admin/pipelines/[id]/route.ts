import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"

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
            interviewer: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true
              }
            },
            interviews: {
              include: {
                interviewer: {
                  select: {
                    firstname: true,
                    lastname: true
                  }
                }
              }
            }
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

    return NextResponse.json({
      pipeline: {
        id: pipeline.id.toString(),
        candidate: {
          id: pipeline.candidate.id.toString(),
          name: `${pipeline.candidate.firstname} ${pipeline.candidate.lastname}`,
          firstname: pipeline.candidate.firstname,
          lastname: pipeline.candidate.lastname,
          email: pipeline.candidate.email,
          phone: pipeline.candidate.phone1,
          phone2: pipeline.candidate.phone2,
          address: pipeline.candidate.address,
          city: pipeline.candidate.city,
          country: pipeline.candidate.country,
          location: `${pipeline.candidate.city || ''}, ${pipeline.candidate.country || ''}`.trim(),
          institution: pipeline.candidate.institution,
          department: pipeline.candidate.department,
          experiences: pipeline.candidate.experiences.map(exp => ({
            id: exp.id.toString(),
            jobTitle: exp.jobTitle,
            company: exp.company,
            location: exp.location,
            startDate: exp.startDate,
            endDate: exp.endDate,
            isCurrent: exp.isCurrent,
            createdAt: exp.createdAt.toString()
          })),
          educations: pipeline.candidate.educations.map(edu => ({
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
          skills: pipeline.candidate.skills.map(skill => ({
            id: skill.id.toString(),
            skillName: skill.skillName,
            level: skill.level,
            createdAt: skill.createdAt.toString()
          })),
          profileDetails: pipeline.candidate.profileDetails ? {
            title: pipeline.candidate.profileDetails.title,
            fatherName: pipeline.candidate.profileDetails.fatherName,
            religion: pipeline.candidate.profileDetails.religion,
            nationality: pipeline.candidate.profileDetails.nationality,
            dateOfBirth: pipeline.candidate.profileDetails.dateOfBirth,
            cnic: pipeline.candidate.profileDetails.cnic,
            gender: pipeline.candidate.profileDetails.gender,
            maritalStatus: pipeline.candidate.profileDetails.maritalStatus,
            preferredCity: pipeline.candidate.profileDetails.preferredCity,
            postalCode: pipeline.candidate.profileDetails.postalCode,
            professionalGrade: pipeline.candidate.profileDetails.professionalGrade,
            linkedinUrl: pipeline.candidate.profileDetails.linkedinUrl,
            portfolioUrl: pipeline.candidate.profileDetails.portfolioUrl,
            githubUrl: pipeline.candidate.profileDetails.githubUrl,
            websiteUrl: pipeline.candidate.profileDetails.websiteUrl,
            bio: pipeline.candidate.profileDetails.bio,
            availability: pipeline.candidate.profileDetails.availability,
            expectedSalary: pipeline.candidate.profileDetails.expectedSalary,
            noticePeriod: pipeline.candidate.profileDetails.noticePeriod,
            languages: pipeline.candidate.profileDetails.languages,
            certifications: pipeline.candidate.profileDetails.certifications,
            achievements: pipeline.candidate.profileDetails.achievements,
            references: pipeline.candidate.profileDetails.references
          } : null,
          jobPreference: pipeline.candidate.jobPreference ? {
            firstPriority: pipeline.candidate.jobPreference.firstPriority,
            secondPriority: pipeline.candidate.jobPreference.secondPriority,
            thirdPriority: pipeline.candidate.jobPreference.thirdPriority,
            summary: pipeline.candidate.jobPreference.summary
          } : null
        },
        job: {
          id: pipeline.job.id.toString(),
          title: pipeline.job.title,
          company: pipeline.job.company,
          description: pipeline.job.description,
          industry: pipeline.job.industry,
          employmentType: pipeline.job.employmentType,
          minimumExperience: pipeline.job.minimumExperience,
          minimumSalary: pipeline.job.minimumSalary
        },
        application: {
          status: pipeline.application.status,
          appliedAt: pipeline.application.appliedAt.toString()
        },
        status: pipeline.overallStatus,
        lockState: (pipeline as any).lockState || 'NONE',
        currentStep: pipeline.currentStepOrder,
        startedAt: pipeline.startedAt.toString(),
        completedAt: pipeline.completedAt?.toString(),
        steps: pipeline.steps.map(s => ({
          id: s.id.toString(),
          stepName: s.workflowStep.stepName,
          stepOrder: s.stepOrder,
          status: s.status,
          isRequired: s.workflowStep.isRequired,
          isSkippable: s.workflowStep.isSkippable,
          interviewer: s.interviewer ? {
            name: `${s.interviewer.firstname} ${s.interviewer.lastname}`,
            email: s.interviewer.email
          } : null,
          feedback: s.feedback,
          startedAt: s.startedAt?.toString(),
          completedAt: s.completedAt?.toString(),
          interviews: s.interviews.map(i => ({
            interviewerName: `${i.interviewer.firstname} ${i.interviewer.lastname}`,
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

