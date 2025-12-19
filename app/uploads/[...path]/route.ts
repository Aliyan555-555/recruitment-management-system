import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const CONTENT_TYPE_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return CONTENT_TYPE_MAP[ext] || "application/octet-stream"
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  try {
    const pathSegments = params.path ?? []

    if (pathSegments.length === 0) {
      return NextResponse.json({ error: "File not specified" }, { status: 400 })
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    const requestedPath = path.join(uploadsDir, ...pathSegments)

    if (!requestedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 })
    }

    const fileBuffer = await fs.readFile(requestedPath)
    const contentType = getContentType(requestedPath)
    const fileName = path.basename(requestedPath)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    console.error("Error serving upload:", error)
    return NextResponse.json(
      { error: "Failed to retrieve file" },
      { status: 500 }
    )
  }
}


