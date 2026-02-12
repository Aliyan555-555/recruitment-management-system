import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/rbac"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import {
  isCloudinaryConfigured,
  uploadImage,
  validateImageFile,
  CLOUDINARY,
} from "@/lib/cloudinary"

// GET /api/admin/organization - Get organization settings
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await prisma.organizationSettings.findFirst()

    if (!settings) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      ...settings,
      id: settings.id.toString(),
      updatedAt: settings.updatedAt.toString()
    })
  } catch (error) {
    console.error("Error fetching organization settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/admin/organization - Update organization settings
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const name = formData.get("name") as string
    const website = formData.get("website") as string
    const contactEmail = formData.get("contactEmail") as string
    const contactPhone = formData.get("contactPhone") as string
    const address = formData.get("address") as string
    const description = formData.get("description") as string
    const logoFile = formData.get("logo") as File | null
    const socialLinksString = formData.get("socialLinks") as string
    const locationsString = formData.get("locations") as string
    
    let socialLinks = null
    try {
      if (socialLinksString) {
        socialLinks = JSON.parse(socialLinksString)
      }
    } catch (e) {
      console.error("Error parsing social links:", e)
    }

    let locations = null
    try {
      if (locationsString) {
        locations = JSON.parse(locationsString)
      }
    } catch (e) {
      console.error("Error parsing locations:", e)
    }

    let logoUrl: string | undefined
    if (logoFile && logoFile.size > 0) {
      const validation = validateImageFile(logoFile, {
        maxFileSize: CLOUDINARY.MAX_FILE_SIZE,
        allowedMimeTypes: CLOUDINARY.ALLOWED_MIME_TYPES,
      })
      if (validation) {
        return NextResponse.json(
          { error: validation.message },
          { status: 400 }
        )
      }

      const buffer = Buffer.from(await logoFile.arrayBuffer())
      const mimeType = logoFile.type || "image/png"

      if (isCloudinaryConfigured()) {
        try {
          const result = await uploadImage(buffer, mimeType, {
            folder: CLOUDINARY.FOLDERS.ORGANIZATION_LOGOS,
            publicIdPrefix: "logo",
          })
          logoUrl = result.secureUrl
        } catch (error) {
          console.error("Cloudinary logo upload error:", error)
          return NextResponse.json(
            { error: error instanceof Error ? error.message : "Logo upload failed." },
            { status: 500 }
          )
        }
      } else {
        const filename = `logo-${Date.now()}${path.extname(logoFile.name)}`
        const uploadDir = path.join(process.cwd(), "public/uploads/organization")
        try {
          await mkdir(uploadDir, { recursive: true })
          await writeFile(path.join(uploadDir, filename), buffer)
          logoUrl = `/uploads/organization/${filename}`
        } catch (error) {
          console.error("Error saving logo file:", error)
          return NextResponse.json(
            { error: "Failed to save logo." },
            { status: 500 }
          )
        }
      }
    }

    const now = BigInt(Math.floor(Date.now() / 1000))
    const existingSettings = await prisma.organizationSettings.findFirst()

    let updatedSettings
    if (existingSettings) {
      updatedSettings = await prisma.organizationSettings.update({
        where: { id: existingSettings.id },
        data: {
          name,
          website,
          contactEmail,
          contactPhone,
          address,
          description,
          socialLinks: socialLinks || undefined,
          locations: locations || undefined,
          ...(logoUrl && { logo: logoUrl }),
          updatedAt: now
        }
      })
    } else {
      updatedSettings = await prisma.organizationSettings.create({
        data: {
          name: name || "My Organization",
          website,
          contactEmail,
          contactPhone,
          address,
          description,
          socialLinks: socialLinks || undefined,
          locations: locations || undefined,
          logo: logoUrl,
          updatedAt: now
        }
      })
    }

    return NextResponse.json({
      success: true,
      settings: {
        ...updatedSettings,
        id: updatedSettings.id.toString(),
        updatedAt: updatedSettings.updatedAt.toString()
      }
    })
  } catch (error) {
    console.error("Error updating organization settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
