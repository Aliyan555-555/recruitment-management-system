"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowDown, ArrowUp, ListChecks, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CUSTOM_FIELD_TYPES, CUSTOM_FORM_LIMITS, type CustomFieldType } from "@/lib/evaluations/custom-form"
import { CUSTOM_ROUND_LIMITS, parseCustomRoundTemplateInput } from "@/lib/custom-rounds/rules"
import { cn } from "@/lib/utils"

export interface CustomRoundTemplateView {
  id: string
  name: string
  description: string | null
  candidateInstructions: string | null
  isInterview: boolean
  interviewMode: "REMOTE" | "ONSITE" | null
  durationMins: number | null
  panelSize: number
  bufferMins: number
  capacityPerSlot: number
  evaluation: { fields: FormFieldDraft[]; recommendationEnabled: boolean }
  isActive: boolean
  usedByJobs: number
}

interface FormFieldDraft {
  key: string
  label: string
  type: CustomFieldType
  required: boolean
  max?: number
  weight: number
  options?: string[]
}

interface Draft {
  id?: string
  name: string
  description: string
  candidateInstructions: string
  isInterview: boolean
  interviewMode: "REMOTE" | "ONSITE" | ""
  durationMins: number | ""
  panelSize: number | ""
  bufferMins: number | ""
  capacityPerSlot: number | ""
  fields: FormFieldDraft[]
  recommendationEnabled: boolean
  isActive: boolean
}

const FIELD_TYPE_LABEL: Record<CustomFieldType, string> = {
  RATING: "Rating (1 to max)",
  NUMBER: "Number (0 to max)",
  SELECT: "Single choice",
  BOOLEAN: "Yes / No",
  TEXT: "Free text",
}

const emptyDraft = (): Draft => ({
  name: "",
  description: "",
  candidateInstructions: "",
  isInterview: true,
  interviewMode: "",
  durationMins: CUSTOM_ROUND_LIMITS.duration.default,
  panelSize: 1,
  bufferMins: 10,
  capacityPerSlot: 1,
  fields: [],
  recommendationEnabled: true,
  isActive: true,
})

const fromTemplate = (t: CustomRoundTemplateView): Draft => ({
  id: t.id,
  name: t.name,
  description: t.description ?? "",
  candidateInstructions: t.candidateInstructions ?? "",
  isInterview: t.isInterview,
  interviewMode: t.interviewMode ?? "",
  durationMins: t.durationMins ?? CUSTOM_ROUND_LIMITS.duration.default,
  panelSize: t.panelSize,
  bufferMins: t.bufferMins,
  capacityPerSlot: t.capacityPerSlot,
  fields: t.evaluation.fields.map((f) => ({ ...f })),
  recommendationEnabled: t.evaluation.recommendationEnabled,
  isActive: t.isActive,
})

const num = (v: number | "") => (v === "" ? undefined : Number(v))

function toPayload(draft: Draft) {
  return {
    name: draft.name,
    description: draft.description || null,
    candidateInstructions: draft.candidateInstructions || null,
    isInterview: draft.isInterview,
    interviewMode: draft.interviewMode || null,
    durationMins: num(draft.durationMins) ?? null,
    panelSize: num(draft.panelSize) ?? 1,
    bufferMins: num(draft.bufferMins) ?? 0,
    capacityPerSlot: num(draft.capacityPerSlot) ?? 1,
    evaluation: {
      recommendationEnabled: draft.recommendationEnabled,
      fields: draft.fields.map((f) => ({
        key: f.key.trim(),
        label: f.label.trim(),
        type: f.type,
        required: f.required,
        weight: f.weight,
        ...(f.type === "RATING" || f.type === "NUMBER" ? { max: f.max } : {}),
        ...(f.type === "SELECT" ? { options: (f.options ?? []).map((o) => o.trim()).filter(Boolean) } : {}),
      })),
    },
    isActive: draft.isActive,
  }
}

/** "Problem solving" -> "problemSolving" (unique within the form) */
function keyFromLabel(label: string, taken: Set<string>): string {
  const words = label.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean)
  let base = words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0]!.toUpperCase() + w.slice(1).toLowerCase())).join("") || "field"
  if (!/^[A-Za-z]/.test(base)) base = `f${base}`
  base = base.slice(0, 36)
  let key = base
  for (let n = 2; taken.has(key.toLowerCase()); n++) key = `${base}${n}`
  return key
}

