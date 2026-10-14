import { redirect } from "next/navigation"

/** "In Round" and "Results" were merged into the round's Candidates tab. */
export default function LegacyRoundTab({ params }: { params: { id: string; roundId: string } }) {
  redirect(`/admin/jobs/${params.id}/rounds/${params.roundId}`)
}
