"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { isInterviewStepType, validateStepConfig } from "@/lib/workflow/step-config"

export interface EditorStep {
  /** existing WorkflowStep id (edit page) */
  id?: string
  stepType: string
  stepOrder: number
  isRequired: boolean
  interviewMode?: "REMOTE" | "ONSITE" | ""
  durationMins?: number | ""
  panelSize?: number | ""
  groupSize?: number | ""
  bufferMins?: number | ""
  meetingLink?: string
  location?: string
  interviewerIds: string[]
  candidateInstructions?: string
  interviewerInstructions?: string
  // preserved untouched when editing an existing job
  [extra: string]: unknown
}

export type StepErrors = Record<number, string[]>

const STEP_OPTIONS = [
  { value: "SCREENING_INTERVIEW", label: "Screening Interview", hint: "One interviewer, one candidate per slot" },
  { value: "FOCUS_GROUP", label: "Focus Group", hint: "A panel of interviewers, several candidates per slot" },
  { value: "FINAL_INTERVIEW", label: "Final Interview", hint: "One interviewer, one candidate per slot" },
  { value: "OFFER", label: "Offer", hint: "Always required and always last" },
]

const nativeField =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

export function newEditorStep(order: number): EditorStep {
  return { stepType: "", stepOrder: order, isRequired: true, interviewerIds: [] }
}

/** Defaults applied when the admin picks a step type. */
function defaultsFor(stepType: string): Partial<EditorStep> {
  if (stepType === "FOCUS_GROUP") return { panelSize: 2, groupSize: 8, durationMins: 60, bufferMins: 10 }
  if (isInterviewStepType(stepType)) return { panelSize: 1, groupSize: 1, durationMins: 30, bufferMins: 10 }
  return {}
}

export function validateEditorSteps(steps: EditorStep[]): StepErrors {
  const errors: StepErrors = {}
  const add = (i: number, msg: string) => (errors[i] = [...(errors[i] ?? []), msg])

  steps.forEach((s, i) => {
    if (!s.stepType) {
      add(i, "Choose a round type")
      return
    }
    if (steps.some((o, j) => j < i && o.stepType === s.stepType)) add(i, "Each round type can be used only once")
    if (s.stepType === "OFFER" && i !== steps.length - 1) add(i, "Offer must be the last round")
    validateStepConfig({
      stepType: s.stepType,
      interviewMode: s.interviewMode || null,
      durationMins: s.durationMins === "" || s.durationMins === undefined ? null : Number(s.durationMins),
      panelSize: s.panelSize === "" || s.panelSize === undefined ? 1 : Number(s.panelSize),
      groupSize: s.groupSize === "" || s.groupSize === undefined ? 1 : Number(s.groupSize),
      bufferMins: s.bufferMins === "" || s.bufferMins === undefined ? 0 : Number(s.bufferMins),
      meetingLink: s.meetingLink,
      location: s.location,
      interviewerIds: s.interviewerIds,
    }).forEach((m) => add(i, m))
  })
  if (steps.length > 0 && !steps.some((s) => s.stepType === "OFFER")) {
    add(steps.length - 1, "Add an Offer round as the last step")
  }
  return errors
}

/** Maps editor state to the API payload (drops empty strings). */
export function toWorkflowPayload(steps: EditorStep[]) {
  const num = (v: unknown) => (v === "" || v === undefined || v === null ? undefined : Number(v))
  return steps.map((s, i) => {
    const { interviewMode, durationMins, panelSize, groupSize, bufferMins, ...rest } = s
    return {
      ...rest,
      stepOrder: i + 1,
      interviewMode: interviewMode || undefined,
      durationMins: num(durationMins),
      panelSize: num(panelSize),
      groupSize: num(groupSize),
      bufferMins: num(bufferMins),
    }
  })
}

interface InterviewerOption {
  id: string
  name: string
}

