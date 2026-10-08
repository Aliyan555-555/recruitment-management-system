import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Public (needed by the registration form): institute names only, no sensitive data.
export async function GET() {
  try {
    const institutes = await prisma.institute.findMany({
      where: { deletedAt: null, visible: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
    return NextResponse.json({
      institutes: institutes.map((i) => ({ id: i.id.toString(), name: i.name })),
    })
  } catch (error) {
    console.error("Error fetching institutes:", error)
    return NextResponse.json({ error: "Failed to fetch institutes" }, { status: 500 })
  }
}
