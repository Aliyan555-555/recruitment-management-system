"use client"

import { useEffect, useState } from "react"
import { JobPipelineHeader, type PipelineStage } from "@/components/admin/JobPipelineHeader"

interface WorkflowRound {
  id: string
  stepName: string
  stepOrder: number
  statistics: {
    pending: number
    inProgress: number
    completed: number
  }
}

interface UseJobPipelineOptions {
  jobId: string
  currentStageId?: string
}

export function useJobPipeline({ jobId, currentStageId }: UseJobPipelineOptions) {
  const [jobTitle, setJobTitle] = useState("")
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`/api/admin/jobs/${jobId}/workflow`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return

        const workflow = data.workflow
        const rounds: WorkflowRound[] = workflow?.rounds || []
        const shortlistCounts = workflow?.shortlistCounts

        setJobTitle(workflow?.jobTitle || "")

        const pipelineStages: PipelineStage[] = [
          {
            id: "applications",
            label: "Applications",
            count: shortlistCounts?.total ?? 0,
            href: `/admin/jobs/${jobId}/shortlist`,
            kind: "applications",
          },
          ...rounds.map((round) => ({
            id: round.id,
            label: round.stepName,
            count: round.statistics.pending + round.statistics.inProgress + round.statistics.completed,
            href: `/admin/jobs/${jobId}/rounds/${round.id}/applied`,
            kind: "round" as const,
          })),
        ]

        setStages(pipelineStages)
      } catch (error) {
        console.error("Failed to load pipeline:", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (jobId) load()
    return () => {
      cancelled = true
    }
  }, [jobId])

  return { jobTitle, stages, loading, currentStageId }
}

interface JobPipelineHeaderLoaderProps {
  jobId: string
  currentStageId?: string
}

export function JobPipelineHeaderLoader({
  jobId,
  currentStageId,
}: JobPipelineHeaderLoaderProps) {
  const { jobTitle, stages, loading } = useJobPipeline({ jobId, currentStageId })

  if (loading || !jobTitle) return null

  return (
    <JobPipelineHeader
      jobId={jobId}
      jobTitle={jobTitle}
      stages={stages}
      currentStageId={currentStageId}
    />
  )
}
