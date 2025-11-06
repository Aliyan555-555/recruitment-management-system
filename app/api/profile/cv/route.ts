import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = BigInt(session.user.id)

    const cvs = await prisma.cvManagerCv.findMany({
      where: {
        userId,
        deletedAt: null
      },
      orderBy: { updatedAt: "desc" }
    })

    return NextResponse.json({
      cvs: cvs.map(cv => ({
        id: cv.id.toString(),
        filename: cv.filename,
        filepath: cv.filepath,
        status: cv.status
      }))
    })
  } catch (error: any) {
    console.error("CV fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch CVs" },
      { status: 500 }
    )
  }
}

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

    // Validate file type
    const allowedTypes = ["application/pdf", "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), "uploads", "cvs")
    await mkdir(uploadDir, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    const filepath = join(uploadDir, filename)

    // Save file
    await writeFile(filepath, buffer)

    // Save to database
    const cv = await prisma.cvManagerCv.create({
      data: {
        userId: Number(session.user.id),
        filename: file.name,
        filepath: `/uploads/cvs/${filename}`,
        status: "active",
        createdAt: BigInt(Date.now()),
        updatedAt: BigInt(Date.now())
      }
    })

    return NextResponse.json({
      id: cv.id.toString(),
      filename: cv.filename,
      filepath: cv.filepath,
      status: cv.status
    })
  } catch (error) {
    console.error("CV upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload CV" },
      { status: 500 }
    )
  }
}

