import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

/** Round landing: the Offer round opens on Offers, every other round on Candidates. */
export default async function RoundIndexPage({ params }: { params: { id: string; roundId: string } }) {
  if (!/^\d+$/.test(params.roundId)) redirect(`/admin/jobs/${params.id}`)
  const step = await prisma.workflowStep.findUnique({ where: { id: BigInt(params.roundId) }, select: { stepType: true } })
  if (!step) redirect(`/admin/jobs/${params.id}`)
  redirect(`/admin/jobs/${params.id}/rounds/${params.roundId}/${step.stepType === "OFFER" ? "offers" : "candidates"}`)
}
