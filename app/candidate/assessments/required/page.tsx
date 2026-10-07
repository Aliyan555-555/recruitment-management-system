import { redirect } from "next/navigation"

// Skill assessments are optional (they only improve the candidate profile).
// Kept so old links and bookmarks still land somewhere useful.
export default function RequiredAssessmentsPage() {
  redirect("/candidate/profile/edit")
}
