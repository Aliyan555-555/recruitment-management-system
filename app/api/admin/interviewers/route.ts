import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/rbac"
import { createInterviewer, InterviewerServiceError, listInterviewers } from "@/lib/services/interviewer-service"

const createSchema = z.object({
  firstname: z.string().trim().min(1, "First name is required").max(100),
  lastname: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(100),
  phone: z.string().trim().max(20).optional().nullable(),
  department: z.string().trim().max(255).optional().nullable(),
})

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    return NextResponse.json({ interviewers: await listInterviewers() })
  } catch (error) {
    console.error("List interviewers error:", error)
    return NextResponse.json({ error: "Failed to load interviewers" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  try {
    const created = await createInterviewer(parsed.data)
    return NextResponse.json({ id: created.id.toString(), invited: created.invited }, { status: 201 })
  } catch (error) {
    if (error instanceof InterviewerServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Create interviewer error:", error)
    return NextResponse.json({ error: "Failed to create interviewer" }, { status: 500 })
  }
}
