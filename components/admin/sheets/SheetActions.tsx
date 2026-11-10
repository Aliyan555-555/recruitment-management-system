"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { ImportWizard } from "./ImportWizard"

interface Scope {
  jobId?: string
  stepId?: string
}

interface OpenImport {
  id: string
  status: string
  fileName: string
  createdBy: string
  mine: boolean
}

const MAX_BYTES = 5 * 1024 * 1024

/**
 * Download / Upload buttons for one screen's sheet. After an upload the review popup opens; an interrupted
 * review (or commit) of this screen shows up as a banner so it can be resumed or discarded.
 */
export function SheetActions({ type, scope, onApplied }: { type: string; scope: Scope; onApplied?: () => void }) {
  const [busy, setBusy] = useState<"download" | "upload" | null>(null)
  const [fatal, setFatal] = useState<string[]>([])
  const [batchId, setBatchId] = useState<string | null>(null)
  const [open, setOpen] = useState<OpenImport | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const query = useCallback(() => {
    const q = new URLSearchParams()
    if (scope.jobId) q.set("jobId", scope.jobId)
    if (scope.stepId) q.set("stepId", scope.stepId)
    return q
  }, [scope.jobId, scope.stepId])

  const loadOpen = useCallback(async () => {
    try {
      const q = query()
      q.set("type", type)
      const res = await fetch(`/api/admin/imports?${q}`)
      if (!res.ok) return
      setOpen((await res.json()).open ?? null)
    } catch {
      /* the banner is a convenience; the buttons still work */
    }
  }, [query, type])

  useEffect(() => {
    loadOpen()
  }, [loadOpen])

  const download = async () => {
    setBusy("download")
    setFatal([])
    try {
      const res = await fetch(`/api/admin/sheets/${type}/download?${query()}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || "Couldn't download the sheet")
      }
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `${type.toLowerCase()}.xlsx`
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement("a")
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't download the sheet")
    } finally {
      setBusy(null)
    }
  }

  const upload = async (file: File) => {
    setFatal([])
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setFatal(["Upload the sheet as an Excel file (.xlsx)."])
      return
    }
    if (file.size > MAX_BYTES) {
      setFatal(["The file is larger than 5 MB."])
      return
    }
    setBusy("upload")
    try {
      const form = new FormData()
      form.set("file", file)
      form.set("type", type)
      if (scope.jobId) form.set("jobId", scope.jobId)
      if (scope.stepId) form.set("stepId", scope.stepId)
      const res = await fetch("/api/admin/imports", { method: "POST", body: form })
      const json = await res.json().catch(() => ({}))
      if (res.status === 422 && Array.isArray(json.fatal)) {
        setFatal(json.fatal.map((f: { message: string }) => f.message))
        return
      }
      if (!res.ok) throw new Error(json.error || "Couldn't check the file")
      setBatchId(json.batchId)
    } catch (e) {
      setFatal([e instanceof Error ? e.message : "Couldn't check the file"])
    } finally {
      setBusy(null)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const discardOpen = async () => {
    if (!open) return
    const res = await fetch(`/api/admin/imports/${open.id}/cancel`, { method: "POST" })
    if (!res.ok) toast.error((await res.json().catch(() => ({}))).error || "Couldn't discard the import")
    await loadOpen()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={download}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {busy === "download" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download sheet
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload sheet
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </div>

      {fatal.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300" role="alert">
          {fatal.map((m, i) => (
            <p key={i}>{m}</p>
          ))}
        </div>
      )}

      {open && !batchId && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
          <FileSpreadsheet className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            {open.mine ? "You have" : `${open.createdBy} has`} an unfinished import ({open.fileName},{" "}
            {open.status === "COMMITTING" ? "partly applied" : "not applied yet"}).
          </span>
          {open.mine && (
            <button type="button" onClick={() => setBatchId(open.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              {open.status === "COMMITTING" ? "Continue" : "Review"}
            </button>
          )}
          {open.status === "VALIDATED" && (
            <button type="button" onClick={discardOpen} className="rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-accent">
              Discard
            </button>
          )}
        </div>
      )}

      <ImportWizard
        batchId={batchId}
        onClose={() => {
          setBatchId(null)
          loadOpen()
        }}
        onApplied={() => onApplied?.()}
      />
    </div>
  )
}
