import { createHmac, timingSafeEqual } from "node:crypto"
import type { FileIssue, SheetScope, TemplateDef } from "./types"

/**
 * The hidden `_Meta` sheet says which screen, job and round a file was downloaded for. It is signed, so a
 * sheet edited by hand (or taken from another job) is rejected before any row is read.
 */

export interface SheetMeta {
  v: 1
  type: string
  version: number
  scope: SheetScope
  generatedAt: number
  columns: string[]
}

const secretFromEnv = () => {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  if (!secret) throw new Error("NEXTAUTH_SECRET (or AUTH_SECRET) is required to sign spreadsheets")
  return secret
}

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("hex")

export function createMeta(template: TemplateDef, scope: SheetScope, now = Math.floor(Date.now() / 1000)): SheetMeta {
  return {
    v: 1,
    type: template.type,
    version: template.version,
    scope,
    generatedAt: now,
    columns: template.columns.map((c) => c.key),
  }
}

export function serializeMeta(meta: SheetMeta, secret = secretFromEnv()): { payload: string; signature: string } {
  const payload = JSON.stringify(meta)
  return { payload, signature: sign(payload, secret) }
}

export function verifyMeta(
  payload: unknown,
  signature: unknown,
  secret = secretFromEnv()
): { ok: true; meta: SheetMeta } | { ok: false } {
  if (typeof payload !== "string" || typeof signature !== "string") return { ok: false }
  const expected = Buffer.from(sign(payload, secret), "hex")
  const given = Buffer.from(signature, "hex")
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false }
  try {
    const meta = JSON.parse(payload) as SheetMeta
    if (meta?.v !== 1 || typeof meta.type !== "string") return { ok: false }
    return { ok: true, meta }
  } catch {
    return { ok: false }
  }
}

/** The file must belong to this template version and to exactly this job/round. */
export function checkMetaMatches(meta: SheetMeta, expected: { template: TemplateDef; scope: SheetScope }): FileIssue | null {
  if (meta.type !== expected.template.type) {
    return { code: "WRONG_TEMPLATE", message: "This file was downloaded from a different screen. Download a sheet from this page." }
  }
  if (meta.version !== expected.template.version) {
    return { code: "OLD_TEMPLATE", message: "This sheet is from an older version. Download a fresh sheet and copy your changes over." }
  }
  const same = (a?: string, b?: string) => (a ?? null) === (b ?? null)
  if (!same(meta.scope.jobId, expected.scope.jobId) || !same(meta.scope.stepId, expected.scope.stepId)) {
    return { code: "WRONG_SCOPE", message: "This sheet was downloaded for a different job or round." }
  }
  return null
}
