"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  ListChecks,
  Loader2,
  RotateCcw,
  Timer,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Question = { id: string; question: string; options: string[]; points: number; order: number }

type AttemptSummary = {
  id: string
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED"
  state: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
  questionCount: number
  timeLimitMinutes: number
  remainingSeconds: number
  scorePercent: number | null
}

type StatusResponse = {
  required: boolean
  state: "NOT_REQUIRED" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
  hasApplied?: boolean
  config?: { enabled: boolean; questionCount: number; timeLimitMinutes: number }
  attempt?: AttemptSummary | null
}

type Phase = "loading" | "intro" | "taking" | "result" | "unavailable" | "error"
type ApplyState = "idle" | "applying" | "applied" | "failed"

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export default function CandidateQuickTestPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.jobId as string

  const [phase, setPhase] = useState<Phase>("loading")
  const [message, setMessage] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusResponse | null>(null)

  const [attempt, setAttempt] = useState<AttemptSummary | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [current, setCurrent] = useState(0)

  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [applyState, setApplyState] = useState<ApplyState>("idle")
  const [applyError, setApplyError] = useState<string | null>(null)

  const deadlineRef = useRef<number>(0)
  const answersRef = useRef<Record<string, string>>({})
  const submittedRef = useRef(false)
  const saveFailedRef = useRef(false)

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  // ---- Initial status ------------------------------------------------------------------
  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/quick-test`)
      const data: StatusResponse & { error?: string } = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not load the quick test")

      setStatus(data)
      if (!data.required) {
        setPhase("unavailable")
        return
      }
      if (data.state === "COMPLETED") {
        if (data.hasApplied) {
          router.replace(`/jobs/${jobId}`)
          return
        }
        setAttempt(data.attempt ?? null)
        setPhase("result")
        return
      }
      if (data.state === "IN_PROGRESS") {
        // Resume right away (staying on the loading screen): the timer has been running since the first start.
        await startTest(true)
      } else {
        setPhase("intro")
      }
    } catch (err: any) {
      setMessage(err.message || "Could not load the quick test")
      setPhase("error")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, router])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  // ---- Start / resume ------------------------------------------------------------------
  async function startTest(resuming = false) {
    setStarting(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/quick-test/start`, { method: "POST" })
      const data = await res.json()

      if (!res.ok) {
        if (data.code === "ALREADY_APPLIED") {
          router.replace(`/jobs/${jobId}`)
          return
        }
        throw new Error(data.error || "Could not start the quick test")
      }

      const nextAttempt: AttemptSummary = data.attempt
      if (nextAttempt.state === "COMPLETED") {
        setAttempt(nextAttempt)
        setPhase("result")
        return
      }

      deadlineRef.current = Date.now() + nextAttempt.remainingSeconds * 1000
      setSecondsLeft(nextAttempt.remainingSeconds)
      setAttempt(nextAttempt)
      setQuestions(data.questions)
      setAnswers(data.savedAnswers ?? {})
      const firstUnanswered = (data.questions as Question[]).findIndex((q) => !(data.savedAnswers ?? {})[q.id])
      setCurrent(firstUnanswered === -1 ? 0 : firstUnanswered)
      setPhase("taking")
      if (resuming || data.resumed) {
        toast.info("Welcome back. Your saved answers are restored and the timer is still running.")
      }
    } catch (err: any) {
      toast.error(err.message || "Could not start the quick test")
      setMessage(err.message || "Could not start the quick test")
      setPhase((current) => (current === "loading" ? "error" : current))
    } finally {
      setStarting(false)
    }
  }

  // ---- Applying ------------------------------------------------------------------------
  const submitApplication = useCallback(async () => {
    setApplyState("applying")
    setApplyError(null)
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok || /already applied/i.test(data.error ?? "")) {
        setApplyState("applied")
        setTimeout(() => router.replace(`/jobs/${jobId}/apply/success`), 1400)
        return
      }
      throw new Error(data.error || "We could not submit your application")
    } catch (err: any) {
      setApplyState("failed")
      setApplyError(err.message || "We could not submit your application")
    }
  }, [jobId, router])

  // ---- Submit the test -----------------------------------------------------------------
  const finishTest = useCallback(
    async (reason: "manual" | "timeout") => {
      if (!attempt || submittedRef.current) return
      submittedRef.current = true
      setSubmitting(true)
      setConfirmOpen(false)

      try {
        const res = await fetch(`/api/quick-test/attempts/${attempt.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: Object.entries(answersRef.current).map(([questionId, selectedOption]) => ({
              questionId,
              selectedOption,
            })),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Could not submit the quick test")

        setAttempt(data.attempt)
        setPhase("result")
        if (reason === "timeout") toast.warning("Time is up. Your answers were submitted automatically.")
        await submitApplication()
      } catch (err: any) {
        submittedRef.current = false
        toast.error(err.message || "Could not submit the quick test. Please try again.")
      } finally {
        setSubmitting(false)
      }
    },
    [attempt, submitApplication]
  )

  // ---- Countdown + auto submit ---------------------------------------------------------
  useEffect(() => {
    if (phase !== "taking") return
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining <= 0) finishTest("timeout")
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [phase, finishTest])

  // Warn before leaving mid-test
  useEffect(() => {
    if (phase !== "taking") return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [phase])

  // ---- Answering -----------------------------------------------------------------------
  const selectOption = async (question: Question, option: string) => {
    if (!attempt || submitting) return
    setAnswers((prev) => ({ ...prev, [question.id]: option }))
    try {
      const res = await fetch(`/api/quick-test/attempts/${attempt.id}/answers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, selectedOption: option }),
      })
      if (!res.ok) throw new Error()
      saveFailedRef.current = false
    } catch {
      // Answers are re-sent in full on submit, so a failed autosave only matters if the tab closes.
      if (!saveFailedRef.current) {
        saveFailedRef.current = true
        toast.warning("We couldn't auto-save that answer. Check your connection; it will be sent when you finish.")
      }
    }
  }

  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.id]).length,
    [questions, answers]
  )

  // ---- Renders -------------------------------------------------------------------------
  if (phase === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (phase === "error" || phase === "unavailable") {
    return (
      <div className="mx-auto max-w-xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>{phase === "unavailable" ? "No quick test for this job" : "Something went wrong"}</CardTitle>
            <CardDescription>
              {phase === "unavailable"
                ? "This job doesn't require a quick test. You can apply directly from the job page."
                : message}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/jobs/${jobId}`}>Back to job</Link>
            </Button>
            {phase === "error" && (
              <Button
                onClick={() => {
                  setPhase("loading")
                  loadStatus()
                }}
              >
                Try again
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (phase === "intro") {
    const config = status?.config
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <Button asChild variant="ghost" className="pl-0">
          <Link href={`/jobs/${jobId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to job
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Quick test before you apply</CardTitle>
            <CardDescription>
              This role includes a short test. Your application is submitted automatically when you finish.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-4">
                <ListChecks className="mb-2 h-5 w-5 text-primary" />
                <p className="text-2xl font-bold text-foreground">{config?.questionCount ?? "-"}</p>
                <p className="text-xs text-muted-foreground">multiple choice questions</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <Timer className="mb-2 h-5 w-5 text-primary" />
                <p className="text-2xl font-bold text-foreground">{config?.timeLimitMinutes ?? "-"} min</p>
                <p className="text-xs text-muted-foreground">time limit</p>
              </div>
            </div>

            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Questions are generated for this role. You have one attempt.</li>
              <li>The timer starts when you press Start and keeps running if you leave the page.</li>
              <li>Your answers save automatically, so you can safely reload and continue.</li>
              <li>When time runs out, your answers are submitted automatically.</li>
              <li>Your score is shared with the hiring team as part of your application.</li>
            </ul>

            <Button onClick={() => startTest()} disabled={starting} className="w-full sm:w-auto">
              {starting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing your questions...
                </>
              ) : (
                "Start quick test"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (phase === "result") {
    const score = attempt?.scorePercent
    return (
      <div className="mx-auto max-w-xl space-y-6 py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <CardTitle>Quick test complete</CardTitle>
            {score != null && (
              <CardDescription>
                You scored <strong className="text-foreground">{score}%</strong>
                {attempt?.status === "EXPIRED" ? " (time ran out)" : ""}.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            {applyState === "applying" && (
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting your application...
              </p>
            )}
            {applyState === "applied" && (
              <p className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Application submitted. Redirecting...
              </p>
            )}
            {(applyState === "failed" || applyState === "idle") && (
              <div className="space-y-3">
                {applyError && (
                  <p className="flex items-start justify-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {applyError}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {applyState === "idle"
                    ? "Your test is saved. Submit your application to finish."
                    : "Your test result is saved, so you won't need to retake it."}
                </p>
                <Button onClick={submitApplication}>
                  {applyState === "failed" ? (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Retry submitting application
                    </>
                  ) : (
                    "Submit application"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---- Taking the test -----------------------------------------------------------------
  const question = questions[current]
  const total = questions.length
  const progress = total > 0 ? (answeredCount / total) * 100 : 0
  const urgent = secondsLeft <= 60
  const warning = secondsLeft <= 300
  const unanswered = total - answeredCount

  return (
    <div className="mx-auto max-w-3xl space-y-4 py-6">
      {/* Sticky timer bar */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Quick test</p>
            <p className="text-xs text-muted-foreground">
              {answeredCount} of {total} answered
            </p>
          </div>
          <div
            role="timer"
            aria-live="off"
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-lg font-bold tabular-nums ${
              urgent
                ? "animate-pulse border-red-500/40 bg-red-500/10 text-red-600"
                : warning
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-600"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
            }`}
          >
            <Clock className="h-4 w-4" />
            {formatClock(secondsLeft)}
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {question && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                Question {current + 1} of {total}
              </Badge>
            </div>
            <CardTitle className="text-lg leading-relaxed">{question.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {question.options.map((option) => {
              const selected = answers[question.id] === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectOption(question, option)}
                  disabled={submitting}
                  className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left text-sm transition-colors ${
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                    }`}
                  >
                    {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </span>
                  <span className="text-foreground">{option}</span>
                </button>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Question navigator */}
      <div className="flex flex-wrap gap-2">
        {questions.map((q, index) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setCurrent(index)}
            aria-label={`Go to question ${index + 1}${answers[q.id] ? " (answered)" : ""}`}
            className={`h-9 w-9 rounded-md border text-sm font-medium transition-colors ${
              index === current
                ? "border-primary bg-primary text-primary-foreground"
                : answers[q.id]
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        {current < total - 1 ? (
          <Button onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => (unanswered > 0 ? setConfirmOpen(true) : finishTest("manual"))} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Finish & submit"
            )}
          </Button>
        )}
      </div>

      {current < total - 1 && answeredCount === total && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => finishTest("manual")} disabled={submitting}>
            All answered. Finish & submit
          </Button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit with unanswered questions?</DialogTitle>
            <DialogDescription>
              You have {unanswered} unanswered question{unanswered === 1 ? "" : "s"}. They will count as incorrect, and
              you can&apos;t retake the test.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep working
            </Button>
            <Button onClick={() => finishTest("manual")}>Submit anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
