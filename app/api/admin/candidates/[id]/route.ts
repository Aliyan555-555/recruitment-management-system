import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/rbac"

// GET /api/admin/candidates/[id] - Get candidate information
export async function GET(
  request: NextRequest,
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
