"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Workflow, User, CheckCircle2, XCircle, ArrowRight } from "lucide-react"

interface WorkflowStep {
  id: string
  stepName: string
  stepOrder: number
  isRequired: boolean
  isSkippable: boolean
  interviewer: {
    id: string
    name: string
    email: string
  } | null
}

interface Workflow {
  id: string
  jobId: string
  jobTitle: string
  jobCompany: string
  totalSteps: number
  steps: WorkflowStep[]
  createdAt: string
}

export default function AdminWorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/admin/workflows", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || `Failed to fetch workflows: ${response.statusText}`
        )
      }

      const data = await response.json()
      setWorkflows(data.workflows || [])
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch workflows"
      console.error("Error fetching workflows:", err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-destructive mb-2">
          Error Loading Workflows
        </h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchWorkflows} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Workflows</h2>
        <p className="text-muted-foreground mt-2">
          View and manage job interview workflows
        </p>
      </div>

      {workflows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">No workflows yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Workflows are created automatically when you create a job
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{workflow.jobTitle}</CardTitle>
                    <CardDescription>{workflow.jobCompany}</CardDescription>
                  </div>
                  <Link href={`/admin/jobs/${workflow.jobId}`}>
                    <Button variant="outline" size="sm">
                      View Job
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Workflow className="h-4 w-4" />
                    <span>{workflow.totalSteps} workflow steps</span>
                  </div>
                  <div className="space-y-2">
                    {workflow.steps.map((step) => (
                      <div
                        key={step.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                            {step.stepOrder}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{step.stepName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {step.isRequired ? (
                                <Badge variant="secondary" className="text-xs">
                                  Required
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Optional
                                </Badge>
                              )}
                              {step.isSkippable && (
                                <Badge variant="outline" className="text-xs">
                                  Skippable
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {step.interviewer ? (
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{step.interviewer.name}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              No interviewer assigned
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