interface Props {
  steps: EditorStep[]
  onChange: (steps: EditorStep[]) => void
  errors?: StepErrors
  /** candidates already in the pipeline: settings can change but rounds cannot be added/removed/reordered */
  structureLocked?: boolean
}

export function WorkflowStepsEditor({ steps, onChange, errors = {}, structureLocked = false }: Props) {
  const [interviewers, setInterviewers] = useState<InterviewerOption[]>([])
  const [interviewersLoaded, setInterviewersLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    fetch("/api/admin/interviewers")
      .then((r) => (r.ok ? r.json() : { interviewers: [] }))
      .then((d) => {
        if (!alive) return
        setInterviewers(
          (d.interviewers ?? [])
            .filter((i: any) => !i.suspended)
            .map((i: any) => ({ id: i.id, name: `${i.firstname} ${i.lastname}` }))
        )
        setInterviewersLoaded(true)
      })
      .catch(() => alive && setInterviewersLoaded(true))
    return () => {
      alive = false
    }
  }, [])

  const usedTypes = useMemo(() => new Set(steps.map((s) => s.stepType)), [steps])

  const update = (index: number, patch: Partial<EditorStep>) =>
    onChange(steps.map((s, i) => (i === index ? { ...s, ...patch } : s)))

  const setType = (index: number, stepType: string) => {
    update(index, {
      stepType,
      ...defaultsFor(stepType),
      isRequired: stepType === "OFFER" ? true : steps[index].isRequired,
      interviewMode: isInterviewStepType(stepType) ? steps[index].interviewMode : "",
    })
  }

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= steps.length) return
    const next = [...steps]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next.map((s, i) => ({ ...s, stepOrder: i + 1 })))
  }

  const remove = (index: number) =>
    onChange(steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 })))

  const add = () => onChange([...steps, newEditorStep(steps.length + 1)])

  const toggleInterviewer = (index: number, id: string) => {
    const current = steps[index].interviewerIds
    update(index, { interviewerIds: current.includes(id) ? current.filter((x) => x !== id) : [...current, id] })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hiring rounds</CardTitle>
        <CardDescription>
          Candidates move through these rounds in order. Interview rounds are scheduled automatically from the
          interviewers' availability.
          {structureLocked && " Candidates are already in this job, so rounds can be edited but not added, removed or reordered."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => {
          const interview = isInterviewStepType(step.stepType)
          const stepErrors = errors[index] ?? []
          const panel = Number(step.panelSize) || 1
          return (
            <div key={step.id ?? `new-${index}`} className={cn("rounded-lg border p-4 space-y-4", stepErrors.length > 0 && "border-destructive/60")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{STEP_OPTIONS.find((o) => o.value === step.stepType)?.label ?? "New round"}</span>
                </div>
                {!structureLocked && (
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={index === steps.length - 1} onClick={() => move(index, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove round" disabled={steps.length <= 1} onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Round type</Label>
                  <select
                    className={nativeField}
                    value={step.stepType}
                    disabled={structureLocked}
                    onChange={(e) => setType(index, e.target.value)}
                  >
                    <option value="">Select a round…</option>
                    {STEP_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value} disabled={usedTypes.has(o.value) && step.stepType !== o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {step.stepType && (
                    <p className="text-xs text-muted-foreground">{STEP_OPTIONS.find((o) => o.value === step.stepType)?.hint}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Is this round required?</Label>
                  <div className="inline-flex rounded-md border p-0.5">
                    {[
                      { v: true, label: "Required" },
                      { v: false, label: "Optional" },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        disabled={step.stepType === "OFFER"}
                        onClick={() => update(index, { isRequired: opt.v })}
                        className={cn(
                          "rounded px-4 py-1.5 text-sm transition-colors disabled:opacity-60",
                          step.isRequired === opt.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {step.isRequired ? "Every candidate must complete this round." : "An admin can skip this round for a candidate."}
                  </p>
                </div>
              </div>

              {interview && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Mode</Label>
                      <div className="inline-flex rounded-md border p-0.5">
                        {(["REMOTE", "ONSITE"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => update(index, { interviewMode: m })}
                            className={cn(
                              "rounded px-4 py-1.5 text-sm transition-colors",
                              step.interviewMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                            )}
                          >
                            {m === "REMOTE" ? "Remote" : "Onsite"}
                          </button>
                        ))}
                      </div>
                    </div>
                    {step.interviewMode === "REMOTE" && (
                      <div className="space-y-2">
                        <Label htmlFor={`link-${index}`}>Meeting link</Label>
                        <Input id={`link-${index}`} placeholder="https://meet.google.com/…" value={step.meetingLink ?? ""} onChange={(e) => update(index, { meetingLink: e.target.value })} />
                      </div>
                    )}
                    {step.interviewMode === "ONSITE" && (
                      <div className="space-y-2">
                        <Label htmlFor={`loc-${index}`}>Location</Label>
                        <Input id={`loc-${index}`} placeholder="Office address / room" value={step.location ?? ""} onChange={(e) => update(index, { location: e.target.value })} />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor={`dur-${index}`}>Duration (min)</Label>
                      <Input id={`dur-${index}`} type="number" min={5} max={480} value={step.durationMins ?? ""} onChange={(e) => update(index, { durationMins: e.target.value === "" ? "" : Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`buf-${index}`}>Gap after (min)</Label>
                      <Input id={`buf-${index}`} type="number" min={0} max={120} value={step.bufferMins ?? ""} onChange={(e) => update(index, { bufferMins: e.target.value === "" ? "" : Number(e.target.value) })} />
                    </div>
                    {step.stepType === "FOCUS_GROUP" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor={`panel-${index}`}>Interviewers per session</Label>
                          <Input id={`panel-${index}`} type="number" min={2} max={10} value={step.panelSize ?? ""} onChange={(e) => update(index, { panelSize: e.target.value === "" ? "" : Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`group-${index}`}>Candidates per session</Label>
                          <Input id={`group-${index}`} type="number" min={1} max={50} value={step.groupSize ?? ""} onChange={(e) => update(index, { groupSize: e.target.value === "" ? "" : Number(e.target.value) })} />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Interviewers who can run this round
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({step.interviewerIds.length} selected{step.stepType === "FOCUS_GROUP" ? `, ${panel} needed per session` : ""})
                      </span>
                    </Label>
                    {!interviewersLoaded ? (
                      <p className="text-sm text-muted-foreground">Loading interviewers…</p>
                    ) : interviewers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No interviewers yet. Add them under <a className="underline" href="/admin/interviewers" target="_blank" rel="noreferrer">Interviewers</a>, then come back.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {interviewers.map((i) => {
                          const checked = step.interviewerIds.includes(i.id)
                          return (
                            <label
                              key={i.id}
                              className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                                checked ? "border-primary bg-primary/5" : "hover:bg-accent"
                              )}
                            >
                              <input type="checkbox" className="h-4 w-4 accent-primary" checked={checked} onChange={() => toggleInterviewer(index, i.id)} />
                              <span className="truncate">{i.name}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`ci-${index}`}>Instructions for candidates (optional)</Label>
                      <Textarea id={`ci-${index}`} rows={3} value={step.candidateInstructions ?? ""} onChange={(e) => update(index, { candidateInstructions: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`ii-${index}`}>Notes for interviewers (optional)</Label>
                      <Textarea id={`ii-${index}`} rows={3} value={step.interviewerInstructions ?? ""} onChange={(e) => update(index, { interviewerInstructions: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              {stepErrors.length > 0 && (
                <ul className="space-y-1 text-sm text-destructive">
                  {stepErrors.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}

        {!structureLocked && (
          <Button type="button" variant="outline" onClick={add}>
            <Plus className="mr-2 h-4 w-4" />
            Add round
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
