import { NextRequest, NextResponse } from "next/server"
import { adminOrResponse, badRequest, importErrorResponse, parseIdParam } from "@/lib/spreadsheet/api"
import { getImport, isReviewView } from "@/lib/spreadsheet/import-service"

// GET /api/admin/imports/[id]?view=changes|warnings|errors|duplicates|nochange|skipped|results&action=..&offset=..
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await adminOrResponse()
    if (admin instanceof NextResponse) return admin
    const id = parseIdParam(params.id)
    if (id === null) return badRequest("Invalid import.")

    const q = req.nextUrl.searchParams
    const view = q.get("view") ?? "changes"
    if (!isReviewView(view)) return badRequest("Invalid view.")
    const num = (key: string) => {
      const v = q.get(key)
      return v && /^\d+$/.test(v) ? Number(v) : undefined
    }

    return NextResponse.json(
      await getImport(id, { view, action: q.get("action") ?? undefined, offset: num("offset"), limit: num("limit") })
    )
  } catch (error) {
    return importErrorResponse(error)
  }
}
