import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Navbar } from "@/components/Navbar"
import { JobsList } from "@/components/JobsList"

export default async function JobsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const jobs = await prisma.job.findMany({
    where: {
      status: true,
      deletedAt: null,
      postTo: {
        gte: new Date()
      }
    },
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
          lastname: true
        }
      },
      _count: {
        select: {
          applications: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Browse Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Find your next career opportunity
          </p>
        </div>

        <JobsList jobs={jobs.map((job: any) => ({
          id: job.id.toString(),
          title: job.title,
          company: job.company,
          shortDescription: job.shortDescription,
          description: job.description || undefined,
          locations: job.locations?.map((loc: any) => ({ city: loc.city, country: loc.country || '' })),
          employmentType: job.employmentType,
          postFrom: new Date(job.postFrom),
          postTo: new Date(job.postTo),
          skills: job.skills.map((s: any) => s.skillName),
          minimumEducation: job.educationRequirements?.[0]?.educationLevel?.name || undefined,
          createdBy: `${job.creator.firstname} ${job.creator.lastname}`,
          applicationCount: job._count.applications
        }))} />
      </main>
    </div>
  )
}

