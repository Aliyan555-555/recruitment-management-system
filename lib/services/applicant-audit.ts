import type { AuditAction } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type Db = Pick<typeof prisma, "auditLog">

/** Records shortlisting decisions / note edits on applications (entityType "JobsApplied"). */
export async function logApplicantAudit(
  entries: {
    applicationId: bigint
    pipelineId?: bigint | null
    action: AuditAction
    changes: Record<string, unknown>
  }[],
  adminId: bigint,
  db: Db = prisma
): Promise<void> {
  if (entries.length === 0) return
  const now = BigInt(Math.floor(Date.now() / 1000))
  await db.auditLog.createMany({
    data: entries.map((e) => ({
      pipelineId: e.pipelineId ?? null,
      userId: adminId,
      action: e.action,
      entityType: "JobsApplied",
      entityId: e.applicationId,
      changes: JSON.stringify(e.changes),
      timestamp: now,
    })),
  })
}
