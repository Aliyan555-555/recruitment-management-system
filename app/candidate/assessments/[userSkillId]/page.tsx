"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { formatSkillPercentage } from "@/lib/assessments/level-display"

type AssessmentQuestion = {
  id: string
  question: string
  options: string[]
  points: number
  order: number
}

type AssessmentSession = {
  id: string
  userSkillId: string
  skillName: string
  status: string
  attemptNumber: number
  minPoints: number
  maxPoints: number
  totalPoints: number
  startedAt: string
  expiresAt: string | null
}

export default function TakeSkillAssessmentPage({
  params,
}: {
  params: { userSkillId: string }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const existingAssessmentId = searchParams.get("assessmentId")

  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [skillName, setSkillName] = useState("")
  const [assessment, setAssessment] = useState<AssessmentSession | null>(null)
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{
    passed: boolean
    message: string
    scorePercentage: number | null
    scoredPoints: number | null
    maxPoints: number
    canReattempt: boolean
    cooldownEndsAt: string | null
    cycleUnlocksAt: string | null
    attemptsUsedInCycle: number | null
    maxAttempts: number | null
    assessmentId: string
  } | null>(null)

  const currentQuestion = questions[currentIndex]
  const progressPercent =
    questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0

  const allAnswered = useMemo(
    () => questions.length > 0 && questions.every((q) => answers[q.id]),
    [questions, answers]
  )

  const loadAssessment = useCallback(
    async (assessmentId: string) => {
      const res = await fetch(`/api/assessments/${assessmentId}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to load assessment")
      }

      const payload = data.assessment
      setSkillName(payload.skillName)
      setAssessment({
        id: payload.id,
        userSkillId: payload.userSkillId,
        skillName: payload.skillName,
        status: payload.status,
        attemptNumber: payload.attemptNumber,
        minPoints: payload.minPoints,
        maxPoints: payload.maxPoints,
        totalPoints: payload.totalPoints,
        startedAt: payload.startedAt,
        expiresAt: payload.expiresAt,
      })
      setQuestions(payload.questions || [])

      if (payload.status === "PASSED" || payload.status === "FAILED") {
        setResult({
          passed: payload.passed,
          message: payload.message,
          scorePercentage: payload.scorePercentage,
          scoredPoints: payload.scoredPoints,
          maxPoints: payload.maxPoints,
          canReattempt: false,
          cooldownEndsAt: null,
          cycleUnlocksAt: null,
          attemptsUsedInCycle: null,
          maxAttempts: null,
          assessmentId: payload.id,
        })
      }
    },
    []
  )

  const startAssessment = useCallback(async () => {
    setStarting(true)
    try {
      const res = await fetch("/api/assessments/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userSkillId: params.userSkillId }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to start assessment")
      }

      setSkillName(data.assessment.skillName)
      setAssessment(data.assessment)
      setQuestions(data.questions || [])
      setCurrentIndex(0)
      setAnswers({})
      setResult(null)

      router.replace(
        `/candidate/assessments/${params.userSkillId}?assessmentId=${data.assessment.id}`
      )
    } catch (error: any) {
      toast.error(error.message || "Could not start assessment")
    } finally {
      setStarting(false)
    }
  }, [params.userSkillId, router])

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)

        if (existingAssessmentId) {
          await loadAssessment(existingAssessmentId)
          return
        }

        const statusRes = await fetch("/api/assessments/skills/status")
        const statusData = await statusRes.json()
        const skill = statusData.skills?.find(
          (item: { userSkillId: string }) => item.userSkillId === params.userSkillId
        )

        if (!skill) {
          throw new Error("Skill not found")
        }

        setSkillName(skill.skillName)

        if (skill.inProgressAssessmentId) {
          await loadAssessment(skill.inProgressAssessmentId)
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to load assessment")
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [existingAssessmentId, loadAssessment, params.userSkillId])

  const handleSelectOption = (option: string) => {
    if (!currentQuestion) return
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }))
  }

  const handleSubmit = async () => {
    if (!assessment || !allAnswered) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/assessments/${assessment.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((question) => ({
            questionId: question.id,
            selectedOption: answers[question.id],
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit assessment")
      }

      setResult({
        passed: data.passed,
        message: data.message,
        scorePercentage: data.assessment.scorePercentage,
        scoredPoints: data.assessment.scoredPoints,
        maxPoints: data.assessment.maxPoints,
        canReattempt: data.canReattempt,
        cooldownEndsAt: data.cooldownEndsAt,
        cycleUnlocksAt: data.cycleUnlocksAt ?? null,
        attemptsUsedInCycle: data.attemptsUsedInCycle ?? null,
        maxAttempts: data.maxAttempts ?? null,
        assessmentId: data.assessment.id,
      })
    } catch (error: any) {
      toast.error(error.message || "Could not submit assessment")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (result) {
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
            <CardTitle>{skillName} Assessment Result</CardTitle>
            <CardDescription>
              {result.passed && result.scorePercentage != null && result.scorePercentage >= 40
                ? `You scored ${result.scorePercentage}% on this assessment.`
                : result.cycleUnlocksAt
                  ? "You used all attempts in this cycle. Learn during the waiting period, then try again."
                  : "Keep building — you can try again when eligible."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className={`rounded-lg border p-4 ${
                result.passed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
                  : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
              }`}
            >
              <p className="text-sm leading-relaxed">{result.message}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Score</p>
                <p className="mt-1 text-2xl font-semibold">
                  {result.scoredPoints ?? 0} / {result.maxPoints}
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Skill Percentage</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatSkillPercentage(result.scorePercentage)}
                </p>
                {result.attemptsUsedInCycle != null && result.maxAttempts != null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Attempts this cycle: {result.attemptsUsedInCycle}/{result.maxAttempts}
                  </p>
                )}
              </div>
            </div>

            {result.cycleUnlocksAt && (
              <p className="text-sm text-muted-foreground">
                Next 3 attempts unlock after the 7-day learning period.
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href={`/candidate/assessments/${params.userSkillId}/result/${result.assessmentId}`}>
                  View details
                </Link>
              </Button>
              <Button asChild>
                <Link href="/candidate/profile/edit">Back to profile</Link>
              </Button>
              {!result.passed && result.canReattempt && (
                <Button
                  onClick={() => {
                    setResult(null)
                    setAssessment(null)
                    setQuestions([])
                    router.replace(`/candidate/assessments/${params.userSkillId}`)
                    startAssessment()
                  }}
                >
                  Re-attempt Assessment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!assessment) {
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
            <CardTitle>AI Skill Assessment</CardTitle>
            <CardDescription>
              Verify your proficiency in <strong>{skillName}</strong> with an AI-generated
              multiple-choice assessment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Questions are generated fresh for each attempt.</li>
              <li>Complete the assessment in one sitting before the session expires.</li>
              <li>Your verified level is shown on your profile when you pass.</li>
            </ul>
            <Button onClick={startAssessment} disabled={starting}>
              {starting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating questions...
                </>
              ) : (
                "Start Assessment"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <Button asChild variant="ghost" className="pl-0">
        <Link href="/candidate/profile/edit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to profile
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{skillName} Assessment</CardTitle>
              <CardDescription>
                Question {currentIndex + 1} of {questions.length}
              </CardDescription>
            </div>
            <Badge variant="secondary">Attempt {assessment.attemptNumber}</Badge>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-secondary">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentQuestion && (
            <>
              <div>
                <p className="text-lg font-medium leading-relaxed">
                  {currentQuestion.question}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Worth {currentQuestion.points} points
                </p>
              </div>

              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const selected = answers[currentQuestion.id] === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSelectOption(option)}
                      className={`w-full rounded-lg border p-4 text-left transition-colors ${
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>{option}</span>
                        {selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                {currentIndex < questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    disabled={!answers[currentQuestion.id]}
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Assessment"
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
