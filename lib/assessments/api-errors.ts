import { NextResponse } from "next/server"
import { SkillAssessmentConfigError } from "@/lib/assessments/config"
import { AssessmentGenerationError } from "@/lib/ai/assessment-generator"

export function assessmentConfigUnavailableResponse() {
  return NextResponse.json(
    {
      error:
        "Skill assessments are temporarily unavailable. Configuration is missing — please contact support.",
      code: "ASSESSMENT_CONFIG_UNAVAILABLE",
    },
    { status: 503 }
  )
}

export function isAssessmentConfigError(error: unknown): boolean {
  return error instanceof SkillAssessmentConfigError
}

export function isAssessmentGenerationError(error: unknown): boolean {
  return error instanceof AssessmentGenerationError
}
