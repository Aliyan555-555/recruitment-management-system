import { prisma } from "@/lib/prisma"
import { DEFAULT_ORG_TIMEZONE } from "@/lib/timezone"

/** Organization timezone used for availability, slot display and emails. */
export async function getOrgTimeZone(): Promise<string> {
  try {
    const row = await prisma.organizationSettings.findFirst({ select: { timezone: true }, orderBy: { id: "asc" } })
    const tz = row?.timezone
    if (tz) {
      // throws RangeError for an unknown zone
      new Intl.DateTimeFormat("en-US", { timeZone: tz })
      return tz
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_ORG_TIMEZONE
}
