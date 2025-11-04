import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Navbar } from "@/components/Navbar"
import { ProfileForm } from "@/components/ProfileForm"

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    include: {
      educations: {
        include: {
          educationLevel: true,
          instituteRef: true
        }
      },
      skills: true,
      cvs: {
        where: { deletedAt: null },
        orderBy: { updatedAt: 'desc' }
      }
    }
  })

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-arme py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground mt-2">
            Complete your profile to improve your job application success
          </p>
        </div>

        <ProfileForm user={user} />
      </main>
    </div>
  )
}

