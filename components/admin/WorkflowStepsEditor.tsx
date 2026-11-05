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
import type { CustomRoundTemplateView } from "@/components/admin/CustomRoundsCard"

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
  candidateInstructions?: string
  interviewerInstructions?: string
  /** after shortlisting, show this round's name to the candidate (default: shown; off = "Hidden round") */
  showName?: boolean
  /** CUSTOM rounds: the organization template this round is based on */
  customRoundTemplateId?: string | null
  /** CUSTOM rounds: whether the template schedules it like an interview (derived from durationMins when loaded) */
  customIsInterview?: boolean
  stepName?: string
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

/** Built-in interview rounds, or a custom round whose template schedules it like an interview. */
export function isEditorStepInterview(step: Pick<EditorStep, "stepType" | "customIsInterview" | "durationMins">): boolean {
  if (isInterviewStepType(step.stepType)) return true
  if (step.stepType !== "CUSTOM") return false
  return step.customIsInterview ?? (step.durationMins !== undefined && step.durationMins !== "")
}

export function newEditorStep(order: number): EditorStep {
  return { stepType: "", stepOrder: order, isRequired: true }
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
    if (s.stepType === "CUSTOM" && !s.customRoundTemplateId) add(i, "Choose one of your custom rounds")
    if (s.stepType !== "CUSTOM" && steps.some((o, j) => j < i && o.stepType === s.stepType)) add(i, "Each round type can be used only once")
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
      customInterview: s.stepType === "CUSTOM" && isEditorStepInterview(s),
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

interface Props {
  steps: EditorStep[]
  onChange: (steps: EditorStep[]) => void
  errors?: StepErrors
  /** candidates already in the pipeline: settings can change but rounds cannot be added/removed/reordered */
  structureLocked?: boolean
}

export function WorkflowStepsEditor({ steps, onChange, errors = {}, structureLocked = false }: Props) {
  const usedTypes = useMemo(() => new Set(steps.map((s) => s.stepType)), [steps])

  // Organization-defined rounds (Settings > Custom job rounds)
  const [templates, setTemplates] = useState<CustomRoundTemplateView[]>([])
  useEffect(() => {
    let alive = true
    fetch("/api/admin/custom-round-templates?active=true", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { templates: [] }))
      .then((d) => alive && setTemplates(d.templates ?? []))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  const templateFor = (step: EditorStep) => templates.find((t) => t.id === step.customRoundTemplateId)
  const selectValue = (step: EditorStep) => (step.stepType === "CUSTOM" ? `custom:${step.customRoundTemplateId ?? ""}` : step.stepType)

  const update = (index: number, patch: Partial<EditorStep>) =>
    onChange(steps.map((s, i) => (i === index ? { ...s, ...patch } : s)))

  const setType = (index: number, value: string) => {
    if (value.startsWith("custom:")) {
      const template = templates.find((t) => t.id === value.slice("custom:".length))
      if (!template) return
      update(index, {
        stepType: "CUSTOM",
        customRoundTemplateId: template.id,
        customIsInterview: template.isInterview,
        stepName: template.name,
        isRequired: steps[index].isRequired,
        interviewMode: template.isInterview ? (template.interviewMode ?? steps[index].interviewMode ?? "") : "",
        durationMins: template.isInterview ? (template.durationMins ?? 30) : "",
        panelSize: template.isInterview ? template.panelSize : 1,
        groupSize: template.isInterview ? template.capacityPerSlot : 1,
        bufferMins: template.isInterview ? template.bufferMins : 0,
        candidateInstructions: steps[index].candidateInstructions || template.candidateInstructions || "",
      })
      return
    }
    const stepType = value
    update(index, {
      customRoundTemplateId: null,
      customIsInterview: undefined,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hiring rounds</CardTitle>
        <CardDescription>
          Candidates move through these rounds in order. Interview rounds are scheduled automatically from the
          interviewers' availability. You choose the interviewers for each round later, on the round's Schedule tab.
          {structureLocked && " Candidates are already in this job, so rounds can be edited but not added, removed or reordered."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => {
          const interview = isEditorStepInterview(step)
          const customTemplate = step.stepType === "CUSTOM" ? templateFor(step) : undefined
          const stepErrors = errors[index] ?? []
          const panel = Number(step.panelSize) || 1
          return (
            <div key={step.id ?? `new-${index}`} className={cn("rounded-lg border p-4 space-y-4", stepErrors.length > 0 && "border-destructive/60")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">
                    {step.stepType === "CUSTOM"
                      ? (customTemplate?.name ?? step.stepName ?? "Custom round")
                      : (STEP_OPTIONS.find((o) => o.value === step.stepType)?.label ?? "New round")}
                  </span>
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
                    value={selectValue(step)}
                    disabled={structureLocked}
                    onChange={(e) => setType(index, e.target.value)}
                  >
                    <option value="">Select a round…</option>
                    {STEP_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value} disabled={usedTypes.has(o.value) && step.stepType !== o.value}>
                        {o.label}
                      </option>
                    ))}
                    {templates.length > 0 && (
                      <optgroup label="Your custom rounds">
                        {templates.map((t) => (
                          <option key={t.id} value={`custom:${t.id}`}>
                            {t.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {/* a round whose template was deactivated or deleted stays selectable so the job can still be saved */}
                    {step.stepType === "CUSTOM" && step.customRoundTemplateId && !customTemplate && (
                      <option value={selectValue(step)}>{step.stepName ?? "Custom round"}</option>
                    )}
                  </select>
                  {step.stepType === "CUSTOM" ? (
                    <p className="text-xs text-muted-foreground">
                      {customTemplate?.description ||
                        (interview ? "Scheduled like an interview, with this round's own rating form" : "Manual decision, not scheduled")}
                    </p>
                  ) : (
                    step.stepType && (
                      <p className="text-xs text-muted-foreground">{STEP_OPTIONS.find((o) => o.value === step.stepType)?.hint}</p>
                    )
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

              <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
                <input
                  id={`vis-${index}`}
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={step.showName !== false}
                  onChange={(e) => update(index, { showName: e.target.checked })}
                />
                <label htmlFor={`vis-${index}`} className="text-sm">
                  <span className="font-medium">Show this round&apos;s name to candidates</span>
                  <span className="block text-xs text-muted-foreground">
                    Candidates see no rounds until they are shortlisted, then they see every round. If this is off,
                    the round still appears in their list, but as &quot;Hidden round&quot; without its name or details.
                  </span>
                </label>
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
                    {(step.stepType === "FOCUS_GROUP" || step.stepType === "CUSTOM") && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor={`panel-${index}`}>Interviewers per session</Label>
                          <Input id={`panel-${index}`} type="number" min={step.stepType === "CUSTOM" ? 1 : 2} max={10} value={step.panelSize ?? ""} onChange={(e) => update(index, { panelSize: e.target.value === "" ? "" : Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`group-${index}`}>Candidates per session</Label>
                          <Input id={`group-${index}`} type="number" min={1} max={50} value={step.groupSize ?? ""} onChange={(e) => update(index, { groupSize: e.target.value === "" ? "" : Number(e.target.value) })} />
                        </div>
                      </>
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
