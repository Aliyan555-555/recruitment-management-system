import { prisma } from "@/lib/prisma"
import {
  eligibilityFromApplication,
  ShortlistIneligibleError,
  SHORTLIST_PIPELINE_SELECT,
} from "@/lib/admin/shortlist-eligibility"
import { logApplicantAudit } from "@/lib/services/applicant-audit"

export const MAX_APPLICANT_NOTE_LENGTH = 2000

/** Marks (or clears) the soft "Maybe" flag. Only candidates still at the shortlist gate qualify. */
export async function setMaybeFlag(
  jobId: bigint,
  candidateIds: bigint[],
  maybe: boolean,
  adminId: bigint
): Promise<void> {
  const applications = await prisma.jobsApplied.findMany({
    where: { jobId, userId: { in: candidateIds } },
    include: { pipeline: { select: { ...SHORTLIST_PIPELINE_SELECT, id: true } } },
  })
  const found = new Set(applications.map((a) => a.userId.toString()))
  const ineligible = [
    ...candidateIds.filter((id) => !found.has(id.toString())).map(String),
    ...applications.filter((a) => !eligibilityFromApplication(a).actionable).map((a) => a.userId.toString()),
  ]
  if (ineligible.length > 0) throw new ShortlistIneligibleError(ineligible)

  const now = BigInt(Math.floor(Date.now() / 1000))
  await prisma.jobsApplied.updateMany({
    where: { jobId, userId: { in: candidateIds } },
    data: { reviewFlag: maybe ? "MAYBE" : null, reviewedBy: adminId, reviewedAt: now },
  })
  await logApplicantAudit(
    applications
      .filter((a) => (a.reviewFlag === "MAYBE") !== maybe)
      .map((a) => ({
        applicationId: a.id,
        pipelineId: a.pipeline?.id ?? null,
        action: "UPDATED" as const,
        changes: { jobId: jobId.toString(), field: "reviewFlag", from: a.reviewFlag, to: maybe ? "MAYBE" : null },
      })),
    adminId
  )
}

export async function updateApplicantNote(
  jobId: bigint,
  candidateId: bigint,
  note: string,
  adminId: bigint
): Promise<{ note: string | null } | null> {
  const app = await prisma.jobsApplied.findUnique({
    where: { jobId_userId: { jobId, userId: candidateId } },
    select: { id: true, note: true, pipeline: { select: { id: true } } },
  })
  if (!app) return null
  const next = note.trim() ? note.trim().slice(0, MAX_APPLICANT_NOTE_LENGTH) : null
  if (next === app.note) return { note: next }

  await prisma.jobsApplied.update({ where: { id: app.id }, data: { note: next } })
  await logApplicantAudit(
    [
      {
        applicationId: app.id,
        pipelineId: app.pipeline?.id ?? null,
        action: "UPDATED",
        changes: { jobId: jobId.toString(), field: "note", from: app.note, to: next },
      },
    ],
    adminId
  )
  return { note: next }
}
