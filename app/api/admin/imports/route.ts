import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { adminOrResponse, badRequest, importErrorResponse, scopeFrom } from "@/lib/spreadsheet/api"
import { findOpenImport, startImport } from "@/lib/spreadsheet/import-service"
import { MAX_FILE_BYTES } from "@/lib/spreadsheet/types"

// GET /api/admin/imports?type=..&jobId=..&stepId=.. - the unfinished import of this screen, if any
export async function GET(req: NextRequest) {
  try {
    const admin = await adminOrResponse()
    if (admin instanceof NextResponse) return admin
    const type = req.nextUrl.searchParams.get("type") ?? ""
    const open = await findOpenImport(type, scopeFrom((k) => req.nextUrl.searchParams.get(k)))
    return NextResponse.json({ open: open ? { ...open, mine: open.createdById === admin.adminId.toString() } : null })
  } catch (error) {
    return importErrorResponse(error)
  }
}

// POST /api/admin/imports (multipart: file, type, jobId, stepId) - checks the sheet; nothing is applied yet
export async function POST(req: NextRequest) {
  try {
    const admin = await adminOrResponse()
    if (admin instanceof NextResponse) return admin

    if (checkRateLimit(`sheet-upload:${admin.adminId}`, 30, 60 * 60 * 1000).limited) {
      return badRequest("Too many uploads. Try again later.", 429)
    }

    const form = await req.formData()
    const file = form.get("file")
    const type = String(form.get("type") ?? "")
    if (!(file instanceof File)) return badRequest("Choose a file to upload.")
    if (file.size > MAX_FILE_BYTES) return badRequest(`The file is larger than ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB.`, 413)
    if (!file.name.toLowerCase().endsWith(".xlsx")) return badRequest("Upload the sheet as an Excel file (.xlsx).")

    const result = await startImport({
      type,
      scope: scopeFrom((k) => (form.get(k) ? String(form.get(k)) : null)),
      fileName: file.name,
      buffer: Buffer.from(await file.arrayBuffer()),
      adminId: admin.adminId,
    })
    if (!result.ok) return NextResponse.json({ fatal: result.fatal }, { status: 422 })
    return NextResponse.json({ batchId: result.batchId, summary: result.summary, ignoredColumns: result.ignoredColumns })
  } catch (error) {
    return importErrorResponse(error)
  }
}
