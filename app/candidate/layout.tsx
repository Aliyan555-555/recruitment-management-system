import { MandatoryAssessmentGate } from "@/components/candidate/MandatoryAssessmentGate"

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MandatoryAssessmentGate>{children}</MandatoryAssessmentGate>
}
