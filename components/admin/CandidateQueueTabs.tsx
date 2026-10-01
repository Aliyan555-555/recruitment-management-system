"use client"

import { cn } from "@/lib/utils"

export interface QueueTab {
  id: string
  label: string
  count: number
}

interface CandidateQueueTabsProps {
  tabs: QueueTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export function CandidateQueueTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: CandidateQueueTabsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2 border-b border-border pb-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
            activeTab === tab.id
              ? "bg-primary/10 text-primary border-b-2 border-primary -mb-[1px]"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {tab.label}
          <span
            className={cn(
              "ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold",
              activeTab === tab.id
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  )
}
