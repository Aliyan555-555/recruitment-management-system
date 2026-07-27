"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  SkillAssessmentStatus,
  SkillAssessmentStatusList,
} from "@/components/candidate/SkillAssessmentActions"

export function ProfileSkillsCard() {
  const [skills, setSkills] = useState<SkillAssessmentStatus[]>([])
  const [loading, setLoading] = useState(true)

  const loadSkills = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/assessments/skills/status")
      const data = await res.json()

      if (res.ok) {
        setSkills(data.skills ?? [])
      }
    } catch (error) {
      console.error("Failed to load skill assessment status:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  const assessedCount = skills.filter((skill) => skill.skillPercentage != null).length

  return (
    <Card className="shadow-sm bg-card border-border">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold text-foreground">Skills</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Each skill is assessed separately by AI. Your score is shown as a percentage.
            {skills.length > 0 && (
              <span className="mt-1 block">
                {assessedCount} of {skills.length} skills assessed
              </span>
            )}
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm" className="shrink-0 text-primary">
          <Link href="/candidate/profile/edit">Manage skills</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <SkillAssessmentStatusList
          skills={skills}
          loading={loading}
          showDelete={false}
        />
      </CardContent>
    </Card>
  )
}