const nativeField =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function CustomRoundsCard() {
  const [templates, setTemplates] = useState<CustomRoundTemplateView[] | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/custom-round-templates", { cache: "no-store" })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to load custom rounds")
      setTemplates((await res.json()).templates)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load custom rounds")
      setTemplates([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const patch = (changes: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...changes } : d))
  const patchField = (index: number, changes: Partial<FormFieldDraft>) =>
    setDraft((d) => (d ? { ...d, fields: d.fields.map((f, i) => (i === index ? { ...f, ...changes } : f)) } : d))

  const addField = () =>
    setDraft((d) => {
      if (!d) return d
      const taken = new Set(d.fields.map((f) => f.key.toLowerCase()))
      return {
        ...d,
        fields: [...d.fields, { key: keyFromLabel("Field", taken), label: "", type: "RATING", required: true, max: 5, weight: 1 }],
      }
    })

  const moveField = (index: number, dir: -1 | 1) =>
    setDraft((d) => {
      if (!d) return d
      const target = index + dir
      if (target < 0 || target >= d.fields.length) return d
      const fields = [...d.fields]
      ;[fields[index], fields[target]] = [fields[target]!, fields[index]!]
      return { ...d, fields }
    })

  const save = async () => {
    if (!draft) return
    const payload = toPayload(draft)
    const check = parseCustomRoundTemplateInput(payload)
    if (!check.ok) {
      setError(check.error)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(draft.id ? `/api/admin/custom-round-templates/${draft.id}` : "/api/admin/custom-round-templates", {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || "Failed to save custom round")
      toast.success(draft.id ? "Custom round updated" : "Custom round created")
      setDraft(null)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save custom round")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (t: CustomRoundTemplateView) => {
    if (!confirm(`Delete the custom round "${t.name}"?`)) return
    const res = await fetch(`/api/admin/custom-round-templates/${t.id}`, { method: "DELETE" })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(body.error || "Failed to delete custom round")
      return
    }
    toast.success("Custom round deleted")
    load()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Custom job rounds
          </CardTitle>
          <CardDescription>
            Define your own hiring rounds with the interview scheduling, interviewer panels and rating form your
            process needs. They appear when creating a job, next to the built-in rounds. Built-in rounds are fixed and
            cannot be edited here.
          </CardDescription>
        </div>
        <Button
          onClick={() => {
            setError(null)
            setDraft(emptyDraft())
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New round
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {templates === null && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        )}
        {templates?.length === 0 && <p className="text-sm text-muted-foreground">No custom rounds yet.</p>}
        {templates?.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="font-medium">
                {t.name} {!t.isActive && <Badge variant="outline">Inactive</Badge>}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.isInterview ? `Scheduled · ${t.durationMins} min · ${t.panelSize} interviewer(s)` : "Manual decision (not scheduled)"}
                {" · "}
                {t.evaluation.fields.length} rating field(s)
                {t.usedByJobs > 0 && ` · used by ${t.usedByJobs} job round(s)`}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit ${t.name}`}
                onClick={() => {
                  setError(null)
                  setDraft(fromTemplate(t))
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`Delete ${t.name}`} onClick={() => remove(t)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={!!draft} onOpenChange={(open) => !open && !saving && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit custom round" : "New custom round"}</DialogTitle>
            <DialogDescription>
              Changes apply to jobs created afterwards. Jobs that already use this round keep their own copy.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cr-name">Round name *</Label>
                  <Input id="cr-name" maxLength={CUSTOM_ROUND_LIMITS.nameMax} value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Technical assessment" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cr-desc">Short description</Label>
                  <Input id="cr-desc" maxLength={CUSTOM_ROUND_LIMITS.descriptionMax} value={draft.description} onChange={(e) => patch({ description: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cr-instr">Instructions shown to candidates</Label>
                <Textarea id="cr-instr" rows={3} value={draft.candidateInstructions} onChange={(e) => patch({ candidateInstructions: e.target.value })} />
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 h-4 w-4" checked={draft.isInterview} onChange={(e) => patch({ isInterview: e.target.checked })} />
                  <span className="text-sm">
                    <span className="font-medium">Schedule this round like an interview</span>
                    <span className="block text-xs text-muted-foreground">
                      Candidates book a slot and interviewers fill the rating form. Turn off for rounds you decide on
                      manually.
                    </span>
                  </span>
                </label>
                {draft.isInterview && (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                    <div className="space-y-2 md:col-span-1">
                      <Label>Mode</Label>
                      <select className={nativeField} value={draft.interviewMode} onChange={(e) => patch({ interviewMode: e.target.value as Draft["interviewMode"] })}>
                        <option value="">Choose per job</option>
                        <option value="REMOTE">Remote</option>
                        <option value="ONSITE">Onsite</option>
                      </select>
                    </div>
                    {(
                      [
                        ["Duration (min)", "durationMins", CUSTOM_ROUND_LIMITS.duration.min, CUSTOM_ROUND_LIMITS.duration.max],
                        ["Gap after (min)", "bufferMins", CUSTOM_ROUND_LIMITS.buffer.min, CUSTOM_ROUND_LIMITS.buffer.max],
                        ["Interviewers per session", "panelSize", CUSTOM_ROUND_LIMITS.panelSize.min, CUSTOM_ROUND_LIMITS.panelSize.max],
                        ["Candidates per session", "capacityPerSlot", CUSTOM_ROUND_LIMITS.group.min, CUSTOM_ROUND_LIMITS.group.max],
                      ] as const
                    ).map(([label, key, min, max]) => (
                      <div key={key} className="space-y-2">
                        <Label>{label}</Label>
                        <Input
                          type="number"
                          min={min}
                          max={max}
                          value={draft[key]}
                          onChange={(e) => patch({ [key]: e.target.value === "" ? "" : Number(e.target.value) } as Partial<Draft>)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">Interviewer rating form</h4>
                    <p className="text-xs text-muted-foreground">
                      Rating and number fields add up to the score (weighted). Other fields are recorded as feedback.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addField} disabled={draft.fields.length >= CUSTOM_FORM_LIMITS.maxFields}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add field
                  </Button>
                </div>

                {draft.fields.map((f, index) => (
                  <div key={index} className="space-y-3 rounded-lg border p-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px_auto]">
                      <Input
                        aria-label={`Field ${index + 1} label`}
                        placeholder="Field label, e.g. Problem solving"
                        maxLength={CUSTOM_FORM_LIMITS.labelMax}
                        value={f.label}
                        onChange={(e) => {
                          const label = e.target.value
                          const taken = new Set(draft.fields.filter((_, i) => i !== index).map((x) => x.key.toLowerCase()))
                          patchField(index, { label, key: keyFromLabel(label, taken) })
                        }}
                      />
                      <select
                        aria-label={`Field ${index + 1} type`}
                        className={nativeField}
                        value={f.type}
                        onChange={(e) => {
                          const type = e.target.value as CustomFieldType
                          patchField(index, {
                            type,
                            max: type === "RATING" ? 5 : type === "NUMBER" ? 10 : undefined,
                            options: type === "SELECT" ? ["", ""] : undefined,
                          })
                        }}
                      >
                        {CUSTOM_FIELD_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {FIELD_TYPE_LABEL[t]}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" aria-label="Move field up" disabled={index === 0} onClick={() => moveField(index, -1)}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label="Move field down" disabled={index === draft.fields.length - 1} onClick={() => moveField(index, 1)}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label="Remove field" onClick={() => patch({ fields: draft.fields.filter((_, i) => i !== index) })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-4">
                      {(f.type === "RATING" || f.type === "NUMBER") && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs">Maximum</Label>
                            <Input className="w-24" type="number" min={1} max={CUSTOM_FORM_LIMITS.maxRating} value={f.max ?? ""} onChange={(e) => patchField(index, { max: e.target.value === "" ? undefined : Number(e.target.value) })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Weight</Label>
                            <Input className="w-24" type="number" min={0} max={100} step="0.5" value={f.weight} onChange={(e) => patchField(index, { weight: e.target.value === "" ? 1 : Number(e.target.value) })} />
                          </div>
                        </>
                      )}
                      <label className="flex items-center gap-2 pb-2 text-sm">
                        <input type="checkbox" className="h-4 w-4" checked={f.required} onChange={(e) => patchField(index, { required: e.target.checked })} />
                        Required
                      </label>
                    </div>

                    {f.type === "SELECT" && (
                      <div className="space-y-2">
                        <Label className="text-xs">Choices (one per line, at least 2)</Label>
                        <Textarea
                          rows={3}
                          value={(f.options ?? []).join("\n")}
                          onChange={(e) => patchField(index, { options: e.target.value.split("\n").slice(0, CUSTOM_FORM_LIMITS.maxOptions) })}
                        />
                      </div>
                    )}
                  </div>
                ))}

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4" checked={draft.recommendationEnabled} onChange={(e) => patch({ recommendationEnabled: e.target.checked })} />
                  Ask interviewers for a hire / do not hire recommendation
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={draft.isActive} onChange={(e) => patch({ isActive: e.target.checked })} />
                Active (available when creating jobs)
              </label>

              {error && <p className={cn("rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive")}>{error}</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={save}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save round
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
