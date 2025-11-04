import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Navbar } from "@/components/Navbar"
import { JobDetails } from "@/components/JobDetails"

export default async function JobDetailsPage({
  params
}: {
  params: { id: string }
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const jobId = BigInt(params.id)

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      skills: true,
      educationRequirements: {
        include: {
          educationLevel: true
        }
      },
      locations: {
        select: {
          city: true,
          country: true
        }
      },
      creator: {
        select: {
          firstname: true,
          lastname: true,
          email: true
        }
      },
      applications: {
        where: { userId: BigInt(session.user.id) },
        include: {
          cv: true
        }
      }
    }
  })

  if (!job) {
    redirect("/jobs")
  }

  // Check if user has already applied
  const hasApplied = job.applications.length > 0
  const userApplication = hasApplied ? job.applications[0] : null

  // Get user's CVs for application
  const userCvs = await prisma.cvManagerCv.findMany({
    where: {
      userId: BigInt(session.user.id),
      deletedAt: null
    },
    orderBy: { updatedAt: "desc" }
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <JobDetails
          job={{
            id: job.id.toString(),
            title: job.title,
            company: job.company,
            shortDescription: job.shortDescription || "",
            description: job.description || "",
            locations: job.locations?.map(loc => ({ city: loc.city, country: loc.country })),
            employmentType: job.employmentType,
            employmentShift: job.employmentShift,
            minimumExperience: job.minimumExperience,
            certification: job.certification || undefined,
            minimumSalary: job.minimumSalary || undefined,
            benefits: job.benefits || undefined,
            totalPositions: job.totalPositions || undefined,
            jobCode: job.jobCode || undefined,
            postFrom: job.postFrom,
            postTo: job.postTo,
            skills: job.skills.map((s: any) => s.skillName),
            minimumEducation: job.educationRequirements?.[0]?.educationLevel?.name || undefined,
            createdBy: `${job.creator.firstname} ${job.creator.lastname}`,
            creatorEmail: job.creator.email
          }}
          hasApplied={hasApplied}
          application={userApplication ? {
            id: userApplication.id.toString(),
            status: userApplication.status,
            appliedAt: userApplication.appliedAt,
            cv: {
              id: userApplication.cv.id.toString(),
              filename: userApplication.cv.filename
            }
          } : null}
          userCvs={userCvs.map(cv => ({
            id: cv.id.toString(),
            filename: cv.filename,
            filepath: cv.filepath
          }))}
        />
      </main>
    </div>
  )
}

