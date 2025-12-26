import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/organization - Get public organization settings
export async function GET() {
  try {
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
