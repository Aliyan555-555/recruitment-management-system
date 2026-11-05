import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/rbac"
import { getCurrentTimestamp } from "@/lib/utils"
import { parseCustomRoundTemplateInput, serializeCustomRoundTemplate } from "@/lib/custom-rounds/rules"

export const runtime = "nodejs"

function parseId(raw: string): bigint | null {
  return /^\d+$/.test(raw) ? BigInt(raw) : null
}

// PUT /api/admin/custom-round-templates/[id]
// Jobs keep their own copy of a round, so editing a template only affects jobs created afterwards.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin()
    if (!user) return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })

    const id = parseId(params.id)
    if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

    const parsed = parseCustomRoundTemplateInput(await req.json().catch(() => null))
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const input = parsed.value

    const existing = await prisma.customRoundTemplate.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return NextResponse.json({ error: "Custom round not found" }, { status: 404 })

    const duplicate = await prisma.customRoundTemplate.findFirst({
      where: { name: { equals: input.name, mode: "insensitive" }, id: { not: id } },
      select: { id: true },
    })
    if (duplicate) {
      return NextResponse.json({ error: `A custom round named "${input.name}" already exists` }, { status: 409 })
    }

    const updated = await prisma.customRoundTemplate.update({
      where: { id },
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
        updatedAt: BigInt(getCurrentTimestamp()),
      },
    })
    const usedByJobs = await prisma.workflowStep.count({ where: { customRoundTemplateId: id } })
    return NextResponse.json({ template: { ...serializeCustomRoundTemplate(updated), usedByJobs } })
  } catch (error) {
    console.error("[Custom rounds] update failed:", error)
    return NextResponse.json({ error: "Failed to update custom round" }, { status: 500 })
  }
}

// DELETE /api/admin/custom-round-templates/[id] - only when no job uses it (deactivate otherwise)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdmin()
    if (!user) return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })

    const id = parseId(params.id)
    if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

    const usedByJobs = await prisma.workflowStep.count({ where: { customRoundTemplateId: id } })
    if (usedByJobs > 0) {
      return NextResponse.json(
        { error: `This round is used by ${usedByJobs} job round(s). Deactivate it instead of deleting it.` },
        { status: 409 }
      )
    }

    const result = await prisma.customRoundTemplate.deleteMany({ where: { id } })
    if (result.count === 0) return NextResponse.json({ error: "Custom round not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Custom rounds] delete failed:", error)
    return NextResponse.json({ error: "Failed to delete custom round" }, { status: 500 })
  }
}
