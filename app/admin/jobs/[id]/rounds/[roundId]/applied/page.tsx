import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

/**
 * The per-round "Needs Review" tab was removed. New applicants are reviewed once, on the job's Applicants page;
 * candidates who pass a round are admitted to the next one directly.
 */
export default async function LegacyNeedsReview({ params }: { params: { id: string; roundId: string } }) {
  const step = /^\d+$/.test(params.roundId)
    ? await prisma.workflowStep.findUnique({ where: { id: BigInt(params.roundId) }, select: { stepOrder: true } })
    : null
  if (step?.stepOrder === 1) redirect(`/admin/jobs/${params.id}/applicants`)
  redirect(`/admin/jobs/${params.id}/rounds/${params.roundId}`)
}
