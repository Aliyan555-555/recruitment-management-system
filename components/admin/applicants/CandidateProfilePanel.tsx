"use client"

import { useEffect, useRef, useState } from "react"
import {
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { evaluateFilters, ShortlistFilters } from "@/lib/ai-shortlist/filters"
import type { ApplicantDetail, Decision } from "./types"
import { AiRecBadge, initials, ScoreBar, ScorePill } from "./badges"
import { DecisionBar } from "./DecisionBar"

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-border pt-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground whitespace-pre-line">{value}</dd>
    </div>
  )
}

const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : [])

interface Props {
  jobId: string
  detail: ApplicantDetail | null
  loading: boolean
  filters: ShortlistFilters
  onDecide: (action: Decision) => void
  onNoteSaved?: (hasNote: boolean) => void
  deciding?: boolean
  noteRef?: React.RefObject<HTMLTextAreaElement>
}

/** CV-style profile of one applicant with a sticky decision bar. */
export function CandidateProfilePanel({ jobId, detail, loading, filters, onDecide, onNoteSaved, deciding, noteRef }: Props) {
  if (!detail) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-muted-foreground">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Select a candidate to see their profile"}
      </div>
    )
  }

  const { candidate: c, application: app, ai, quickTest } = detail
  const p = c.profile
  const checks = evaluateFilters(detail.filterFacts, filters).checks
  const links = [
    ["LinkedIn", p?.linkedinUrl],
    ["GitHub", p?.githubUrl],
    ["Portfolio", p?.portfolioUrl],
    ["Website", p?.websiteUrl],
  ].filter((l): l is [string, string] => !!l[1])

  return (
    <div className={cn("relative", loading && "opacity-60")}>
      {/* Header + decisions (scrolls with the profile so the content gets the full height) */}
      <div className="mb-5 border-b border-border pb-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold">
            {c.avatar ? <img src={c.avatar} alt="" className="h-full w-full object-cover" /> : initials(c.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{c.name}</h2>
              {ai?.status === "COMPLETED" && <ScorePill score={ai.overallScore} className="text-sm" />}
              {ai?.status === "COMPLETED" && <AiRecBadge rec={ai.recommendation} />}
            </div>
            {p?.title && <p className="text-sm text-foreground/80">{p.title}</p>}
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>
              {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
              {c.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.city}</span>}
              {c.age != null && <span>{c.age} years old</span>}
              {c.experienceYears != null && <span>{c.experienceYears} yrs experience</span>}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <DecisionBar
            actionable={app.actionable}
            blockedLabel={app.statusLabel}
            isMaybe={app.reviewFlag === "MAYBE"}
            onDecide={onDecide}
            busy={deciding}
          />
        </div>
      </div>

      <div className="space-y-5">
        {/* Requirement check against active filters */}
        {checks.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Requirement check</h3>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {checks.map((ch) => (
                <li key={ch.key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  {ch.outcome === "PASS" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : ch.outcome === "FAIL" ? (
                    <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  ) : (
                    <CircleHelp className="h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <span className="truncate">{ch.reason}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* AI insight */}
        <Section title="AI evaluation" icon={<Sparkles className="h-4 w-4" />}>
          {ai?.status === "COMPLETED" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <ScoreBar label="Skills" value={ai.skillsScore} />
                <ScoreBar label="Experience" value={ai.experienceScore} />
                <ScoreBar label="Education" value={ai.educationScore} />
                <ScoreBar label="Success criteria" value={ai.successCriteriaScore} />
                {ai.assessmentScore != null && <ScoreBar label="Assessments" value={ai.assessmentScore} />}
                <ScoreBar label="AI confidence" value={ai.aiConfidence} />
              </div>
              {ai.aiReasoning && <p className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">{ai.aiReasoning}</p>}
              {Array.isArray(ai.mandatoryChecklist) && ai.mandatoryChecklist.length > 0 && (
                <ul className="space-y-1">
                  {ai.mandatoryChecklist.map((item: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      {item.met ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                      )}
                      <span>
                        {item.requirement}
                        {item.priority === "PREFERRED" && <span className="ml-1 text-xs text-muted-foreground">(preferred)</span>}
                        {item.note && <span className="block text-xs text-muted-foreground">{item.note}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {asList(ai.strengths).length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Strengths</p>
                    <ul className="list-disc space-y-0.5 pl-4 text-sm">{asList(ai.strengths).map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                )}
                {asList(ai.concerns).length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-rose-700 dark:text-rose-400">Concerns</p>
                    <ul className="list-disc space-y-0.5 pl-4 text-sm">{asList(ai.concerns).map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {ai?.status === "FILTERED_OUT"
                ? "Not AI-scored: excluded by the screening filters when the run started."
                : ai?.status === "FAILED"
                  ? `AI evaluation failed for this candidate${ai.errorMessage ? `: ${ai.errorMessage}` : "."}`
                  : "Not AI-scored yet. Run AI screening to get a match score."}
            </p>
          )}
        </Section>

        <Section title="Experience" icon={<Briefcase className="h-4 w-4" />}>
          {c.experiences.length === 0 ? (
            <p className="text-sm text-muted-foreground">No experience listed.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-5">
              {c.experiences.map((x) => (
                <li key={x.id} className="relative">
                  <span className={cn("absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full", x.isCurrent ? "bg-primary" : "bg-muted-foreground/40")} />
                  <p className="font-medium text-sm">{x.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[x.company, x.location].filter(Boolean).join(" · ")}
                    {(x.startDate || x.endDate || x.isCurrent) && ` · ${x.startDate ?? "?"} – ${x.isCurrent ? "Present" : x.endDate ?? "?"}`}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="Education" icon={<GraduationCap className="h-4 w-4" />}>
          {c.educations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No education listed.</p>
          ) : (
            <ul className="space-y-3">
              {c.educations.map((e) => (
                <li key={e.id}>
                  <p className="font-medium text-sm">
                    {e.degree}
                    {e.level && <span className="ml-2 text-xs font-normal text-muted-foreground">{e.level}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[e.institute, e.major, e.grade ? `Grade ${e.grade}` : null, e.passingYear].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Skills">
          {c.skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No skills listed.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {c.skills.map((s) => (
                <span
                  key={s.id}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
                    s.verifiedLevel ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" : "border-border"
                  )}
                  title={s.verifiedLevel ? `Verified ${s.verifiedLevel.toLowerCase()}` : `Self-rated ${s.level}/5`}
                >
                  {s.verifiedLevel && <BadgeCheck className="h-3 w-3" />}
                  {s.name}
                  {s.assessmentPercent != null ? (
                    <span className="font-semibold">{s.assessmentPercent}%</span>
                  ) : (
                    <span className="text-muted-foreground">{s.level}/5</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </Section>

        {quickTest && (
          <Section title="Quick test">
            <p className="text-sm">
              {quickTest.scorePercent != null ? (
                <>
                  <span className="text-lg font-bold">{quickTest.scorePercent}%</span>{" "}
                  <span className="text-muted-foreground">
                    ({quickTest.scoredPoints ?? 0}/{quickTest.maxPoints} points, {quickTest.questionCount} questions)
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Status: {quickTest.status.toLowerCase().replace("_", " ")}</span>
              )}
            </p>
          </Section>
        )}

        <Section title="About">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Summary" value={p?.bio} /></div>
            <Field label="Expected salary" value={p?.expectedSalary} />
            <Field label="Notice period" value={p?.noticePeriod} />
            <Field label="Availability" value={p?.availability} />
            <Field label="Preferred city" value={p?.preferredCity} />
            <Field label="Languages" value={p?.languages} />
            <Field label="Gender" value={p?.gender} />
            <div className="sm:col-span-2"><Field label="Certifications" value={p?.certifications} /></div>
            <div className="sm:col-span-2"><Field label="Achievements" value={p?.achievements} /></div>
            {detail.candidate.jobPreference?.summary && (
              <div className="sm:col-span-2"><Field label="Job preference" value={detail.candidate.jobPreference.summary} /></div>
            )}
          </dl>
          {links.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-1">
              {links.map(([label, url]) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  {label} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          )}
        </Section>

        <Section title="Reviewer note">
          <NoteEditor
            key={app.id}
            jobId={jobId}
            candidateId={c.id}
            initial={app.note ?? ""}
            onSaved={onNoteSaved}
            textareaRef={noteRef}
          />
          {app.reviewedBy && app.reviewedAt && (
            <p className="text-xs text-muted-foreground">
              Last reviewed by {app.reviewedBy} on {new Date(Number(app.reviewedAt) * 1000).toLocaleString()}
            </p>
          )}
        </Section>

        {/* Repeat the decision at the end so you don't have to scroll back up */}
        <div className="border-t border-border pt-5">
          <DecisionBar
            actionable={app.actionable}
            blockedLabel={app.statusLabel}
            isMaybe={app.reviewFlag === "MAYBE"}
            onDecide={onDecide}
            busy={deciding}
          />
        </div>
      </div>
    </div>
  )
}

function NoteEditor({
  jobId,
  candidateId,
  initial,
  onSaved,
  textareaRef,
}: {
  jobId: string
  candidateId: string
  initial: string
  onSaved?: (hasNote: boolean) => void
  textareaRef?: React.RefObject<HTMLTextAreaElement>
}) {
  const [value, setValue] = useState(initial)
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const saved = useRef(initial)

  // Autosave 800ms after typing stops
  useEffect(() => {
    if (value === saved.current) return
    const t = setTimeout(async () => {
      setState("saving")
      try {
        const res = await fetch(`/api/admin/jobs/${jobId}/applicants/${candidateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: value }),
        })
        if (!res.ok) throw new Error()
        saved.current = value
        setState("saved")
        onSaved?.(!!value.trim())
      } catch {
        setState("error")
      }
    }, 800)
    return () => clearTimeout(t)
  }, [value, jobId, candidateId, onSaved])

  return (
    <div className="space-y-1">
      <textarea
        ref={textareaRef}
        value={value}
        maxLength={2000}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder="Private note for the hiring team (saved automatically)"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
      />
      <p className="text-xs text-muted-foreground h-4">
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? "Could not save note" : ""}
      </p>
    </div>
  )
}
