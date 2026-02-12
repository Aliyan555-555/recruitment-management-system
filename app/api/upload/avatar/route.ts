import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { auth } from "@/lib/auth"
import {
  isCloudinaryConfigured,
  uploadImage,
  validateImageFile,
  CLOUDINARY,
} from "@/lib/cloudinary"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const validation = validateImageFile(file, {
      maxFileSize: CLOUDINARY.MAX_FILE_SIZE,
      allowedMimeTypes: CLOUDINARY.ALLOWED_MIME_TYPES,
    })
    if (validation) {
      return NextResponse.json({ error: validation.message }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const mimeType = file.type || "image/jpeg"

    if (isCloudinaryConfigured()) {
      const result = await uploadImage(buffer, mimeType, {
        folder: CLOUDINARY.FOLDERS.AVATARS,
        publicIdPrefix: `user-${session.user.id}`,
      })
      return NextResponse.json({ path: result.secureUrl })
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const extension = file.name.split(".").pop() || "jpg"
    const filename = `profile-${session.user.id}-${uniqueSuffix}.${extension}`

    const uploadDir = join(process.cwd(), "public", "uploads", "avatars")
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch {
      // Ignore if directory exists
    }

    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)
    const publicPath = `/uploads/avatars/${filename}`

    return NextResponse.json({ path: publicPath })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file" },
      { status: 500 }
    )
  }
}
