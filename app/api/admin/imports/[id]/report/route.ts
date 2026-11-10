import { NextResponse } from "next/server"
import { adminOrResponse, badRequest, importErrorResponse, parseIdParam } from "@/lib/spreadsheet/api"
import { buildProblemReport } from "@/lib/spreadsheet/import-service"
import { XLSX_MIME } from "@/lib/spreadsheet/types"

// GET /api/admin/imports/[id]/report - rows that need attention, as a sheet that can be fixed and re-uploaded
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = await adminOrResponse()
    if (admin instanceof NextResponse) return admin
    const id = parseIdParam(params.id)
    if (id === null) return badRequest("Invalid import.")

    const report = await buildProblemReport(id)
    if (!report) return badRequest("There are no problem rows to download.", 404)
    return new NextResponse(new Uint8Array(report.buffer), {
      headers: {
        "Content-Type": XLSX_MIME,
        "Content-Disposition": `attachment; filename="${report.fileName}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return importErrorResponse(error)
  }
}
