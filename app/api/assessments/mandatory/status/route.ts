import { NextResponse } from "next/server"
import { requireCandidate } from "@/lib/rbac"
import { getMandatoryAssessmentStatus } from "@/lib/assessments/mandatory"
import {
  assessmentConfigUnavailableResponse,
  isAssessmentConfigError,
} from "@/lib/assessments/api-errors"

export async function GET() {
  try {
    const user = await requireCandidate()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Candidate access required" },
        { status: 401 }
      )
    }

    const status = await getMandatoryAssessmentStatus(BigInt(user.id))

    return NextResponse.json(status)
  } catch (error) {
    if (isAssessmentConfigError(error)) {
      return assessmentConfigUnavailableResponse()
    }

    console.error("Get mandatory assessment status error:", error)
    return NextResponse.json(
      { error: "Failed to fetch mandatory assessment status" },
      { status: 500 }
    )
  }
}
