import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    // Allow authenticated users (admins, interviewers) to view candidate profiles
    // For public access, you might want to add additional checks
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const candidateId = BigInt(params.id)

    const user = await prisma.user.findUnique({
      where: { 
        id: candidateId,
        role: "CANDIDATE"
      },
      include: {
        educations: {
          include: {
            educationLevel: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        skills: {
          orderBy: { createdAt: "desc" }
        },
        experiences: {
          orderBy: { createdAt: "desc" }
        },
        profileDetails: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "Candidate profile not found" },
        { status: 404 }
      )
    }

    // Return public-safe profile data
    return NextResponse.json({
      user: {
        id: user.id.toString(),
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email, // Include email for authenticated viewers
        phone1: user.phone1,
        city: user.city,
        country: user.country,
        institution: user.institution,
        educations: user.educations.map(edu => ({
          id: edu.id.toString(),
          degreeTitle: edu.degreeTitle,
          educationLevel: edu.educationLevel,
          institute: edu.institute,
          majorSubject: edu.majorSubject,
          grade: edu.grade,
          passingYear: edu.passingYear
        })),
        skills: user.skills.map(skill => ({
          id: skill.id.toString(),
          skillName: skill.skillName,
          level: skill.level
        })),
        experiences: user.experiences.map(exp => ({
          id: exp.id.toString(),
          jobTitle: exp.jobTitle,
          company: exp.company,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate,
          isCurrent: exp.isCurrent
        })),
        profileDetails: user.profileDetails ? {
          title: user.profileDetails.title,
          professionalGrade: user.profileDetails.professionalGrade,
          linkedinUrl: user.profileDetails.linkedinUrl,
          portfolioUrl: user.profileDetails.portfolioUrl,
          githubUrl: user.profileDetails.githubUrl,
          websiteUrl: user.profileDetails.websiteUrl,
          bio: user.profileDetails.bio,
          availability: user.profileDetails.availability
        } : null
      }
    })
  } catch (error: any) {
    console.error("Public profile fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

