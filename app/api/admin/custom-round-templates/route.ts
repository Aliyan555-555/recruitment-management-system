import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/rbac"
import { getCurrentTimestamp } from "@/lib/utils"
import { parseCustomRoundTemplateInput, serializeCustomRoundTemplate } from "@/lib/custom-rounds/rules"

export const runtime = "nodejs"

const NO_STORE = { "Cache-Control": "no-store" }

// GET /api/admin/custom-round-templates?active=true
export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user) return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })

    const activeOnly = req.nextUrl.searchParams.get("active") === "true"
    const rows = await prisma.customRoundTemplate.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: "asc" },
    })

    // How many jobs use each template, so the settings page can explain why deleting is blocked.
    const usage = await prisma.workflowStep.groupBy({
      by: ["customRoundTemplateId"],
      where: { customRoundTemplateId: { in: rows.map((row) => row.id) } },
      _count: { _all: true },
    })
    const usedBy = new Map(usage.map((item) => [item.customRoundTemplateId!.toString(), item._count._all]))

    return NextResponse.json(
      { templates: rows.map((row) => ({ ...serializeCustomRoundTemplate(row), usedByJobs: usedBy.get(row.id.toString()) ?? 0 })) },
      { headers: NO_STORE }
    )
  } catch (error) {
    console.error("[Custom rounds] list failed:", error)
    return NextResponse.json({ error: "Failed to load custom rounds" }, { status: 500 })
  }
}

// POST /api/admin/custom-round-templates
export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user) return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })

    const parsed = parseCustomRoundTemplateInput(await req.json().catch(() => null))
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const input = parsed.value

    const duplicate = await prisma.customRoundTemplate.findFirst({
      where: { name: { equals: input.name, mode: "insensitive" } },
      select: { id: true },
    })
    if (duplicate) {
      return NextResponse.json({ error: `A custom round named "${input.name}" already exists` }, { status: 409 })
    }

    const now = BigInt(getCurrentTimestamp())
    const created = await prisma.customRoundTemplate.create({
      data: {
        name: input.name,
        description: input.description || null,
        candidateInstructions: input.candidateInstructions || null,
        isInterview: input.isInterview,
        interviewMode: input.interviewMode ?? null,
        durationMins: input.durationMins ?? null,
        panelSize: input.panelSize,
        bufferMins: input.bufferMins,
        capacityPerSlot: input.capacityPerSlot,
        evaluationSchema: input.evaluation,
        isActive: input.isActive,
        createdAt: now,
        updatedAt: now,
      },
    })
    return NextResponse.json({ template: { ...serializeCustomRoundTemplate(created), usedByJobs: 0 } }, { status: 201 })
  } catch (error) {
    console.error("[Custom rounds] create failed:", error)
    return NextResponse.json({ error: "Failed to create custom round" }, { status: 500 })
  }
}
