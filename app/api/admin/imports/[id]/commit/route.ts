import { NextRequest, NextResponse } from "next/server"
import { adminOrResponse, badRequest, importErrorResponse, parseIdParam } from "@/lib/spreadsheet/api"
import { commitImportChunk } from "@/lib/spreadsheet/import-service"

// POST /api/admin/imports/[id]/commit { confirm: string[], strict?: boolean }
// Applies the next chunk; the browser calls it again until `done` is true.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await adminOrResponse()
    if (admin instanceof NextResponse) return admin
    const id = parseIdParam(params.id)
    if (id === null) return badRequest("Invalid import.")

    const body = await req.json().catch(() => ({}))
    const confirm: string[] = Array.isArray(body?.confirm)
      ? body.confirm.filter((c: unknown): c is string => typeof c === "string")
      : []
    return NextResponse.json(await commitImportChunk({ id, adminId: admin.adminId, confirm, strict: body?.strict === true }))
  } catch (error) {
    return importErrorResponse(error)
  }
}
