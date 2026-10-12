"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { InboxItem } from "@/lib/scheduling/admin-inbox"

const DOT: Record<InboxItem["severity"], string> = {
  high: "bg-destructive",
  medium: "bg-amber-500",
  low: "bg-sky-500",
}

const MAX_VISIBLE = 6

export function ActionInbox() {
  const [items, setItems] = useState<InboxItem[] | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch("/api/admin/inbox")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
  }, [])

  if (items === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">To do today</CardTitle>
          <CardDescription>Checking your jobs…</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const visible = showAll ? items : items.slice(0, MAX_VISIBLE)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-foreground">To do today</CardTitle>
        <CardDescription>Everything that needs you across open jobs, most urgent first.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Nothing waiting on you. All rounds are moving.
          </p>
        ) : (
          <div className="divide-y">
            {visible.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", DOT[item.severity])} aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    {item.context && <p className="text-xs text-muted-foreground">{item.context}</p>}
                  </div>
                </div>
                <Button asChild size="sm" variant={item.severity === "high" ? "default" : "outline"}>
                  <Link href={item.href}>{item.actionLabel}</Link>
                </Button>
              </div>
            ))}
            {items.length > MAX_VISIBLE && (
              <button className="pt-3 text-sm text-primary hover:underline" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Show less" : `Show all ${items.length}`}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
