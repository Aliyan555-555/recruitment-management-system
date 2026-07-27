export type VerifiedLevel =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "PROFESSIONAL"
  | "EXPERT"

export function formatVerifiedLevel(level: string | null | undefined): string {
  if (!level) return "Not verified"
  return level.charAt(0) + level.slice(1).toLowerCase()
}

const VERIFIED_LEVEL_DESCRIPTIONS: Record<VerifiedLevel, string> = {
  BEGINNER: "Foundational knowledge — understands core concepts",
  INTERMEDIATE: "Working proficiency — can apply skills independently",
  PROFESSIONAL: "Strong practical expertise — handles complex tasks",
  EXPERT: "Advanced mastery — deep expertise and best practices",
}

export function getVerifiedLevelDescription(
  level: string | null | undefined
): string | null {
  if (!level) return null
  return VERIFIED_LEVEL_DESCRIPTIONS[level as VerifiedLevel] ?? null
}

export function getVerifiedLevelBadgeClass(level: string | null | undefined): string {
  switch (level) {
    case "BEGINNER":
      return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-700"
    case "INTERMEDIATE":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800"
    case "PROFESSIONAL":
      return "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800"
    case "EXPERT":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

export function formatSkillPercentage(percentage: number | null | undefined): string {
  if (percentage == null) return "Not assessed"
  return `${percentage}%`
}

export function getSkillPercentageBadgeClass(
  percentage: number | null | undefined
): string {
  if (percentage == null) {
    return "bg-muted text-muted-foreground border-border"
  }

  if (percentage >= 90) {
    return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800"
  }
  if (percentage >= 70) {
    return "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800"
  }
  if (percentage >= 40) {
    return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800"
  }

  return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:border-slate-700"
}

export function formatCooldownRemaining(cooldownEndsAt: number | null): string | null {
  if (!cooldownEndsAt) return null

  const remainingMs = cooldownEndsAt * 1000 - Date.now()
  if (remainingMs <= 0) return null

  const totalMinutes = Math.ceil(remainingMs / (60 * 1000))
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    return days === 1 ? `1 day ${hours}h` : `${days} days ${hours}h`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}
