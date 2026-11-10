import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { ImportError } from "./import-service"
import type { SheetScope } from "./types"

/** Shared plumbing of the spreadsheet routes: admin check, id parsing, scope reading, error mapping. */

export async function adminOrResponse(): Promise<{ adminId: bigint } | NextResponse> {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
  return { adminId: BigInt(user.id) }
}

export const parseIdParam = (value: string): bigint | null => (/^\d+$/.test(value) ? BigInt(value) : null)

export const badRequest = (message: string, status = 400) => NextResponse.json({ error: message }, { status })

export function scopeFrom(get: (key: string) => string | null | undefined): SheetScope {
  const jobId = get("jobId")
  const stepId = get("stepId")
  return { ...(jobId ? { jobId } : {}), ...(stepId ? { stepId } : {}) }
}

export function importErrorResponse(error: unknown): NextResponse {
  if (error instanceof ImportError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }
  console.error("Spreadsheet route error:", error)
  return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 })
}
