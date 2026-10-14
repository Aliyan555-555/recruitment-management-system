"use client"

import { Award, Briefcase, CheckCircle2, ExternalLink, GraduationCap, Mail, MapPin, Phone, ThumbsDown, ThumbsUp, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CandidateDossier as Dossier } from "@/lib/evaluations/candidate-dossier"
import { cn } from "@/lib/utils"

function tone(percent: number | null) {
  if (percent === null) return "bg-muted-foreground/40"
  if (percent >= 75) return "bg-emerald-500"
  if (percent >= 50) return "bg-amber-500"
  return "bg-rose-500"
}

function Bar({ value, max, className }: { value: number | null; max: number; className?: string }) {
  const percent = value === null || max <= 0 ? null : Math.round((value / max) * 100)
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={value ?? 0} aria-valuemin={0} aria-valuemax={max}>
      <div className={cn("h-full rounded-full transition-all", tone(percent))} style={{ width: `${percent ?? 0}%` }} />
    </div>
  )
}

function Stat({ label, value, sub, percent }: { label: string; value: string; sub?: string; percent: number | null }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      <Bar value={percent} max={100} className="mt-2 h-1.5" />
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</p>
}

function Recommendation({ value }: { value: "HIRE" | "NO_HIRE" | null }) {
  if (!value) return null
  return value === "HIRE" ? (
    <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
      <ThumbsUp className="h-3 w-3" /> Recommended
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1">
      <ThumbsDown className="h-3 w-3" /> Not recommended
    </Badge>
  )
}

