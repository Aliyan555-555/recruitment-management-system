"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { formatSkillPercentage } from "@/lib/assessments/level-display"

type AssessmentDetail = {
  id: string
  skillName: string
  status: string
  passed: boolean
  attemptNumber: number
  scoredPoints: number | null
  maxPoints: number
  minPoints: number
  scorePercentage: number | null
  message: string
  submittedAt: string | null
}

export default function SkillAssessmentResultPage({
  params,
}: {
  params: { userSkillId: string; assessmentId: string }
}) {
  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null)

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await fetch(`/api/assessments/${params.assessmentId}`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "Failed to load assessment result")
        }

        const payload = data.assessment
        setAssessment({
          id: payload.id,
          skillName: payload.skillName,
          status: payload.status,
          passed: payload.passed,
          attemptNumber: payload.attemptNumber,
          scoredPoints: payload.scoredPoints,
          maxPoints: payload.maxPoints,
          minPoints: payload.minPoints,
          scorePercentage: payload.scorePercentage,
          message: payload.message,
          submittedAt: payload.submittedAt,
        })
      } catch (error: any) {
        toast.error(error.message || "Failed to load result")
      } finally {
        setLoading(false)
      }
    }

    fetchResult()
  }, [params.assessmentId])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="mx-auto max-w-2xl py-8 text-center">
        <p className="text-muted-foreground">Assessment result not found.</p>
        <Button asChild className="mt-4">
          <Link href="/candidate/profile/edit">Back to profile</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
        <Button asChild variant="ghost" className="pl-0">
        <Link href="/candidate/profile/edit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to profile
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{assessment.skillName} — Attempt {assessment.attemptNumber}</CardTitle>
          <CardDescription>Assessment summary</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className={`rounded-lg border p-4 ${
              assessment.passed
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
                : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
            }`}
          >
            <p className="text-sm leading-relaxed">{assessment.message}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Score</p>
              <p className="mt-1 text-2xl font-semibold">
                {assessment.scoredPoints ?? 0} / {assessment.maxPoints}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Minimum to pass: {assessment.minPoints}
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Skill Percentage</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatSkillPercentage(assessment.scorePercentage)}
              </p>
              {assessment.submittedAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Submitted {new Date(Number(assessment.submittedAt) * 1000).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {!assessment.passed && (
              <Button asChild>
                <Link href={`/candidate/assessments/${params.userSkillId}`}>
                  Re-attempt Assessment
                </Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/candidate/profile/edit">Back to profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
