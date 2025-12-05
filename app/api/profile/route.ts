import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        educations: {
          include: {
            educationLevel: {
              select: { id: true, name: true }
            },
            instituteRef: {
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
        profileDetails: true,
        jobPreference: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id.toString(),
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone1: user.phone1,
        phone2: user.phone2,
        institution: user.institution,
        department: user.department,
        address: user.address,
        city: user.city,
        country: user.country,
        educations: user.educations.map(edu => ({
          id: edu.id.toString(),
          degreeTitle: edu.degreeTitle,
          educationLevelId: edu.educationLevelId.toString(),
          educationLevel: edu.educationLevel,
          institute: edu.institute,
          instituteId: edu.instituteId?.toString(),
          majorSubject: edu.majorSubject,
          grade: edu.grade,
          passingYear: edu.passingYear,
          country: edu.country
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
          fatherName: user.profileDetails.fatherName,
          religion: user.profileDetails.religion,
          nationality: user.profileDetails.nationality,
          dateOfBirth: user.profileDetails.dateOfBirth,
          cnic: user.profileDetails.cnic,
          gender: user.profileDetails.gender,
          maritalStatus: user.profileDetails.maritalStatus,
          preferredCity: user.profileDetails.preferredCity,
          postalCode: user.profileDetails.postalCode,
          professionalGrade: user.profileDetails.professionalGrade,
          linkedinUrl: user.profileDetails.linkedinUrl,
          portfolioUrl: user.profileDetails.portfolioUrl,
          githubUrl: user.profileDetails.githubUrl,
          websiteUrl: user.profileDetails.websiteUrl,
          bio: user.profileDetails.bio,
          availability: user.profileDetails.availability,
          expectedSalary: user.profileDetails.expectedSalary,
          noticePeriod: user.profileDetails.noticePeriod,
          languages: user.profileDetails.languages,
          certifications: user.profileDetails.certifications,
          achievements: user.profileDetails.achievements,
          references: user.profileDetails.references
        } : null,
        jobPreference: user.jobPreference ? {
          firstPriority: user.jobPreference.firstPriority,
          secondPriority: user.jobPreference.secondPriority,
          thirdPriority: user.jobPreference.thirdPriority,
          summary: user.jobPreference.summary
        } : null
      }
    })
  } catch (error: any) {
    console.error("Profile fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = BigInt(session.user.id)
    const body = await req.json()
    const now = BigInt(Math.floor(Date.now() / 1000))

    // Update basic user info
    const userUpdate: any = {
      updatedAt: now
    }

    if (body.firstName !== undefined) userUpdate.firstname = body.firstName
    if (body.lastName !== undefined) userUpdate.lastname = body.lastName
    if (body.phone1 !== undefined) userUpdate.phone1 = body.phone1 || null
    if (body.phone2 !== undefined) userUpdate.phone2 = body.phone2 || null
    if (body.institution !== undefined) userUpdate.institution = body.institution || null
    if (body.department !== undefined) userUpdate.department = body.department || null
    if (body.address !== undefined) userUpdate.address = body.address || null
    if (body.city !== undefined) userUpdate.city = body.city || null
    if (body.country !== undefined) userUpdate.country = body.country || null

    await prisma.user.update({
      where: { id: userId },
      data: userUpdate
    })

    // Update or create profile details
    if (body.profileDetails) {
      const profileUpdate: any = {
        updatedAt: now
      }

      const pd = body.profileDetails
      if (pd.title !== undefined) profileUpdate.title = pd.title || null
      if (pd.fatherName !== undefined) profileUpdate.fatherName = pd.fatherName || null
      if (pd.religion !== undefined) profileUpdate.religion = pd.religion || null
      if (pd.nationality !== undefined) profileUpdate.nationality = pd.nationality || null
      if (pd.dateOfBirth !== undefined) profileUpdate.dateOfBirth = pd.dateOfBirth || null
      if (pd.cnic !== undefined) profileUpdate.cnic = pd.cnic || null
      if (pd.gender !== undefined) profileUpdate.gender = pd.gender || null
      if (pd.maritalStatus !== undefined) profileUpdate.maritalStatus = pd.maritalStatus || null
      if (pd.preferredCity !== undefined) profileUpdate.preferredCity = pd.preferredCity || null
      if (pd.postalCode !== undefined) profileUpdate.postalCode = pd.postalCode || null
      if (pd.professionalGrade !== undefined) profileUpdate.professionalGrade = pd.professionalGrade || null
      if (pd.linkedinUrl !== undefined) profileUpdate.linkedinUrl = pd.linkedinUrl || null
      if (pd.portfolioUrl !== undefined) profileUpdate.portfolioUrl = pd.portfolioUrl || null
      if (pd.githubUrl !== undefined) profileUpdate.githubUrl = pd.githubUrl || null
      if (pd.websiteUrl !== undefined) profileUpdate.websiteUrl = pd.websiteUrl || null
      if (pd.bio !== undefined) profileUpdate.bio = pd.bio || null
      if (pd.availability !== undefined) profileUpdate.availability = pd.availability || null
      if (pd.expectedSalary !== undefined) profileUpdate.expectedSalary = pd.expectedSalary || null
      if (pd.noticePeriod !== undefined) profileUpdate.noticePeriod = pd.noticePeriod || null
      if (pd.languages !== undefined) profileUpdate.languages = pd.languages || null
      if (pd.certifications !== undefined) profileUpdate.certifications = pd.certifications || null
      if (pd.achievements !== undefined) profileUpdate.achievements = pd.achievements || null
      if (pd.references !== undefined) profileUpdate.references = pd.references || null

      await prisma.userProfileDetail.upsert({
        where: { userId },
        update: profileUpdate,
        create: {
          userId,
          ...profileUpdate,
          createdAt: now
        }
      })
    }

    // Update job preference
    if (body.jobPreference) {
      const prefUpdate: any = {
        updatedAt: now
      }

      const jp = body.jobPreference
      if (jp.firstPriority !== undefined) prefUpdate.firstPriority = jp.firstPriority || null
      if (jp.secondPriority !== undefined) prefUpdate.secondPriority = jp.secondPriority || null
      if (jp.thirdPriority !== undefined) prefUpdate.thirdPriority = jp.thirdPriority || null
      if (jp.summary !== undefined) prefUpdate.summary = jp.summary || null

      await prisma.userJobPreference.upsert({
        where: { userId },
        update: prefUpdate,
        create: {
          userId,
          ...prefUpdate,
          createdAt: now
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Profile update error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 500 }
    )
  }
}

