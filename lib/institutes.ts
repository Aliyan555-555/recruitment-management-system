// Matching of free-text institute names to known Institute rows (name + aliases).
// Pure, so it works on the server and in tests. Candidates historically typed institutes as
// free text (instituteId never set), so matching happens at read time instead of a backfill.

export interface InstituteRef {
  id: string
  name: string
  aliases?: string[]
}

const NOISE_WORDS = new Set(["the", "of", "and", "at", "in", "for"])

export function normalizeInstituteName(raw: string | null | undefined): string {
  if (!raw) return ""
  return raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !NOISE_WORDS.has(w))
    .join(" ")
}

/** Returns the id of the institute whose name/alias equals the text (after normalizing). */
export function matchInstitute(text: string | null | undefined, institutes: InstituteRef[]): string | null {
  const needle = normalizeInstituteName(text)
  if (!needle) return null
  for (const inst of institutes) {
    const names = [inst.name, ...(inst.aliases ?? [])]
    if (names.some((n) => normalizeInstituteName(n) === needle)) return inst.id
  }
  // "NED University, Karachi" style: allow the text to start with an alias/name plus extra words
  // only when the alias is multi-word (single short aliases like "KU" must match exactly).
  for (const inst of institutes) {
    const names = [inst.name, ...(inst.aliases ?? [])]
    for (const n of names) {
      const norm = normalizeInstituteName(n)
      if (norm.includes(" ") && norm.length >= 8 && (needle.startsWith(norm + " ") || needle.endsWith(" " + norm))) {
        return inst.id
      }
    }
  }
  return null
}
