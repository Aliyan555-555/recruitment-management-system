"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { ApplicantRow, ApplicantsResponse } from "@/lib/admin/applicant-serializers"
import type { ApplicantDetail, Decision } from "./types"

const OPTIMISTIC: Record<Decision, Partial<ApplicantRow>> = {
  select: { tab: "shortlisted", actionable: false, statusLabel: "Shortlisted", reviewFlag: null },
  reject: { tab: "rejected", actionable: false, statusLabel: "Rejected", reviewFlag: null },
  maybe: { tab: "maybe", reviewFlag: "MAYBE" },
  unmaybe: { tab: "to_review", reviewFlag: null },
}

const DONE_MESSAGE: Record<Decision, string> = {
  select: "Shortlisted",
  reject: "Rejected",
  maybe: "Marked as maybe",
  unmaybe: "Moved back to review",
}

/** Applicant list for a job with optimistic decisions and AI-run polling. */
export function useApplicants(jobId: string) {
  const [data, setData] = useState<ApplicantsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0) // bumps after every saved decision (header counts, detail cache)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/applicants`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load applicants")
      setData(json)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Poll only while an AI run is in progress (single stable interval)
  const running = data?.aiRun?.status === "RUNNING" && !data.aiRun.isStale
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => refreshRef.current(), 4000)
    return () => clearInterval(t)
  }, [running])

  const decide = useCallback(
    async (candidateIds: string[], action: Decision): Promise<boolean> => {
      if (candidateIds.length === 0) return false
      const ids = new Set(candidateIds)
      const before = data
      setData((d) =>
        d ? { ...d, applicants: d.applicants.map((a) => (ids.has(a.candidateId) ? { ...a, ...OPTIMISTIC[action] } : a)) } : d
      )
      try {
        const res = await fetch(`/api/admin/jobs/${jobId}/shortlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateIds, action }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || "Action failed")
        toast.success(candidateIds.length > 1 ? `${DONE_MESSAGE[action]}: ${candidateIds.length} candidates` : DONE_MESSAGE[action])
        setVersion((v) => v + 1)
        refresh() // sync server truth (pipeline status labels etc.)
        return true
      } catch (e: any) {
        setData(before)
        toast.error(e.message || "Action failed")
        return false
      }
    },
    [data, jobId, refresh]
  )

  const setHasNote = useCallback((candidateId: string, hasNote: boolean) => {
    setData((d) =>
      d ? { ...d, applicants: d.applicants.map((a) => (a.candidateId === candidateId ? { ...a, hasNote } : a)) } : d
    )
  }, [])

  return { data, loading, error, refresh, decide, setHasNote, version }
}

const detailCache = new Map<string, ApplicantDetail>()

/** Full profile for one applicant; cached per job+candidate+version. */
export function useApplicantDetail(jobId: string, candidateId: string | null, version: number) {
  const key = candidateId ? `${jobId}:${candidateId}:${version}` : null
  const [detail, setDetail] = useState<ApplicantDetail | null>(key ? detailCache.get(key) ?? null : null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!key || !candidateId) {
      setDetail(null)
      return
    }
    const cached = detailCache.get(key)
    if (cached) {
      setDetail(cached)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch(`/api/admin/jobs/${jobId}/applicants/${candidateId}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (cancelled) return
        if (!ok) throw new Error(j.error || "Failed to load profile")
        detailCache.set(key, j)
        setDetail(j)
      })
      .catch((e) => !cancelled && toast.error(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [key, jobId, candidateId])

  return { detail, loading }
}

/** Prefetch the next profiles so moving through candidates feels instant. */
const inFlight = new Set<string>()

export function prefetchApplicantDetail(jobId: string, candidateId: string, version: number) {
  const key = `${jobId}:${candidateId}:${version}`
  if (detailCache.has(key) || inFlight.has(key)) return
  inFlight.add(key)
  fetch(`/api/admin/jobs/${jobId}/applicants/${candidateId}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => j && detailCache.set(key, j))
    .catch(() => {})
    .finally(() => inFlight.delete(key))
}
