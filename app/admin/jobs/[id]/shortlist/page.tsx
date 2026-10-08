import { redirect } from "next/navigation"

// Manual and AI shortlisting now live on the unified Applicants page.
export default function Page({ params }: { params: { id: string } }) {
  redirect(`/admin/jobs/${params.id}/applicants`)
}
