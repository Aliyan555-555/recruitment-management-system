import { prisma } from "@/lib/prisma"

/**
 * Check and update job statuses based on end dates
 * - Bulk jobs: ACTIVE -> ADMIN_SHORTLISTING when postTo date passes
 * - Normal jobs: ACTIVE -> CLOSED when postTo date passes
 */
export async function checkAndUpdateJobStatuses(): Promise<{
  updated: number
  errors: string[]
}> {
  const errors: string[] = []
  let updated = 0
  const now = new Date()
  now.setHours(0, 0, 0, 0) // Set to midnight for date comparison

  try {
    // Find jobs that need status updates
    const jobsToUpdate = await prisma.job.findMany({
      where: {
        postTo: {
          lt: now
        },
        jobStatus: {
          not: "ADMIN_SHORTLISTING"
        },
        deletedAt: null
      },
      select: {
        id: true,
        jobType: true,
        jobStatus: true,
        title: true
      }
    })

    for (const job of jobsToUpdate) {
      try {
        const newStatus = job.jobType === "BULK" ? "ADMIN_SHORTLISTING" : "CLOSED"
        
        if (job.jobStatus === newStatus) {
          continue // Already in correct status
        }

        await prisma.job.update({
          where: { id: job.id },
          data: {
            jobStatus: newStatus,
            updatedAt: BigInt(Math.floor(Date.now() / 1000))
          }
        })

        // Create audit log
        const admins = await prisma.user.findMany({
          where: { role: "ADMIN" },
          select: { id: true },
          take: 1
        })

        if (admins.length > 0) {
          await prisma.auditLog.create({
            data: {
              userId: admins[0].id,
              action: "UPDATED",
              entityType: "job",
              entityId: job.id,
              changes: `Job status automatically updated from ${job.jobStatus} to ${newStatus} due to end date`,
              timestamp: BigInt(Math.floor(Date.now() / 1000))
            } as any
          })
        }

        updated++
      } catch (error: any) {
        errors.push(`Failed to update job ${job.id} (${job.title}): ${error.message}`)
      }
    }

    return { updated, errors }
  } catch (error: any) {
    errors.push(`Error checking job statuses: ${error.message}`)
    return { updated, errors }
  }
}

