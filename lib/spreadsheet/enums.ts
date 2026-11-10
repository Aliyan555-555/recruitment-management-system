import type { EnumOption } from "./types"

/**
 * Dropdown values come from the system's own enums (Prisma), so a new enum value shows up in the sheet
 * without touching templates. Only the display labels are defined here.
 */

export function humanize(value: string): string {
  const spaced = value.replace(/_/g, " ").toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** Builds dropdown options from enum values; `labels` overrides the generated "Strong hire" style label. */
export function enumOptions(values: readonly string[], labels: Record<string, string> = {}): EnumOption[] {
  return values.map((value) => ({ value, label: labels[value] ?? humanize(value) }))
}

const squash = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "")

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = row
  }
  return prev[b.length]
}

export type EnumMatch =
  | { ok: true; option: EnumOption }
  | { ok: false; suggestion: EnumOption | null }

/** Accepts the label or the system value, ignoring case, spaces, "_" and "-"; otherwise suggests the closest one. */
export function matchEnum(input: string, options: EnumOption[]): EnumMatch {
  const wanted = squash(input)
  const exact = options.find((o) => squash(o.value) === wanted || squash(o.label) === wanted)
  if (exact) return { ok: true, option: exact }

  let best: { option: EnumOption; distance: number } | null = null
  for (const option of options) {
    const distance = Math.min(levenshtein(wanted, squash(option.label)), levenshtein(wanted, squash(option.value)))
    if (!best || distance < best.distance) best = { option, distance }
  }
  // a typo, not a different word: allow about one edit per 4 characters, at least 1
  const limit = Math.max(1, Math.floor(wanted.length / 4))
  return { ok: false, suggestion: best && best.distance <= limit ? best.option : null }
}
