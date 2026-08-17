import { NextResponse } from "next/server"
import { ShortlistEvaluationError } from "@/lib/ai/shortlist-evaluator"

export function isShortlistEvaluationError(error: unknown): boolean {
  return error instanceof ShortlistEvaluationError
}

export function shortlistEvaluationErrorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "AI Shortlisting evaluation failed"
  return NextResponse.json(
    {
      error: message,
      code: "AI_SHORTLIST_EVALUATION_ERROR",
    },
    { status: 502 }
  )
}
