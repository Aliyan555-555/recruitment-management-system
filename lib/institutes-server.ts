import { prisma } from "@/lib/prisma"
import { matchInstitute } from "@/lib/institutes"

type Db = Pick<typeof prisma, "institute">

/**
 * Normalizes an institute submitted by a candidate: a valid instituteId wins (name is copied from
 * the list); otherwise typed text is matched against known names/aliases; otherwise stored as typed.
 */
export async function resolveInstituteForSave(
  rawId: unknown,
  rawText: unknown,
  db: Db = prisma
): Promise<{ instituteId: bigint | null; institute: string | null }> {
  const text = typeof rawText === "string" ? rawText.trim() : ""

  if (rawId != null && /^\d+$/.test(String(rawId))) {
    const found = await db.institute.findFirst({
      where: { id: BigInt(String(rawId)), deletedAt: null },
      select: { id: true, name: true },
    })
    if (found) return { instituteId: found.id, institute: found.name }
  }

  if (!text) return { instituteId: null, institute: null }

  const rows = await db.institute.findMany({
    where: { deletedAt: null, visible: true },
    select: { id: true, name: true, aliases: true },
  })
  const matched = matchInstitute(
    text,
    rows.map((r) => ({ id: r.id.toString(), name: r.name, aliases: r.aliases }))
  )
  if (matched) {
    const row = rows.find((r) => r.id.toString() === matched)!
    return { instituteId: row.id, institute: row.name }
  }
  return { instituteId: null, institute: text }
}
