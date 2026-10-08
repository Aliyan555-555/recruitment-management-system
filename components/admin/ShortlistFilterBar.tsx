"use client"

import { useState } from "react"
import { Plus, RotateCcw, X } from "lucide-react"
import { InstitutePicker, useInstitutes } from "@/components/admin/InstitutePicker"
import { useEducationLevels } from "@/components/admin/useEducationLevels"
import { FilterKey, ShortlistFilters, todayIso } from "@/lib/ai-shortlist/filters"

export interface FilterCounts {
  match: number
  needsReview: number
  filteredOut: number
}

const LABELS: Record<FilterKey, string> = {
  minEducation: "Minimum education",
  ageRange: "Age range",
  institutes: "Institutes",
  minCgpa: "Minimum CGPA",
}

const inputCls = "w-20 px-2 py-1 text-xs border border-border rounded-md bg-background"

function chipLabel(key: FilterKey, f: ShortlistFilters): string {
  if (key === "minEducation" && f.minEducation) return `Education ≥ ${f.minEducation.name}`
  if (key === "ageRange" && f.ageRange) {
    const { min, max } = f.ageRange
    if (min != null && max != null) return `Age ${min}–${max}`
    if (max != null) return `Age ≤ ${max}`
    return `Age ≥ ${min}`
  }
  if (key === "institutes" && f.institutes) {
    if (f.institutes.ids.length === 0) return "Institutes: none selected"
    const names = f.institutes.names?.length ? f.institutes.names : f.institutes.ids.map((id) => `#${id}`)
    const shown = names.slice(0, 2).join(", ")
    return names.length > 2 ? `${shown} +${names.length - 2}` : shown
  }
  if (key === "minCgpa" && f.minCgpa) return `CGPA ≥ ${f.minCgpa.value}/${f.minCgpa.scale}`
  return LABELS[key]
}

/**
 * Editable screening filters shared by the Manual and AI shortlisting pages.
 * Changes apply instantly; the parent re-buckets candidates client-side (no AI involved).
 */
