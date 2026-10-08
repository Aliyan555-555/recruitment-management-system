"use client"

import { useEducationLevels } from "@/components/admin/useEducationLevels"

export interface HiringCriteriaForm {
  minEducationId: string
  minAge: string
  maxAge: string
}

export const EMPTY_HIRING_CRITERIA: HiringCriteriaForm = {
  minEducationId: "",
  minAge: "",
  maxAge: "",
}

/** Request body fragment for POST/PUT /api/admin/jobs. */
export function hiringCriteriaPayload(f: HiringCriteriaForm) {
  return {
    minAge: f.minAge || null,
    maxAge: f.maxAge || null,
    // degree requirements (institutes, CGPA) are no longer part of job criteria; clear any old values
    minCgpa: null,
    cgpaScale: null,
    instituteIds: [],
  }
}

/** Maps the GET /api/admin/jobs/:id `hiringCriteria` object into form state. */
export function hiringCriteriaFromJob(c: any, minEducationId?: string | null): HiringCriteriaForm {
  if (!c) return { ...EMPTY_HIRING_CRITERIA, minEducationId: minEducationId ?? "" }
  return {
    minEducationId: minEducationId ?? "",
    minAge: c.minAge != null ? String(c.minAge) : "",
    maxAge: c.maxAge != null ? String(c.maxAge) : "",
  }
}

const inputCls = "w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"

export function HiringCriteriaFields({
  value,
  onChange,
}: {
  value: HiringCriteriaForm
  onChange: (v: HiringCriteriaForm) => void
}) {
  const levels = useEducationLevels().filter((l) => l.rank > 0)
  const set = (patch: Partial<HiringCriteriaForm>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        All optional. These become the default filters on the Manual and AI shortlisting pages, where you can still
        adjust them. Leave everything empty to hire without any education or age requirement.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1.5">Minimum education</label>
          <select
            value={value.minEducationId}
            onChange={(e) => set({ minEducationId: e.target.value })}
            className={inputCls}
          >
            <option value="">No minimum &ndash; anyone can apply</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">Candidates below this level are filtered out when shortlisting.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Age range (years)</label>
          <div className="flex items-center gap-2">
            <input type="number" min={14} max={80} placeholder="Min e.g. 20" value={value.minAge} onChange={(e) => set({ minAge: e.target.value })} className={inputCls} />
            <span className="text-muted-foreground">to</span>
            <input type="number" min={14} max={80} placeholder="Max e.g. 35" value={value.maxAge} onChange={(e) => set({ maxAge: e.target.value })} className={inputCls} />
          </div>
        </div>
      </div>
    </div>
  )
}
