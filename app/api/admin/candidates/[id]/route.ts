import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET /api/admin/candidates/[id] - Get candidate information
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const candidate = await prisma.user.findUnique({
      where: { id: BigInt(params.id) },
      include: {
        profileDetails: true,
        educations: {
          include: {
            educationLevel: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        experiences: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        jobPreference: true
      }
    })

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
    }

    const latestEducation = candidate.educations[0]
    const latestExperience = candidate.experiences[0]

    return NextResponse.json({
      id: candidate.id.toString(),
      firstname: candidate.firstname,
      lastname: candidate.lastname,
      email: candidate.email,
      phone: candidate.phone1,
      education: latestEducation ? 
        `${latestEducation.educationLevel.name} - ${latestEducation.degreeTitle}` : "",
      institution: latestEducation?.institute || "",
      lastEmployer: latestExperience?.company || "",
      lastAssignment: latestExperience?.jobTitle || "",
      expectedSalary: candidate.profileDetails?.expectedSalary || "",
      totalExperience: latestExperience ? 
        `${latestExperience.startDate} - ${latestExperience.endDate || "Present"}` : "",
      bio: candidate.profileDetails?.bio,
      professionalGrade: candidate.profileDetails?.professionalGrade,
    })
  } catch (error) {
    console.error("Error fetching candidate:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
