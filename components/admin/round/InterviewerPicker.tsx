"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Option {
  id: string
  name: string
  department: string | null
  hasAvailability: boolean
  selected: boolean
}

interface Props {
  roundId: string
  /** called after load/save so the page can gate publishing and refresh the checklist */
  onChange?: (state: { selected: number; panelSize: number }, saved: boolean) => void
}

export function InterviewerPicker({ roundId, onChange }: Props) {
  const [options, setOptions] = useState<Option[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [panelSize, setPanelSize] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")

  const apply = useCallback(
    (data: { panelSize: number; interviewers: Option[] }, fromSave: boolean) => {
      const ids = new Set(data.interviewers.filter((i) => i.selected).map((i) => i.id))
      setOptions(data.interviewers)
      setSelected(ids)
      setSaved(ids)
      setPanelSize(data.panelSize)
      onChange?.({ selected: ids.size, panelSize: data.panelSize }, fromSave)
    },
    [onChange]
  )

  useEffect(() => {
    let alive = true
    fetch(`/api/admin/steps/${roundId}/interviewers`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to load interviewers")
        return res.json()
      })
      .then((data) => alive && apply(data, false))
      .catch((err) => alive && toast.error(err instanceof Error ? err.message : "Failed to load interviewers"))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [roundId, apply])

  const dirty = useMemo(() => selected.size !== saved.size || [...selected].some((id) => !saved.has(id)), [selected, saved])
  const visible = options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()))

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/steps/${roundId}/interviewers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewerIds: [...selected] }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || "Failed to save interviewers")
      apply(body, true)
      toast.success("Interviewers saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save interviewers")
    } finally {
      setSaving(false)
    }
  }

  const short = selected.size < panelSize

  return (
    <Card id="round-interviewers">
      <CardHeader>
        <CardTitle>Interviewers for this round</CardTitle>
        <CardDescription>
          Choose who can run this round. Slots are built from their availability.
          {panelSize > 1 ? ` Each session needs ${panelSize} interviewers.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading interviewers…</p>
        ) : options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No interviewers yet. Add them under{" "}
            <a className="underline" href="/admin/interviewers" target="_blank" rel="noreferrer">
              Interviewers
            </a>
            , then come back.
          </p>
        ) : (
          <>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search interviewers" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((o) => {
                const checked = selected.has(o.id)
                return (
                  <label
                    key={o.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
                      checked ? "border-primary bg-primary/5" : "hover:bg-accent"
                    )}
                  >
                    <input type="checkbox" className="h-4 w-4 accent-primary" checked={checked} onChange={() => toggle(o.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{o.name}</span>
                      {o.department && <span className="block truncate text-xs text-muted-foreground">{o.department}</span>}
                    </span>
                    {!o.hasAvailability && (
                      <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        No availability
                      </span>
                    )}
                  </label>
                )
              })}
              {visible.length === 0 && <p className="text-sm text-muted-foreground">No match.</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!dirty || saving} onClick={save}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save interviewers
              </Button>
              <p className={cn("text-sm", short ? "text-destructive" : "text-muted-foreground")}>
                {selected.size} selected{panelSize > 1 ? `, ${panelSize} needed per session` : ""}
                {dirty ? " · unsaved changes" : ""}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