const dateFromSeconds = (s: string | null) => (s ? new Date(Number(s) * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null)
const range = (start: string | null, end: string | null, current: boolean) => [start, current ? "Present" : end].filter(Boolean).join(" – ")

export function CandidateDossier({ dossier }: { dossier: Dossier }) {
  const { profile, education, experience, quickTest, screening, jobSkills, skillAssessments } = dossier
  const screeningAvg = screening
    ? (() => {
        const scored = screening.evaluations.filter((e) => e.percentage !== null)
        return scored.length ? Math.round(scored.reduce((s, e) => s + (e.percentage ?? 0), 0) / scored.length) : null
      })()
    : null
  const requiredSkills = jobSkills.skills.filter((s) => s.priority === "REQUIRED")
  const preferredSkills = jobSkills.skills.filter((s) => s.priority === "PREFERRED")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Candidate dossier</CardTitle>
        <CardDescription>Everything known about {profile.name || "this candidate"} for this role, in one place.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Quick test"
            value={quickTest?.scorePercent != null ? `${quickTest.scorePercent}%` : "–"}
            sub={quickTest ? `${quickTest.scoredPoints ?? 0}/${quickTest.maxPoints} pts` : "Not taken"}
            percent={quickTest?.scorePercent ?? null}
          />
          <Stat
            label="Screening round"
            value={screeningAvg !== null ? `${screeningAvg}%` : "–"}
            sub={screening ? `${screening.evaluations.length} scorecard${screening.evaluations.length === 1 ? "" : "s"}` : "No scorecard"}
            percent={screeningAvg}
          />
          <Stat
            label="Job skills matched"
            value={jobSkills.total ? `${jobSkills.matchedCount}/${jobSkills.total}` : "–"}
            sub={jobSkills.total ? `${jobSkills.percentage}% match` : "No skills listed"}
            percent={jobSkills.total ? jobSkills.percentage : null}
          />
          <Stat
            label="Skill assessments"
            value={String(skillAssessments.length)}
            sub={skillAssessments.length ? `${skillAssessments.filter((a) => a.status === "PASSED").length} passed` : "None taken"}
            percent={
              skillAssessments.length
                ? Math.round(skillAssessments.reduce((s, a) => s + (a.percentage ?? 0), 0) / skillAssessments.length)
                : null
            }
          />
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quick">Quick test</TabsTrigger>
            <TabsTrigger value="screening">Screening round</TabsTrigger>
            <TabsTrigger value="skills">Skills & assessments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-6">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-muted-foreground" />{profile.email}</span>
              {profile.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-muted-foreground" />{profile.phone}</span>}
              {(profile.city || profile.country) && (
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground" />{[profile.city, profile.country].filter(Boolean).join(", ")}</span>
              )}
              {profile.links.map((l) => (
                <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary underline">
                  {l.label} <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>

            {profile.bio && <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">{profile.bio}</p>}

            <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Fact label="Applied on" value={dateFromSeconds(profile.appliedAt)} />
              <Fact label="Expected salary" value={profile.expectedSalary} />
              <Fact label="Notice period" value={profile.noticePeriod} />
              <Fact label="Availability" value={profile.availability} />
              <Fact label="Professional grade" value={profile.professionalGrade} />
              <Fact label="Nationality" value={profile.nationality} />
              <Fact label="Gender" value={profile.gender} />
              <Fact label="Date of birth" value={profile.dateOfBirth} />
              <Fact label="Languages" value={profile.languages} />
            </dl>

            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><Briefcase className="h-4 w-4" /> Experience</h3>
              {experience.length === 0 ? (
                <Empty>No experience listed.</Empty>
              ) : (
                <ol className="space-y-3 border-l pl-4">
                  {experience.map((e) => (
                    <li key={e.id}>
                      <p className="text-sm font-medium">{e.jobTitle}{e.company ? ` · ${e.company}` : ""}</p>
                      <p className="text-xs text-muted-foreground">{[range(e.startDate, e.endDate, e.isCurrent), e.location].filter(Boolean).join(" · ")}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><GraduationCap className="h-4 w-4" /> Education</h3>
              {education.length === 0 ? (
                <Empty>No education listed.</Empty>
              ) : (
                <ol className="space-y-3 border-l pl-4">
                  {education.map((e) => (
                    <li key={e.id}>
                      <p className="text-sm font-medium">{e.level} – {e.degreeTitle}{e.majorSubject ? ` (${e.majorSubject})` : ""}</p>
                      <p className="text-xs text-muted-foreground">{[e.institute, e.passingYear, e.grade && `Grade: ${e.grade}`].filter(Boolean).join(" · ")}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {(profile.certifications || profile.achievements) && (
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><Award className="h-4 w-4" /> Certifications & achievements</h3>
                {profile.certifications && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{profile.certifications}</p>}
                {profile.achievements && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{profile.achievements}</p>}
              </section>
            )}
          </TabsContent>

          <TabsContent value="quick" className="mt-4 space-y-4">
            {!quickTest ? (
              <Empty>The candidate did not take a quick test for this job.</Empty>
            ) : (
              <>
                <div className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Overall result</p>
                    <span className="text-sm font-semibold tabular-nums">
                      {quickTest.scoredPoints ?? 0} / {quickTest.maxPoints} pts ({quickTest.scorePercent ?? 0}%)
                    </span>
                  </div>
                  <Bar value={quickTest.scoredPoints ?? 0} max={quickTest.maxPoints} />
                  <p className="text-xs text-muted-foreground">
                    {quickTest.status === "SUBMITTED" ? "Submitted" : quickTest.status === "EXPIRED" ? "Expired" : "In progress"}
                    {dateFromSeconds(quickTest.submittedAt) && ` on ${dateFromSeconds(quickTest.submittedAt)}`} · {quickTest.timeLimitMinutes} min limit ·{" "}
                    {quickTest.questions.filter((q) => q.isCorrect).length}/{quickTest.questions.length} correct
                  </p>
                </div>
                <ol className="space-y-3">
                  {quickTest.questions.map((q) => (
                    <li key={q.order} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium"><span className="mr-1 text-muted-foreground">Q{q.order}.</span>{q.question}</p>
                        <Badge variant={q.isCorrect ? "default" : "outline"} className={cn("shrink-0 tabular-nums", q.isCorrect && "bg-emerald-600 hover:bg-emerald-600")}>
                          {q.pointsAwarded}/{q.points} pts
                        </Badge>
                      </div>
                      <ul className="space-y-1">
                        {q.options.map((opt) => {
                          const chosen = opt === q.selectedOption
                          const correct = opt === q.correctOption
                          return (
                            <li
                              key={opt}
                              className={cn(
                                "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm",
                                correct && "border-emerald-500/60 bg-emerald-500/10",
                                chosen && !correct && "border-rose-500/60 bg-rose-500/10"
                              )}
                            >
                              {correct ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : chosen ? <XCircle className="h-4 w-4 shrink-0 text-rose-600" /> : <span className="h-4 w-4 shrink-0" />}
                              <span className="flex-1">{opt}</span>
                              {chosen && <span className="text-xs text-muted-foreground">Candidate's answer</span>}
                              {correct && !chosen && <span className="text-xs text-emerald-700 dark:text-emerald-400">Correct answer</span>}
                            </li>
                          )
                        })}
                      </ul>
                      {q.selectedOption === null && <p className="text-xs text-muted-foreground">Not answered.</p>}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </TabsContent>

          <TabsContent value="screening" className="mt-4 space-y-4">
            {!screening ? (
              <Empty>No submitted screening scorecard for this candidate yet.</Empty>
            ) : (
              <>
                {screening.feedback && <p className="rounded-lg bg-muted/50 p-3 text-sm">{screening.feedback}</p>}
                {screening.evaluations.map((ev, i) => (
                  <div key={i} className="space-y-4 rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{screening.roundName}</p>
                        <p className="text-xs text-muted-foreground">Interviewer: {ev.evaluatorName}</p>
                      </div>
                      <Recommendation value={ev.recommendation} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Overall</span>
                        <span className="font-semibold tabular-nums">{ev.total ?? "–"} / {ev.max ?? "–"} ({ev.percentage ?? 0}%)</span>
                      </div>
                      <Bar value={ev.total} max={ev.max ?? 0} />
                    </div>
                    <div className="space-y-3">
                      {ev.criteria.map((c) => (
                        <div key={c.key} className="space-y-1">
                          <div className="flex justify-between gap-3 text-sm">
                            <span>{c.label}</span>
                            <span className="shrink-0 font-semibold tabular-nums">{c.rating ?? "–"} / {c.max}</span>
                          </div>
                          <Bar value={c.rating} max={c.max} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                    {ev.comments && (
                      <div>
                        <p className="text-xs text-muted-foreground">Interviewer comments</p>
                        <p className="whitespace-pre-wrap text-sm">{ev.comments}</p>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="skills" className="mt-4 space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Job skills match</h3>
                {jobSkills.total > 0 && <span className="text-sm tabular-nums text-muted-foreground">{jobSkills.matchedCount}/{jobSkills.total} matched</span>}
              </div>
              {jobSkills.total === 0 ? (
                <Empty>No skills are defined for this job.</Empty>
              ) : (
                [
                  { title: "Required", list: requiredSkills },
                  { title: "Preferred", list: preferredSkills },
                ]
                  .filter((g) => g.list.length > 0)
                  .map((g) => (
                    <div key={g.title} className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.title}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {g.list.map((s) => (
                          <div key={s.skillName} className={cn("flex items-center justify-between gap-2 rounded-lg border p-2.5", s.matched ? "border-emerald-500/40" : "border-dashed opacity-80")}>
                            <div className="flex items-center gap-2 text-sm">
                              {s.matched ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                              <span className="font-medium">{s.skillName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                              {s.verifiedLevel && <Badge variant="secondary" className="capitalize">{s.verifiedLevel.toLowerCase()}</Badge>}
                              {s.assessmentPercent !== null && <span className="tabular-nums text-muted-foreground">{s.assessmentPercent}%</span>}
                              {!s.matched && <span className="text-muted-foreground">Missing</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Skill assessment results</h3>
              {skillAssessments.length === 0 ? (
                <Empty>The candidate has not taken any skill assessments.</Empty>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {skillAssessments.map((a) => {
                    const passed = a.status === "PASSED"
                    return (
                      <div key={a.id} className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">
                            {a.skillName}
                            {a.relevantToJob && <Badge variant="outline" className="ml-2 text-[10px]">Job skill</Badge>}
                          </p>
                          <Badge variant={passed ? "default" : "outline"} className={cn(passed && "bg-emerald-600 hover:bg-emerald-600")}>
                            {a.status === "SUBMITTED" ? "Submitted" : passed ? "Passed" : "Failed"}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{a.level ? `Level: ${a.level.toLowerCase()}` : "No level"}</span>
                          <span className="font-semibold tabular-nums">{a.scoredPoints ?? 0} / {a.maxPoints} ({a.percentage ?? 0}%)</span>
                        </div>
                        <Bar value={a.scoredPoints ?? 0} max={a.maxPoints} />
                        <p className="text-xs text-muted-foreground">
                          Pass mark {a.minPoints} pts · attempt {a.attemptNumber}
                          {dateFromSeconds(a.submittedAt) && ` · ${dateFromSeconds(a.submittedAt)}`}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
