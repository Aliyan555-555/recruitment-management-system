/** Human-readable labels for application / queue statuses (DB enums unchanged). */

export function formatApplicationStatus(status: string): string {
  switch (status) {
    case "APPLIED":
    case "SUBMITTED":
      return "Needs review"
    case "SHORTLISTED":
    case "BATCH_ASSIGNED":
      return "Shortlisted"
    case "REMOVED":
      return "Rejected"
    default:
      return status.replace(/_/g, " ")
  }
}

export function formatStepStatus(status: string): string {
  switch (status) {
    case "PENDING":
      return "Needs review"
    case "IN_PROGRESS":
      return "In round"
    case "COMPLETED":
      return "Completed"
    case "REJECTED":
      return "Rejected"
    default:
      return status.replace(/_/g, " ")
  }
}
