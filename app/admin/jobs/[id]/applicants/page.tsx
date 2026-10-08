"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, ChevronDown, Layers, Loader2, Search } from "lucide-react"
import { JobPipelineHeaderLoader } from "@/components/admin/useJobPipeline"
import { ShortlistFilterBar } from "@/components/admin/ShortlistFilterBar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApplicantCard } from "@/components/admin/applicants/ApplicantCard"
import { CandidateProfilePanel } from "@/components/admin/applicants/CandidateProfilePanel"
import { AiScreeningPanel } from "@/components/admin/applicants/AiScreeningPanel"
import { ReviewMode } from "@/components/admin/applicants/ReviewMode"
import { BulkBar } from "@/components/admin/applicants/BulkBar"
import { REC_LABEL } from "@/components/admin/applicants/badges"
import { prefetchApplicantDetail, useApplicantDetail, useApplicants } from "@/components/admin/applicants/useApplicants"
import { useReviewShortcuts } from "@/components/admin/applicants/useReviewShortcuts"
import type { Decision } from "@/components/admin/applicants/types"
import { ApplicantTab, groupApplicants } from "@/lib/admin/applicant-buckets"
import type { ApplicantRow } from "@/lib/admin/applicant-serializers"
import type { ShortlistFilters } from "@/lib/ai-shortlist/filters"

type SortKey = "ai" | "recent" | "name" | "quick" | "age"
type RecFilter = "all" | "SHORTLIST" | "MAYBE" | "REJECT"

const TAB_LABEL: Record<ApplicantTab, string> = {
  to_review: "To review",
  maybe: "Maybe",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "ai", label: "AI match score" },
  { key: "recent", label: "Most recent" },
  { key: "quick", label: "Quick test score" },
  { key: "name", label: "Name" },
  { key: "age", label: "Age (youngest)" },
]

function sortRows(rows: ApplicantRow[], sort: SortKey) {
  const val = (n: number | null | undefined) => (n == null ? -1 : n)
  const copy = [...rows]
  switch (sort) {
    case "ai":
      return copy.sort((a, b) => val(b.ai?.status === "COMPLETED" ? b.ai.overallScore : null) - val(a.ai?.status === "COMPLETED" ? a.ai.overallScore : null) || Number(b.appliedAt) - Number(a.appliedAt))
    case "quick":
      return copy.sort((a, b) => val(b.quickTestScore) - val(a.quickTestScore))
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name))
    case "age":
      return copy.sort((a, b) => (a.age ?? 999) - (b.age ?? 999))
    default:
      return copy.sort((a, b) => Number(b.appliedAt) - Number(a.appliedAt))
  }
}

