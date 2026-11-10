import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { adminOrResponse, badRequest, importErrorResponse, scopeFrom } from "@/lib/spreadsheet/api"
import { buildWorkbook } from "@/lib/spreadsheet/build-xlsx"
import { getSheetModule } from "@/lib/spreadsheet/registry"
import { XLSX_MIME } from "@/lib/spreadsheet/types"

// GET /api/admin/sheets/[type]/download?jobId=..&stepId=.. - the sheet to fill in
export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
  try {
    const admin = await adminOrResponse()
    if (admin instanceof NextResponse) return admin

    if (checkRateLimit(`sheet-download:${admin.adminId}`, 60, 60 * 60 * 1000).limited) {
      return badRequest("Too many downloads. Try again later.", 429)
    }

    const mod = await getSheetModule(params.type)
    if (!mod) return badRequest("This kind of sheet isn't supported.", 404)

    const scope = scopeFrom((k) => req.nextUrl.searchParams.get(k))
    const problem = await mod.checkScope(scope)
    if (problem) return badRequest(problem)

    const rows = await mod.exportRows(scope)
    const buffer = await buildWorkbook(mod.template, rows, scope)
    const date = new Date().toISOString().slice(0, 10)
    const name = `${params.type.toLowerCase()}-job-${scope.jobId ?? "all"}-${date}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": XLSX_MIME,
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return importErrorResponse(error)
  }
}
