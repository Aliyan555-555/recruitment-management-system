"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2, Mail, MailPlus, Plus, Search, UserCheck, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Interviewer {
  id: string
  firstname: string
  lastname: string
  email: string
  phone: string | null
  department: string | null
  suspended: boolean
  hasLoggedIn: boolean
  stats: { assignedSteps: number; upcomingInterviews: number }
}

const EMPTY_FORM = { firstname: "", lastname: "", email: "", phone: "", department: "" }

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null)
  return body?.error || fallback
}

export default function InterviewersPage() {
  const [items, setItems] = useState<Interviewer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const res = await fetch("/api/admin/interviewers")
      if (!res.ok) throw new Error(await readError(res, "Failed to load interviewers"))
      const data = await res.json()
      setItems(data.interviewers ?? [])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load interviewers")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => `${i.firstname} ${i.lastname} ${i.email} ${i.department ?? ""}`.toLowerCase().includes(q))
  }, [items, query])

  const createInterviewer = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/admin/interviewers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await readError(res, "Failed to add interviewer"))
      const data = await res.json()
      toast.success(
        data.invited
          ? "Interviewer added. An invitation email was sent."
          : "Interviewer added, but the invitation email could not be sent. Use “Resend invite”."
      )
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add interviewer")
    } finally {
      setSaving(false)
    }
  }

  const toggleSuspended = async (item: Interviewer) => {
    setBusyId(item.id)
    try {
      const res = await fetch(`/api/admin/interviewers/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: !item.suspended }),
      })
      if (!res.ok) throw new Error(await readError(res, "Update failed"))
      toast.success(item.suspended ? "Interviewer reactivated" : "Interviewer suspended")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed")
    } finally {
      setBusyId(null)
    }
  }

  const resendInvite = async (item: Interviewer) => {
    setBusyId(item.id)
    try {
      const res = await fetch(`/api/admin/interviewers/${item.id}/invite`, { method: "POST" })
      if (!res.ok) throw new Error(await readError(res, "Failed to send invitation"))
      const data = await res.json()
      data.invited ? toast.success("Invitation sent") : toast.error("Email could not be delivered. Check SMTP settings.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Interviewers</h2>
          <p className="mt-1 text-muted-foreground">
            People who run screening interviews and focus groups. They set their own availability.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add interviewer
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email or department"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : loadError ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" onClick={() => { setLoading(true); load() }}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            {items.length === 0
              ? "No interviewers yet. Add one to start scheduling interviews."
              : "No interviewers match your search."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {item.firstname} {item.lastname}
                    </p>
                    {item.suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : item.hasLoggedIn ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline">Invitation pending</Badge>
                    )}
                  </div>
                  <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {item.email}
                    {item.department ? ` · ${item.department}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.stats.upcomingInterviews} upcoming interview{item.stats.upcomingInterviews === 1 ? "" : "s"} ·
                    in {item.stats.assignedSteps} round{item.stats.assignedSteps === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!item.hasLoggedIn && !item.suspended && (
                    <Button variant="outline" size="sm" disabled={busyId === item.id} onClick={() => resendInvite(item)}>
                      <MailPlus className="mr-2 h-4 w-4" />
                      Resend invite
                    </Button>
                  )}
                  <Button variant="outline" size="sm" disabled={busyId === item.id} onClick={() => toggleSuspended(item)}>
                    {item.suspended ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                    {item.suspended ? "Reactivate" : "Suspend"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
        <DialogContent>
          <form onSubmit={createInterviewer} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add interviewer</DialogTitle>
              <DialogDescription>
                They will receive an email to set their own password. No password is ever shared.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstname">First name</Label>
                <Input id="firstname" required value={form.firstname} onChange={(e) => setForm({ ...form, firstname: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastname">Last name</Label>
                <Input id="lastname" required value={form.lastname} onChange={(e) => setForm({ ...form, lastname: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department (optional)</Label>
                <Input id="department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add and send invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
