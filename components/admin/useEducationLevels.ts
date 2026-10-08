"use client"

import { useEffect, useState } from "react"

export interface EducationLevelOption {
  id: string
  name: string
  rank: number
}

let cache: EducationLevelOption[] | null = null

/** Education levels ordered lowest -> highest (shared by admin and candidate forms). */
export function useEducationLevels() {
  const [levels, setLevels] = useState<EducationLevelOption[]>(cache ?? [])
  useEffect(() => {
    if (cache) return
    fetch("/api/profile/education-levels")
      .then((r) => (r.ok ? r.json() : { levels: [] }))
      .then((d) => {
        cache = d.levels ?? []
        setLevels(cache!)
      })
      .catch(() => {})
  }, [])
  return levels
}
