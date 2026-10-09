"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface NotificationItem {
  id: string
  title: string
  message: string
  isRead: boolean
  entityType: string | null
  entityId: string | null
  createdAt: string
}

const POLL_MS = 60_000

function hrefFor(n: NotificationItem, role: string | undefined): string | null {
  if (role === "INTERVIEWER" && (n.entityType === "slot_booking" || n.entityType === "scorecard_overdue") && n.entityId) {
    return `/interviewer/interviews/${n.entityId}`
  }
  if (role === "CANDIDATE" && n.entityType === "pipeline" && n.entityId) return `/applications/${n.entityId}`
  if (role === "CANDIDATE" && n.entityType === "slot_booking") return "/applications"
  return null
}

function ago(createdAtSeconds: string): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - Number(createdAtSeconds))
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function NotificationBell({ className }: { className?: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)

  const load = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        fetch("/api/notifications?limit=10"),
        fetch("/api/notifications?unreadOnly=true&limit=1"),
      ])
      if (list.ok) setItems((await list.json()).notifications ?? [])
      if (count.ok) setUnread((await count.json()).total ?? 0)
    } catch {
      // the bell is non-critical: stay silent on network errors
    }
  }, [])

  useEffect(() => {
    if (!session?.user) return
    load()
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [session?.user, load])

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationIds: ids, isRead: true }),
    }).catch(() => undefined)
    load()
  }

  const open = (n: NotificationItem) => {
    if (!n.isRead) markRead([n.id])
    const href = hrefFor(n, session?.user?.role)
    if (href) router.push(href)
  }

  return (
    <DropdownMenu onOpenChange={(o) => o && load()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative", className)} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between pr-2">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {unread > 0 && (
            <button className="text-xs text-primary hover:underline" onClick={() => markRead(items.filter((i) => !i.isRead).map((i) => i.id))}>
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          items.map((n) => (
            <DropdownMenuItem key={n.id} className="flex cursor-pointer flex-col items-start gap-0.5 py-2" onSelect={() => open(n)}>
              <span className={cn("text-sm", !n.isRead && "font-semibold")}>{n.title}</span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{n.message}</span>
              <span className="text-[10px] text-muted-foreground">{ago(n.createdAt)}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
