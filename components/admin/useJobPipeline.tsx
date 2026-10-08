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
  /** Change this value to reload the stages (e.g. after saving settings that affect them). */
  refreshKey?: number
}

export function useJobPipeline({ jobId, currentStageId, refreshKey = 0 }: UseJobPipelineOptions) {
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

        const quickTest = workflow?.quickTest
        const pipelineStages: PipelineStage[] = [
          // The quick test happens before an application exists, so it leads the pipeline.
          ...(quickTest?.enabled || quickTest?.started > 0
            ? [
                {
                  id: "quick-test",
                  label: "Quick Test",
                  count: quickTest.started ?? 0,
                  href: `/admin/jobs/${jobId}/quick-test`,
                  kind: "quickTest" as const,
                },
              ]
            : []),
          {
            id: "applications",
            label: "Applications",
            count: shortlistCounts?.total ?? 0,
            href: `/admin/jobs/${jobId}/applicants`,
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
  }, [jobId, refreshKey])

  return { jobTitle, stages, loading, currentStageId }
}

interface JobPipelineHeaderLoaderProps {
  jobId: string
  currentStageId?: string
  refreshKey?: number
}

export function JobPipelineHeaderLoader({
  jobId,
  currentStageId,
  refreshKey,
}: JobPipelineHeaderLoaderProps) {
  const { jobTitle, stages, loading } = useJobPipeline({ jobId, currentStageId, refreshKey })

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
