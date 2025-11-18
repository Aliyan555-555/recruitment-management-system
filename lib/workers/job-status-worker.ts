import { checkAndUpdateJobStatuses } from "@/lib/services/job-status-monitor"

/**
 * Background worker for checking and updating job statuses
 * This should be called by a cron job or scheduled task
 */
export async function runJobStatusCheck(): Promise<{
  success: boolean
  updated: number
  errors: string[]
}> {
  try {
    const result = await checkAndUpdateJobStatuses()
    
    if (result.errors.length > 0) {
      console.error("Job status check completed with errors:", result.errors)
    } else {
      console.log(`Job status check completed: ${result.updated} jobs updated`)
    }

    return {
      success: result.errors.length === 0,
      updated: result.updated,
      errors: result.errors
    }
  } catch (error: any) {
    console.error("Error running job status check:", error)
    return {
      success: false,
      updated: 0,
      errors: [error.message || "Unknown error"]
    }
  }
}