export default function ApplicantsPage() {
  const params = useParams()
  const jobId = params.id as string
  const { data, loading, error, refresh, decide, setHasNote, version } = useApplicants(jobId)

  const [filters, setFilters] = useState<ShortlistFilters>({})
  const filtersInit = useRef(false)
  useEffect(() => {
    if (data && !filtersInit.current) {
      filtersInit.current = true
      setFilters(data.defaultFilters ?? {})
    }
  }, [data])

  const [tab, setTab] = useState<ApplicantTab>("to_review")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("ai") // falls back to most recent when nothing is AI-scored
  const [rec, setRec] = useState<RecFilter>("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [showNeedsReview, setShowNeedsReview] = useState(true)
  const [showFilteredOut, setShowFilteredOut] = useState(false)
  const [review, setReview] = useState<string[] | null>(null)
  const [mobileProfile, setMobileProfile] = useState(false)
  const [deciding, setDeciding] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const cardRefs = useRef(new Map<string, HTMLDivElement | null>())

  const rows = useMemo(() => data?.applicants ?? [], [data])
  const groups = useMemo(() => groupApplicants(rows, filters), [rows, filters])
  const hasAi = rows.some((r) => r.ai?.status === "COMPLETED")

  const view = useCallback(
    <T extends ApplicantRow>(list: T[]): T[] => {
      const q = search.trim().toLowerCase()
      const filtered = list.filter(
        (r) =>
          (!q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)) &&
          (rec === "all" || (r.ai?.status === "COMPLETED" && r.ai.recommendation === rec))
      )
      return sortRows(filtered, sort) as T[]
    },
    [search, rec, sort]
  )

  const current = groups[tab]
  const mainList = useMemo(() => view(current.match), [view, current])
  const reviewList = useMemo(() => view(current.needsReview), [view, current])
  const outList = useMemo(() => view(current.filteredOut), [view, current])
  const decidedTab = tab === "shortlisted" || tab === "rejected"

  const navigable = useMemo(
    () => [...mainList, ...(showNeedsReview ? reviewList : []), ...(showFilteredOut ? outList : [])].map((r) => r.candidateId),
    [mainList, reviewList, outList, showNeedsReview, showFilteredOut]
  )

  // Keep a valid selection
  useEffect(() => {
    if (!selectedId || !navigable.includes(selectedId)) setSelectedId(navigable[0] ?? null)
  }, [navigable, selectedId])

  // Clear bulk selection when the visible set changes meaningfully
  useEffect(() => setChecked(new Set()), [tab, filters, rec, search])

  const { detail, loading: detailLoading } = useApplicantDetail(jobId, selectedId, version)
  const selectedRow = rows.find((r) => r.candidateId === selectedId) ?? null

  // Prefetch neighbours for instant navigation
  useEffect(() => {
    if (!selectedId) return
    const i = navigable.indexOf(selectedId)
    for (const id of navigable.slice(i + 1, i + 3)) prefetchApplicantDetail(jobId, id, version)
  }, [selectedId, navigable, jobId, version])

  const move = (delta: number) => {
    if (navigable.length === 0) return
    const i = selectedId ? navigable.indexOf(selectedId) : -1
    const next = navigable[Math.max(0, Math.min(navigable.length - 1, i + delta))]
    setSelectedId(next)
    cardRefs.current.get(next)?.scrollIntoView({ block: "nearest" })
  }

  const decideSelected = async (action: Decision) => {
    if (!selectedRow || !selectedRow.actionable || deciding) return
    const i = navigable.indexOf(selectedRow.candidateId)
    const nextId = navigable[i + 1] ?? navigable[i - 1] ?? null
    setDeciding(true)
    const ok = await decide([selectedRow.candidateId], action)
    setDeciding(false)
    // Decisions move the card to another tab, so advance to the next candidate
    if (ok && action !== "unmaybe" && !(tab === "maybe" && action === "maybe")) setSelectedId(nextId)
  }

  useReviewShortcuts(
    {
      j: () => move(1),
      ArrowDown: () => move(1),
      k: () => move(-1),
      ArrowUp: () => move(-1),
      s: () => decideSelected("select"),
      r: () => decideSelected("reject"),
      m: () => decideSelected(selectedRow?.reviewFlag === "MAYBE" ? "unmaybe" : "maybe"),
      "/": () => searchRef.current?.focus(),
    },
    !review
  )

  const actionableVisible = [...mainList, ...(showNeedsReview ? reviewList : [])].filter((r) => r.actionable)
  const checkedVisible = actionableVisible.filter((r) => checked.has(r.candidateId)).map((r) => r.candidateId)
  const recommendedVisible = actionableVisible.filter((r) => r.ai?.status === "COMPLETED" && r.ai.recommendation === "SHORTLIST")

  const unscoredIds = [...groups.to_review.match, ...groups.to_review.needsReview, ...groups.maybe.match, ...groups.maybe.needsReview]
    .filter((r) => r.ai?.status === "FILTERED_OUT")
    .map((r) => r.candidateId)

  const filterSummary = [
    filters.minEducation && `Education ≥ ${filters.minEducation.name}`,
    filters.ageRange && `Age ${filters.ageRange.min ?? "any"}–${filters.ageRange.max ?? "any"}`,
    filters.institutes?.ids.length && `Institutes: ${(filters.institutes.names ?? []).join(", ")}`,
    filters.minCgpa && `CGPA ≥ ${filters.minCgpa.value}/${filters.minCgpa.scale}`,
  ]
    .filter(Boolean)
    .join(" · ")

  const openReview = () => {
    const queue = [...mainList, ...(showNeedsReview ? reviewList : [])].filter((r) => r.actionable).map((r) => r.candidateId)
    if (queue.length > 0) setReview(queue)
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
      </div>
    )
  }

  const renderCards = (list: ApplicantRow[], opts: { checkable: boolean; reasons?: boolean }) =>
    list.map((a) => (
      <ApplicantCard
        key={a.candidateId}
        ref={(el) => {
          cardRefs.current.set(a.candidateId, el)
        }}
        applicant={a}
        selected={a.candidateId === selectedId}
        checked={checked.has(a.candidateId)}
        checkable={opts.checkable && a.actionable}
        reasons={opts.reasons ? (a as ApplicantRow & { filterReasons?: string[] }).filterReasons : undefined}
        onSelect={() => {
          setSelectedId(a.candidateId)
          setMobileProfile(true)
        }}
        onCheck={(on) =>
          setChecked((prev) => {
            const next = new Set(prev)
            if (on) next.add(a.candidateId)
            else next.delete(a.candidateId)
            return next
          })
        }
      />
    ))

  const profile = (
    <CandidateProfilePanel
      jobId={jobId}
      detail={detail && detail.candidate.id === selectedId ? detail : null}
      loading={detailLoading}
      filters={filters}
      onDecide={decideSelected}
      deciding={deciding}
      onNoteSaved={(has) => selectedId && setHasNote(selectedId, has)}
    />
  )

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <JobPipelineHeaderLoader jobId={jobId} currentStageId="applications" refreshKey={version} />

      {/* Title row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applicants</h1>
          <p className="text-sm text-muted-foreground">
            Review each candidate&apos;s profile, then shortlist, mark as maybe, or reject. Shortcuts: J/K move · S shortlist · M maybe · R reject.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!decidedTab && (
            <button
              type="button"
              onClick={openReview}
              disabled={actionableVisible.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Layers className="h-4 w-4" /> Review mode ({actionableVisible.length})
            </button>
          )}
          {data?.job.firstRound && (
            <Link
              href={`/admin/jobs/${jobId}/rounds/${data.job.firstRound.id}/applied`}
              className="rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              {data.job.firstRound.stepName} →
            </Link>
          )}
        </div>
      </div>

      <AiScreeningPanel
        jobId={jobId}
        aiRun={data?.aiRun ?? null}
        filters={filters}
        unscoredIds={unscoredIds}
        pendingCount={groups.to_review.match.length + groups.to_review.needsReview.length}
        onChanged={refresh}
      />

      {/* Tabs + toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as ApplicantTab)}>
          <TabsList>
            {(Object.keys(TAB_LABEL) as ApplicantTab[]).map((t) => (
              <TabsTrigger key={t} value={t}>
                {TAB_LABEL[t]}
                <span className="rounded-full bg-muted-foreground/10 px-1.5 text-xs tabular-nums">{groups[t].total}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email ( / )"
            className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm"
          />
        </div>
        {hasAi && (
          <select value={rec} onChange={(e) => setRec(e.target.value as RecFilter)} className="h-9 rounded-lg border border-input bg-background px-2 text-sm" aria-label="AI recommendation">
            <option value="all">All AI results</option>
            {(["SHORTLIST", "MAYBE", "REJECT"] as const).map((r) => (
              <option key={r} value={r}>AI: {REC_LABEL[r]}</option>
            ))}
          </select>
        )}
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-9 rounded-lg border border-input bg-background px-2 text-sm" aria-label="Sort by">
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>Sort: {s.label}</option>
          ))}
        </select>
      </div>

      <ShortlistFilterBar
        filters={filters}
        jobDefaults={data?.defaultFilters ?? {}}
        onChange={setFilters}
        compact
        counts={
          decidedTab
            ? undefined
            : { match: current.match.length, needsReview: current.needsReview.length, filteredOut: current.filteredOut.length }
        }
      />

      {/* Split view */}
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="space-y-2 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto lg:pr-1" role="listbox" aria-label="Applicants">
          {!decidedTab && recommendedVisible.length > 0 && (
            <button
              type="button"
              onClick={() => setChecked(new Set(recommendedVisible.map((r) => r.candidateId)))}
              className="text-xs text-primary underline"
            >
              Select all AI-recommended in this view ({recommendedVisible.length})
            </button>
          )}
          {!decidedTab && actionableVisible.length > 0 && (
            <label className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={checkedVisible.length > 0 && checkedVisible.length === actionableVisible.length}
                onChange={(e) => setChecked(e.target.checked ? new Set(actionableVisible.map((r) => r.candidateId)) : new Set())}
              />
              Select all shown ({actionableVisible.length})
            </label>
          )}

          {mainList.length === 0 && reviewList.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {rows.length === 0
                ? "No one has applied to this job yet."
                : current.total === 0
                  ? `No candidates in ${TAB_LABEL[tab]}.`
                  : "No candidates match the current filters or search."}
            </p>
          )}

          {renderCards(mainList, { checkable: !decidedTab })}

          {reviewList.length > 0 && (
            <div className="space-y-2 pt-2">
              <button type="button" onClick={() => setShowNeedsReview((v) => !v)} className="flex w-full items-center gap-1 text-left text-xs font-semibold text-amber-600">
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showNeedsReview ? "" : "-rotate-90"}`} />
                Needs review: missing profile data ({reviewList.length})
              </button>
              {showNeedsReview && renderCards(reviewList, { checkable: !decidedTab })}
            </div>
          )}

          {outList.length > 0 && (
            <div className="space-y-2 pt-2">
              <button type="button" onClick={() => setShowFilteredOut((v) => !v)} className="flex w-full items-center gap-1 text-left text-xs font-semibold text-rose-600">
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilteredOut ? "" : "-rotate-90"}`} />
                Filtered out by criteria ({outList.length})
              </button>
              {showFilteredOut && renderCards(outList, { checkable: false, reasons: true })}
            </div>
          )}
        </div>

        {/* Desktop profile */}
        <div className="hidden lg:block">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-sm">
            {profile}
          </div>
        </div>
      </div>

      {/* Mobile profile overlay */}
      {mobileProfile && selectedId && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-card p-5 lg:hidden">
          <button type="button" onClick={() => setMobileProfile(false)} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to list
          </button>
          {profile}
        </div>
      )}

      {!decidedTab && (
        <BulkBar
          count={checkedVisible.length}
          filterSummary={filterSummary}
          onClear={() => setChecked(new Set())}
          onAction={async (action) => {
            const ok = await decide(checkedVisible, action)
            if (ok) setChecked(new Set())
          }}
        />
      )}

      {review && (
        <ReviewMode
          jobId={jobId}
          queueIds={review}
          applicants={rows}
          version={version}
          filters={filters}
          firstRound={data?.job.firstRound ?? null}
          decide={decide}
          onNoteSaved={setHasNote}
          onClose={() => setReview(null)}
        />
      )}
    </div>
  )
}
