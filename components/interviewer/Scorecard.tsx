"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, ChevronDown, Loader2, ThumbsDown, ThumbsUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SCREENING_SKILLS } from "@/lib/constants/screening-skills"
import type { BehaviorDefinition } from "@/lib/constants/focus-group-behaviors"
import { scoreFormData, validatePanelForm, validateSkillsForm } from "@/lib/evaluations/scoring"
import { cn } from "@/lib/utils"

type FormKind = "SKILLS" | "PANEL"

interface Props {
  bookingId: string
  kind: FormKind
  behaviors: BehaviorDefinition[] | null
  initial: any
  submitted: boolean
  canEvaluate: boolean
  onSubmitted: () => void
}

const AUTOSAVE_MS = 20_000

function emptyForm(kind: FormKind, behaviors: BehaviorDefinition[] | null) {
  if (kind === "PANEL") {
    return {
      focusGroup: { panel: { behaviors: (behaviors ?? []).map((b) => ({ name: b.name, rating: undefined as number | undefined, feedback: "" })) } },
      comments: "",
      recommendedToHire: "",
    }
  }
  return { skills: {} as Record<string, { rating?: number; max: number }>, comments: "", recommendedToHire: "" }
}

export function Scorecard({ bookingId, kind, behaviors, initial, submitted, canEvaluate, onSubmitted }: Props) {
  const [form, setForm] = useState<any>(() => initial ?? emptyForm(kind, behaviors))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const formRef = useRef(form)
  formRef.current = form

  const readOnly = submitted || !canEvaluate
  const problem = useMemo(() => (kind === "PANEL" ? validatePanelForm(form) : validateSkillsForm(form)), [form, kind])
  const score = useMemo(() => scoreFormData(form), [form])

  const update = (next: any) => {
    setForm(next)
    setDirty(true)
  }

  const saveDraft = async (silent = false) => {
    if (readOnly) return
    setSaving(true)
    try {
      const res = await fetch(`/api/interviewer/interviews/${bookingId}/evaluation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: formRef.current }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Could not save draft")
      setDirty(false)
      setSavedAt(new Date())
      if (!silent) toast.success("Draft saved")
    } catch (err) {
      if (!silent) toast.error(err instanceof Error ? err.message : "Could not save draft")
    } finally {
      setSaving(false)
    }
  }

  // autosave while editing
  useEffect(() => {
    if (readOnly || !dirty) return
    const t = setTimeout(() => saveDraft(true), AUTOSAVE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, dirty, readOnly])

  const submit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/interviewer/interviews/${bookingId}/evaluation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: form }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || "Could not submit scorecard")
      toast.success(body.allIn ? "Scorecard submitted. All panel scores are in." : "Scorecard submitted.")
      setConfirmOpen(false)
      onSubmitted()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit scorecard")
      setConfirmOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const setSkill = (key: string, max: number, rating: number) =>
    update({ ...form, skills: { ...form.skills, [key]: { rating, max } } })
  const setBehavior = (index: number, patch: Record<string, unknown>) =>
    update({
      ...form,
      focusGroup: {
        panel: { behaviors: form.focusGroup.panel.behaviors.map((b: any, i: number) => (i === index ? { ...b, ...patch } : b)) },
      },
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scorecard</CardTitle>
        <CardDescription>
          {submitted
            ? "Submitted. Scorecards cannot be changed after submission."
            : !canEvaluate
              ? "The scorecard opens 15 minutes before the interview starts."
              : "Your answers are saved automatically. Other panel members cannot see your scores."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {kind === "SKILLS" &&
          SCREENING_SKILLS.map((skill) => {
            const rating: number | undefined = form.skills?.[skill.key]?.rating
            return (
              <div key={skill.key} className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{skill.label}</p>
                    <p className="text-xs text-muted-foreground">{skill.description}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-sm font-semibold tabular-nums">
                    {rating ?? "–"} / {skill.max}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={skill.max}
                  step={1}
                  disabled={readOnly}
                  value={rating ?? 0}
                  onChange={(e) => setSkill(skill.key, skill.max, Number(e.target.value))}
                  onPointerDown={() => rating === undefined && !readOnly && setSkill(skill.key, skill.max, 0)}
                  aria-label={skill.label}
                  className={cn("w-full accent-primary", rating === undefined && "opacity-50")}
                />
              </div>
            )
          })}

        {kind === "PANEL" &&
          (behaviors ?? []).map((def, index) => {
            const b = form.focusGroup?.panel?.behaviors?.[index]
            const expanded = open === def.name
            return (
              <div key={def.name} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{def.name}</p>
                  <div className="flex gap-1" role="radiogroup" aria-label={def.name}>
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={b?.rating === n}
                        disabled={readOnly}
                        onClick={() => setBehavior(index, { rating: n })}
                        className={cn(
                          "h-9 w-9 rounded-md border text-sm font-semibold transition-colors disabled:opacity-60",
                          b?.rating === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground" onClick={() => setOpen(expanded ? null : def.name)}>
                  <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
                  Behaviour indicators
                </button>
                {expanded && (
                  <div className="grid gap-3 text-xs md:grid-cols-2">
                    <ul className="list-disc space-y-1 pl-4 text-emerald-700 dark:text-emerald-400">
                      {def.positiveIndicators.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                    <ul className="list-disc space-y-1 pl-4 text-rose-700 dark:text-rose-400">
                      {def.negativeIndicators.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Textarea
                  rows={2}
                  disabled={readOnly}
                  placeholder="Evidence / notes (optional)"
                  value={b?.feedback ?? ""}
                  onChange={(e) => setBehavior(index, { feedback: e.target.value })}
                />
              </div>
            )
          })}

        <div className="space-y-3">
          <p className="text-sm font-medium">Your recommendation</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { value: "HIRE", label: "Recommend", icon: ThumbsUp, tone: "border-emerald-500 bg-emerald-500/10" },
              { value: "NO_HIRE", label: "Do not recommend", icon: ThumbsDown, tone: "border-rose-500 bg-rose-500/10" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={readOnly}
                onClick={() => update({ ...form, recommendedToHire: opt.value })}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-60",
                  form.recommendedToHire === opt.value ? opt.tone : "hover:bg-accent"
                )}
              >
                <opt.icon className="h-4 w-4" />
                {opt.label}
              </button>
            ))}
          </div>
          <Textarea
            rows={4}
            disabled={readOnly}
            placeholder="Overall comments"
            value={form.comments ?? ""}
            onChange={(e) => update({ ...form, comments: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Score: <span className="font-semibold text-foreground">{score ? `${score.total}/${score.max} (${score.percentage}%)` : "–"}</span>
            {!readOnly && savedAt && <span className="ml-3 text-xs">Saved {savedAt.toLocaleTimeString()}</span>}
          </p>
          {submitted ? (
            <span className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Submitted
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={readOnly || saving || !dirty} onClick={() => saveDraft(false)}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save draft
              </Button>
              <Button disabled={readOnly || !!problem} title={problem ?? undefined} onClick={() => setConfirmOpen(true)}>
                Submit scorecard
              </Button>
            </div>
          )}
        </div>
        {!submitted && !readOnly && problem && <p className="text-xs text-muted-foreground">To submit: {problem.toLowerCase()}.</p>}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={(o) => !submitting && setConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit scorecard?</DialogTitle>
            <DialogDescription>You cannot edit it after submitting.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={submitting} onClick={() => setConfirmOpen(false)}>
              Review again
            </Button>
            <Button disabled={submitting} onClick={submit}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
