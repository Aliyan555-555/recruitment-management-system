import { NextResponse } from "next/server"
import { adminOrResponse, badRequest, importErrorResponse, parseIdParam } from "@/lib/spreadsheet/api"
import { cancelImport } from "@/lib/spreadsheet/import-service"

// POST /api/admin/imports/[id]/cancel - discards an unconfirmed import
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await adminOrResponse()
    if (admin instanceof NextResponse) return admin
    const id = parseIdParam(params.id)
    if (id === null) return badRequest("Invalid import.")
    await cancelImport(id)
    return NextResponse.json({ cancelled: true })
  } catch (error) {
    return importErrorResponse(error)
  }
}
