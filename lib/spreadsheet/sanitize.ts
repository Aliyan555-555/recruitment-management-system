/**
 * Text hygiene for cells. Candidate-controlled text (a name like `=HYPERLINK(...)`) can turn into a formula
 * when an admin copies the sheet into another tool, so exported text that starts with a formula trigger is
 * prefixed with an apostrophe, and the apostrophe is removed again on import.
 */

const FORMULA_TRIGGER = /^[=+\-@\t\r]/
// every C0 control character except none: tab/newline inside a cell are not useful for any of our fields
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g

export function neutralizeFormula(value: string): string {
  return FORMULA_TRIGGER.test(value) ? `'${value}` : value
}

/** Reverse of neutralizeFormula: only an apostrophe that protects a formula trigger is removed. */
export function restoreFormula(value: string): string {
  return value.startsWith("'") && FORMULA_TRIGGER.test(value.slice(1)) ? value.slice(1) : value
}

/** Text going into a cell. Non-strings are returned unchanged. */
export function sanitizeForExport<T>(value: T): T | string {
  return typeof value === "string" ? neutralizeFormula(value) : value
}

/** Text read from a cell: normalized (NFC), control characters removed, trimmed, formula guard undone. */
export function cleanText(value: string): string {
  return restoreFormula(value.normalize("NFC").replace(CONTROL_CHARS, " ").trim())
}

/** A cell that carries a formula (starts with = after trimming) must never be trusted as text. */
export function looksLikeFormula(value: string): boolean {
  return value.trim().startsWith("=")
}