export function ShortlistFilterBar({
  filters,
  jobDefaults,
  onChange,
  counts,
  rightSlot,
  compact = false,
}: {
  filters: ShortlistFilters
  jobDefaults: ShortlistFilters
  onChange: (f: ShortlistFilters) => void
  counts?: FilterCounts
  rightSlot?: React.ReactNode
  /** Borderless single-row layout (used under the applicant tabs). */
  compact?: boolean
}) {
  const [editing, setEditing] = useState<FilterKey | null>(null)
  const [adding, setAdding] = useState(false)
  const institutes = useInstitutes()
  const levels = useEducationLevels()

  const activeKeys = (Object.keys(LABELS) as FilterKey[]).filter((k) => filters[k] !== undefined)
  const missingKeys = (Object.keys(LABELS) as FilterKey[]).filter((k) => filters[k] === undefined)
  // Job criteria that were removed: offer one-click restore with the original value
  const restorable = missingKeys.filter((k) => jobDefaults[k] !== undefined)
  const addable = missingKeys.filter((k) => !restorable.includes(k))
  const differsFromJob = JSON.stringify(filters) !== JSON.stringify(jobDefaults)

  const remove = (key: FilterKey) => {
    const next = { ...filters }
    delete next[key]
    onChange(next)
    if (editing === key) setEditing(null)
  }

  const add = (key: FilterKey) => {
    const next: ShortlistFilters = { ...filters }
    if (key === "minEducation") {
      const first = levels.find((l) => l.rank > 0)
      next.minEducation = first ? { rank: first.rank, name: first.name } : { rank: 10, name: "Matric / Secondary (SSC)" }
    }
    if (key === "ageRange") next.ageRange = { min: 20, max: 35, asOf: todayIso() }
    if (key === "institutes") next.institutes = { ids: [], names: [] }
    if (key === "minCgpa") next.minCgpa = { value: 3, scale: 4 }
    onChange(next)
    setEditing(key)
    setAdding(false)
  }

  const num = (v: string): number | undefined => (v === "" ? undefined : Number(v))

  return (
    <div className={compact ? "space-y-2" : "rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm"}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground mr-1">{compact ? "Hiring criteria" : "Filters"}</span>

        {activeKeys.length === 0 && <span className="text-xs text-muted-foreground">No filters, showing everyone</span>}

        {activeKeys.map((key) => (
          <span
            key={key}
            className={`inline-flex items-center gap-1 text-xs font-medium border rounded-full pl-3 pr-1.5 py-1 ${
              editing === key ? "bg-primary text-primary-foreground border-primary" : "bg-primary/10 text-primary border-primary/20"
            }`}
          >
            <button type="button" onClick={() => setEditing(editing === key ? null : key)} title="Click to edit">
              {chipLabel(key, filters)}
            </button>
            <button
              type="button"
              aria-label={`Remove ${LABELS[key]} filter`}
              onClick={() => remove(key)}
              className="rounded-full hover:bg-black/10 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {restorable.map((key) => (
          <button
            key={key}
            type="button"
            title="Restore job criterion"
            onClick={() => onChange({ ...filters, [key]: jobDefaults[key] })}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground border border-dashed border-border rounded-full px-3 py-1 line-through decoration-muted-foreground/40 hover:text-foreground hover:no-underline"
          >
            <Plus className="w-3 h-3" /> {chipLabel(key, jobDefaults)}
          </button>
        ))}

        {addable.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground border border-dashed border-border rounded-full px-3 py-1 hover:text-foreground"
            >
              <Plus className="w-3 h-3" /> Add filter
            </button>
            {adding && (
              <ul className="absolute z-20 mt-1 w-44 rounded-lg border border-border bg-popover shadow-md text-xs">
                {addable.map((k) => (
                  <li key={k}>
                    <button type="button" onClick={() => add(k)} className="w-full text-left px-3 py-2 hover:bg-muted">
                      {LABELS[k]}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {differsFromJob && (
          <button
            type="button"
            onClick={() => {
              onChange(jobDefaults)
              setEditing(null)
            }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline"
          >
            <RotateCcw className="w-3 h-3" /> Reset to job criteria
          </button>
        )}

        {compact && counts && (
          <span className="ml-auto text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{counts.match}</span> match
            {counts.needsReview > 0 && <> &middot; <span className="font-semibold text-amber-600">{counts.needsReview}</span> need review</>}
            {" "}&middot; <span className="font-semibold text-rose-600">{counts.filteredOut}</span> filtered out
          </span>
        )}
        {rightSlot && <div className={compact && counts ? "" : "ml-auto"}>{rightSlot}</div>}
      </div>

      {editing === "minEducation" && filters.minEducation && (
        <div className="flex flex-wrap items-center gap-2 text-xs p-3 rounded-xl bg-muted/40">
          <span>Highest education at least</span>
          <select
            className="px-2 py-1 text-xs border border-border rounded-md bg-background"
            value={levels.find((l) => l.rank === filters.minEducation!.rank)?.id ?? ""}
            onChange={(e) => {
              const lvl = levels.find((l) => l.id === e.target.value)
              if (lvl) onChange({ ...filters, minEducation: { rank: lvl.rank, name: lvl.name } })
            }}
          >
            {levels.filter((l) => l.rank > 0).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <button type="button" onClick={() => setEditing(null)} className="ml-auto underline">Done</button>
        </div>
      )}

      {editing === "ageRange" && filters.ageRange && (
        <div className="flex flex-wrap items-center gap-2 text-xs p-3 rounded-xl bg-muted/40">
          <span>Age between</span>
          <input type="number" min={0} className={inputCls} placeholder="min" value={filters.ageRange.min ?? ""} onChange={(e) => onChange({ ...filters, ageRange: { ...filters.ageRange!, min: num(e.target.value) } })} />
          <span>and</span>
          <input type="number" min={0} className={inputCls} placeholder="max" value={filters.ageRange.max ?? ""} onChange={(e) => onChange({ ...filters, ageRange: { ...filters.ageRange!, max: num(e.target.value) } })} />
          <span>as of</span>
          <input type="date" className="px-2 py-1 text-xs border border-border rounded-md bg-background" value={filters.ageRange.asOf} onChange={(e) => e.target.value && onChange({ ...filters, ageRange: { ...filters.ageRange!, asOf: e.target.value } })} />
          <button type="button" onClick={() => setEditing(null)} className="ml-auto underline">Done</button>
        </div>
      )}

      {editing === "institutes" && filters.institutes && (
        <div className="space-y-2 p-3 rounded-xl bg-muted/40">
          <InstitutePicker
            value={filters.institutes.ids}
            onChange={(ids) =>
              onChange({
                ...filters,
                institutes: { ids, names: ids.map((id) => institutes.find((i) => i.id === id)?.name ?? `#${id}`) },
              })
            }
          />
          <div className="flex justify-end text-xs">
            <button type="button" onClick={() => setEditing(null)} className="underline">Done</button>
          </div>
        </div>
      )}

      {editing === "minCgpa" && filters.minCgpa && (
        <div className="flex flex-wrap items-center gap-2 text-xs p-3 rounded-xl bg-muted/40">
          <span>CGPA at least</span>
          <input type="number" step="0.1" min={0} className={inputCls} value={filters.minCgpa.value} onChange={(e) => onChange({ ...filters, minCgpa: { ...filters.minCgpa!, value: Number(e.target.value) } })} />
          <span>out of</span>
          <input type="number" min={1} className={inputCls} value={filters.minCgpa.scale} onChange={(e) => onChange({ ...filters, minCgpa: { ...filters.minCgpa!, scale: Number(e.target.value) || 4 } })} />
          <button type="button" onClick={() => setEditing(null)} className="ml-auto underline">Done</button>
        </div>
      )}

      {!compact && counts && (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{counts.match}</span> match
          {counts.needsReview > 0 && <> &middot; <span className="font-semibold text-amber-600">{counts.needsReview}</span> need review (missing data)</>}
          {" "}&middot; <span className="font-semibold text-rose-600">{counts.filteredOut}</span> filtered out
        </p>
      )}
    </div>
  )
}
