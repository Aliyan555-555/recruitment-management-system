import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/organization - Get public organization settings
export async function GET() {
  try {
    const settings = await prisma.organizationSettings.findFirst({
      select: {
        name: true,
        logo: true,
        website: true,
        contactEmail: true,
        contactPhone: true,
        address: true,
        description: true,
        socialLinks: true
      }
    })

    if (!settings) {
      return NextResponse.json({
        name: "TalentHub", // Default name
        logo: null
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error fetching organization settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
