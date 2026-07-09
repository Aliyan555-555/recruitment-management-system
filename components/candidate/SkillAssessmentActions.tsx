"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, Trash2 } from "lucide-react"
import { SkillVerificationBadge } from "@/components/candidate/VerifiedLevelBadge"
import { formatCooldownRemaining } from "@/lib/assessments/level-display"

export type SkillAssessmentStatus = {
  userSkillId: string
  skillName: string
  verifiedLevel: string | null
  verifiedAt: string | null
  inProgressAssessmentId: string | null
  canStart: boolean
  maxAttemptsReached: boolean
  attemptsUsed: number
  maxAttempts: number
  cooldownEndsAt: string | null
  lastAssessmentId: string | null
}

export function SkillAssessmentActions({
  skill,
  onDelete,
  showDelete = true,
}: {
  skill: SkillAssessmentStatus
  onDelete?: (userSkillId: string) => void
  showDelete?: boolean
}) {
  const [cooldownLabel, setCooldownLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!skill.cooldownEndsAt) {
      setCooldownLabel(null)
      return
    }

    const update = () => {
      setCooldownLabel(
        formatCooldownRemaining(Number(skill.cooldownEndsAt))
      )
    }

    update()
    const interval = setInterval(update, 30_000)
    return () => clearInterval(interval)
  }, [skill.cooldownEndsAt])

  const assessmentHref = skill.inProgressAssessmentId
    ? `/candidate/assessments/${skill.userSkillId}?assessmentId=${skill.inProgressAssessmentId}`
    : `/candidate/assessments/${skill.userSkillId}`

  const showTakeAssessment =
    skill.canStart || Boolean(skill.inProgressAssessmentId)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{skill.skillName}</span>
          <SkillVerificationBadge level={skill.verifiedLevel} />
        </div>
        <p className="text-xs text-muted-foreground">
          Attempts used: {skill.attemptsUsed}/{skill.maxAttempts}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showTakeAssessment ? (
          <Button asChild size="sm">
            <Link href={assessmentHref}>
              <Sparkles className="mr-2 h-4 w-4" />
              {skill.inProgressAssessmentId
                ? "Continue Assessment"
                : "Take AI Assessment"}
            </Link>
          </Button>
        ) : skill.verifiedLevel ? (
          <Button size="sm" variant="outline" disabled>
            Already verified
          </Button>
        ) : skill.maxAttemptsReached ? (
          <Button size="sm" variant="outline" disabled>
            Max attempts reached
          </Button>
        ) : cooldownLabel ? (
          <Button size="sm" variant="outline" disabled>
            Re-attempt in {cooldownLabel}
          </Button>
        ) : null}

        {skill.lastAssessmentId && (
          <Button asChild size="sm" variant="ghost">
            <Link
              href={`/candidate/assessments/${skill.userSkillId}/result/${skill.lastAssessmentId}`}
            >
              View result
            </Link>
          </Button>
        )}

        {showDelete && onDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(skill.userSkillId)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

export function SkillAssessmentStatusList({
  skills,
  loading,
  onDelete,
  showDelete = true,
}: {
  skills: SkillAssessmentStatus[]
  loading?: boolean
  onDelete?: (userSkillId: string) => void
  showDelete?: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading assessment status...
      </div>
    )
  }

  if (skills.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add a skill above to unlock AI skill assessments.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {skills.map((skill) => (
        <SkillAssessmentActions
          key={skill.userSkillId}
          skill={skill}
          onDelete={onDelete}
          showDelete={showDelete}
        />
      ))}
    </div>
  )
}
