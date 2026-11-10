import { matchEnum } from "./enums"
import { normalizeEmail, normalizePhone } from "./dedupe"
import { cleanText, looksLikeFormula } from "./sanitize"
import type { CellPrimitive, ColumnDef, Issue } from "./types"

/** Turns what ExcelJS hands back for a cell (rich text, hyperlink, formula, date ...) into a plain value. */
export function cellToPrimitive(raw: unknown): { value: string | number | boolean | Date | null; issues: Issue[] } {
  const issues: Issue[] = []
  if (raw === null || raw === undefined) return { value: null, issues }
  if (raw instanceof Date) return { value: raw, issues }
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") return { value: raw, issues }

  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    if (Array.isArray(obj.richText)) {
      return { value: obj.richText.map((p: { text?: string }) => p?.text ?? "").join(""), issues }
    }
    if (typeof obj.error === "string") {
      issues.push({ severity: "error", code: "EXCEL_ERROR", message: `The cell shows an Excel error (${obj.error}).` })
      return { value: null, issues }
    }
    if ("formula" in obj || "sharedFormula" in obj) {
      // a formula's cached result is only there if the file was last saved by Excel/Sheets
      const result = obj.result
      if (result === undefined || result === null) {
        issues.push({
          severity: "error",
          code: "FORMULA_NO_RESULT",
          message: "The cell has a formula without a saved result. Paste it as a plain value.",
        })
        return { value: null, issues }
      }
      issues.push({ severity: "info", code: "FORMULA_VALUE", message: "A formula was replaced by its calculated value." })
      const inner = cellToPrimitive(result)
      return { value: inner.value, issues: [...issues, ...inner.issues] }
    }
    if (typeof obj.text === "string") return { value: obj.text, issues } // hyperlink
  }
  issues.push({ severity: "error", code: "UNSUPPORTED_CELL", message: "The cell has a value that can't be read." })
  return { value: null, issues }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function isRealDate(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

const err = (code: string, column: string, message: string): Issue => ({ severity: "error", code, column, message })
const warn = (code: string, column: string, message: string): Issue => ({ severity: "warning", code, column, message })

/** Validates and normalizes one cell against its column definition. Never throws. */
export function coerceCell(col: ColumnDef, raw: unknown): { value: CellPrimitive; issues: Issue[] } {
  const prim = cellToPrimitive(raw)
  const issues: Issue[] = prim.issues.map((i) => ({ ...i, column: col.key }))
  if (issues.some((i) => i.severity === "error")) return { value: null, issues }

  let v = prim.value
  if (typeof v === "string") {
    if (looksLikeFormula(v)) {
      issues.push(err("FORMULA_TEXT", col.key, `${col.header} starts with "=", which isn't allowed.`))
      return { value: null, issues }
    }
    v = cleanText(v)
    if (v === "") v = null
  }

  if (v === null) {
    if (col.required) issues.push(err("REQUIRED", col.key, `${col.header} is required.`))
    return { value: null, issues }
  }

  const label = col.header
  switch (col.type) {
    case "text": {
      const s = String(v instanceof Date ? v.toISOString() : v)
      const max = col.maxLength
      if (max && s.length > max) {
        issues.push(err("TOO_LONG", col.key, `${label} is ${s.length} characters; the limit is ${max}.`))
        return { value: null, issues }
      }
      return { value: s, issues }
    }

    case "email": {
      const s = normalizeEmail(String(v))
      if (!EMAIL_RE.test(s)) {
        issues.push(err("INVALID_EMAIL", col.key, `"${s}" isn't a valid email address.`))
        return { value: null, issues }
      }
      if (s.length > (col.maxLength ?? 100)) {
        issues.push(err("TOO_LONG", col.key, `${label} is longer than ${col.maxLength ?? 100} characters.`))
        return { value: null, issues }
      }
      return { value: s, issues }
    }

    case "phone": {
      const text = String(v).replace(/[\s()-]/g, "")
      const digits = text.replace(/^\+/, "")
      if (!/^\d{7,15}$/.test(digits)) {
        issues.push(err("INVALID_PHONE", col.key, `"${String(v)}" isn't a valid phone number (7 to 15 digits).`))
        return { value: null, issues }
      }
      if (typeof v === "number") {
        issues.push(warn("PHONE_AS_NUMBER", col.key, `${label} was stored as a number, so a leading zero may have been lost. Check it.`))
      }
      return { value: text, issues }
    }

    case "integer":
    case "number": {
      const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, ""))
      if (typeof v === "boolean" || v instanceof Date || !Number.isFinite(n)) {
        issues.push(err("NOT_A_NUMBER", col.key, `${label} must be a number.`))
        return { value: null, issues }
      }
      if (col.type === "integer" && !Number.isInteger(n)) {
        issues.push(err("NOT_AN_INTEGER", col.key, `${label} must be a whole number.`))
        return { value: null, issues }
      }
      if ((col.min !== undefined && n < col.min) || (col.max !== undefined && n > col.max)) {
        issues.push(err("OUT_OF_RANGE", col.key, `${label} must be between ${col.min ?? "-∞"} and ${col.max ?? "∞"}.`))
        return { value: null, issues }
      }
      return { value: n, issues }
    }

    case "date": {
      if (v instanceof Date) {
        if (Number.isNaN(v.getTime())) {
          issues.push(err("INVALID_DATE", col.key, `${label} isn't a valid date.`))
          return { value: null, issues }
        }
        return { value: v.toISOString().slice(0, 10), issues }
      }
      const m = typeof v === "string" ? ISO_DATE_RE.exec(v) : null
      if (!m || !isRealDate(Number(m[1]), Number(m[2]), Number(m[3]))) {
        issues.push(err("INVALID_DATE", col.key, `${label} must be a real date written as YYYY-MM-DD (got "${String(v)}").`))
        return { value: null, issues }
      }
      return { value: String(v), issues }
    }

    case "boolean": {
      const s = String(v).trim().toLowerCase()
      if (["yes", "y", "true", "1"].includes(s)) return { value: true, issues }
      if (["no", "n", "false", "0"].includes(s)) return { value: false, issues }
      issues.push(err("INVALID_BOOLEAN", col.key, `${label} must be Yes or No.`))
      return { value: null, issues }
    }

    case "enum": {
      const options = col.options ?? []
      const match = matchEnum(String(v), options)
      if (match.ok) return { value: match.option.value, issues }
      const hint = match.suggestion ? ` Did you mean "${match.suggestion.label}"?` : ""
      const shown = options.slice(0, 8).map((o) => o.label).join(", ") + (options.length > 8 ? ", ..." : "")
      issues.push(err("INVALID_ENUM", col.key, `"${String(v)}" isn't a valid ${label}.${hint} Allowed: ${shown}.`))
      return { value: null, issues }
    }
  }
}
