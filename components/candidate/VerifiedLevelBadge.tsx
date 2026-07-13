import { Badge } from "@/components/ui/badge"
import {
  formatVerifiedLevel,
  getVerifiedLevelBadgeClass,
  getVerifiedLevelDescription,
} from "@/lib/assessments/level-display"
import { cn } from "@/lib/utils"

export function VerifiedLevelBadge({
  level,
  className,
}: {
  level: string | null | undefined
  className?: string
}) {
  if (!level) return null

  const description = getVerifiedLevelDescription(level)

  return (
    <Badge
      variant="outline"
      title={description ?? undefined}
      className={cn("text-xs font-medium", getVerifiedLevelBadgeClass(level), className)}
    >
      AI verified: {formatVerifiedLevel(level)}
    </Badge>
  )
}

export function SkillVerificationBadge({
  level,
  className,
}: {
  level: string | null | undefined
  className?: string
}) {
  const displayLevel = level ?? "BEGINNER"

  if (displayLevel === "BEGINNER") {
    return (
      <Badge
        variant="outline"
        title={getVerifiedLevelDescription("BEGINNER") ?? undefined}
        className={cn(
          "text-xs font-medium",
          getVerifiedLevelBadgeClass("BEGINNER"),
          className
        )}
      >
        Beginner
      </Badge>
    )
  }

  return <VerifiedLevelBadge level={displayLevel} className={className} />
}
