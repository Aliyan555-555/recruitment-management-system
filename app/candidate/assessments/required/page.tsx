"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react"
import { SkillVerificationBadge } from "@/components/candidate/VerifiedLevelBadge"

type MandatorySkill = {
  userSkillId: string
  skillName: string
  inProgressAssessmentId: string | null
  completedAttempts: number
  maxAttempts: number
  verifiedLevel: string | null
}

type MandatoryStatus = {
  required: boolean
  reason: "no_skills" | "pending_assessments" | "complete"
  pendingSkills: MandatorySkill[]
  completedCount: number
  totalSkills: number
}

export default function RequiredAssessmentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<MandatoryStatus | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/assessments/mandatory/status")
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to load assessment status")
      }

      setStatus(data)

      if (!data.required && data.reason === "complete") {
        router.replace("/candidate/profile")
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!status) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <p className="text-muted-foreground">Unable to load assessment requirements.</p>
        <Button className="mt-4" onClick={loadStatus}>
          Retry
        </Button>
      </div>
    )
  }

  if (status.reason === "no_skills") {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Add skills to continue</CardTitle>
            <CardDescription>
              You need at least one skill on your profile before taking AI assessments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/candidate/profile/edit">Add skills to profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const progressPercent =
    status.totalSkills > 0
      ? Math.round((status.completedCount / status.totalSkills) * 100)
      : 0

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Complete your skill assessments</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Before using the platform, you must complete an AI assessment for each skill on your
          profile. This verifies your proficiency for recruiters.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progress</CardTitle>
          <CardDescription>
            {status.completedCount} of {status.totalSkills} skills assessed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-2 w-full rounded-full bg-secondary">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {status.pendingSkills.map((skill) => {
          const href = skill.inProgressAssessmentId
            ? `/candidate/assessments/${skill.userSkillId}?assessmentId=${skill.inProgressAssessmentId}`
            : `/candidate/assessments/${skill.userSkillId}`

          return (
            <Card key={skill.userSkillId}>
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{skill.skillName}</span>
                    <SkillVerificationBadge level={skill.verifiedLevel} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Attempts used: {skill.completedAttempts}/{skill.maxAttempts}
                  </p>
                </div>
                <Button asChild>
                  <Link href={href}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {skill.inProgressAssessmentId
                      ? "Continue assessment"
                      : "Start assessment"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {status.pendingSkills.length === 0 && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardContent className="flex items-center gap-3 p-6">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-900 dark:text-emerald-100">
                All skill assessments complete
              </p>
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                You can now access your full candidate profile.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          You cannot browse jobs or use other candidate features until every skill has at least
          one completed AI assessment attempt.
        </p>
      </div>
    </div>
  )
}
