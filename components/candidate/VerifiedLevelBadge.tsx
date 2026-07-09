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
  if (level) {
    return <VerifiedLevelBadge level={level} className={className} />
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium border-dashed text-muted-foreground",
        className
      )}
    >
      Not AI verified
    </Badge>
  )
}
