import { createHash } from "node:crypto"

/** Identity helpers shared by every template, so "the same person/job" is decided in one place. */

export const sha256Hex = (data: Buffer | string) => createHash("sha256").update(data).digest("hex")

export const normalizeEmail = (value: string) => value.trim().toLowerCase()

/**
 * Digits only, with the Pakistani trunk forms folded together: 0300 1234567, +92 300 1234567 and
 * 00923001234567 all become 923001234567. Other countries keep their digits unchanged.
 */
export function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, "")
  if (digits.startsWith("00")) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith("0")) digits = `92${digits.slice(1)}`
  return digits
}

export const normalizeCnic = (value: string) => value.replace(/\D/g, "")

/** Lowercased, accent-folded, whitespace-collapsed text for fuzzy "is this the same job/city" comparisons. */
export const normalizeLoose = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()

/** One open import per screen: stored in ImportBatch.activeKey (UNIQUE) while the import is open. */
export const importActiveKey = (type: string, jobId?: string | null, stepId?: string | null) =>
  `${type}:${jobId ?? "-"}:${stepId ?? "-"}`

/** Groups items by key and returns only the keys that occur more than once. */
export function findDuplicates<T>(items: T[], keyOf: (item: T) => string | null | undefined): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    if (!key) continue
    const list = groups.get(key)
    if (list) list.push(item)
    else groups.set(key, [item])
  }
  for (const [key, list] of groups) if (list.length < 2) groups.delete(key)
  return groups
}
