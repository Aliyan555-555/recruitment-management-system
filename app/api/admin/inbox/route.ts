import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/rbac"
import { getAdminInbox } from "@/lib/scheduling/admin-inbox-service"

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    return NextResponse.json(await getAdminInbox())
  } catch (error) {
    console.error("Admin inbox error:", error)
    return NextResponse.json({ error: "Failed to load to-dos" }, { status: 500 })
  }
}
