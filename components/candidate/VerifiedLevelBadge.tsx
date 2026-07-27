import { Badge } from "@/components/ui/badge"
import {
  formatSkillPercentage,
  getSkillPercentageBadgeClass,
} from "@/lib/assessments/level-display"
import { cn } from "@/lib/utils"

export function SkillPercentageBadge({
  percentage,
  className,
}: {
  percentage: number | null | undefined
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium",
        getSkillPercentageBadgeClass(percentage),
        className
      )}
    >
      {formatSkillPercentage(percentage)}
    </Badge>
  )
}
