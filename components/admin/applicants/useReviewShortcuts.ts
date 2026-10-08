"use client"

import { useEffect, useRef } from "react"

export type ShortcutMap = Partial<Record<string, () => void>>

/** Global key handler that ignores presses while typing in inputs/textareas/selects. */
export function useReviewShortcuts(map: ShortcutMap, enabled = true) {
  const mapRef = useRef(map)
  mapRef.current = map

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) {
        if (e.key !== "Escape") return
      }
      const handler = mapRef.current[e.key] ?? mapRef.current[e.key.toLowerCase()]
      if (handler) {
        e.preventDefault()
        handler()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [enabled])
}
