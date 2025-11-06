import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join("/")
    
    // Security: Prevent path traversal
    if (filePath.includes("..") || filePath.includes("~")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    // Only allow access to files in uploads/cvs directory
    if (!filePath.startsWith("uploads/cvs/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    const fullPath = join(process.cwd(), filePath)
    
    // Check if file exists
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Read file
    const fileBuffer = await readFile(fullPath)
    
    // Determine content type based on file extension
    const extension = filePath.split(".").pop()?.toLowerCase()
    const contentType = 
      extension === "pdf" ? "application/pdf" :
      extension === "doc" ? "application/msword" :
      extension === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" :
      "application/octet-stream"

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filePath.split("/").pop()}"`,
      },
    })
  } catch (error: any) {
    console.error("Error serving CV file:", error)
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    )
  }
}

