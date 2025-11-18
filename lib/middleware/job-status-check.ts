import { prisma } from "@/lib/prisma"

/**
 * Ensure job status is current based on end date
 * Called before job-related operations as a fallback
 */
export async function ensureJobStatusCurrent(jobId: bigint): Promise<boolean> {
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        jobType: true,
        jobStatus: true,
        postTo: true
      }
    })

    if (!job) {
      return false
    }

    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const endDate = new Date(job.postTo)
    endDate.setHours(0, 0, 0, 0)

    // If end date has passed and status needs update
    if (endDate < now && job.jobStatus !== "ADMIN_SHORTLISTING" && job.jobStatus !== "CLOSED") {
      const newStatus = job.jobType === "BULK" ? "ADMIN_SHORTLISTING" : "CLOSED"
      
      await prisma.job.update({
        where: { id: job.id },
        data: {
          jobStatus: newStatus,
          updatedAt: BigInt(Math.floor(Date.now() / 1000))
        }
      })

      return true
    }

    return false
  } catch (error) {
    console.error("Error ensuring job status current:", error)
    return false
  }
}

