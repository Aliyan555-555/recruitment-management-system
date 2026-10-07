"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bot, KeyRound, Save, Zap, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

interface AiSettingsView {
  endpoint: string
  model: string
  fallbackModel: string
  hasToken: boolean
  tokenHint: string | null
  effective: {
    endpoint: string
    model: string
    fallbackModel: string
    hasToken: boolean
    source: { token: string; endpoint: string; model: string }
  }
  defaults: { endpoint: string; model: string }
}

export function AiSettingsCard() {
  const [view, setView] = useState<AiSettingsView | null>(null)
  const [endpoint, setEndpoint] = useState("")
  const [model, setModel] = useState("")
  const [fallbackModel, setFallbackModel] = useState("")
  const [token, setToken] = useState("")
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const apply = (v: AiSettingsView) => {
    setView(v)
    setEndpoint(v.endpoint)
    setModel(v.model)
    setFallbackModel(v.fallbackModel)
    setToken("")
  }

  useEffect(() => {
    fetch("/api/admin/ai-settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => v && apply(v))
      .catch(() => toast.error("Failed to load AI settings"))
  }, [])

  const save = async (extra: { clearToken?: boolean } = {}) => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, model, fallbackModel, token, ...extra }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        apply(data.settings)
        toast.success("AI configuration saved")
      } else {
        toast.error(data.error ?? "Failed to save AI settings")
      }
    } catch {
      toast.error("Failed to save AI settings")
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    setTesting(true)
    try {
      const res = await fetch("/api/admin/ai-settings/test", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (data.ok) toast.success(`Connection OK — ${data.model} (${data.latencyMs} ms)`)
      else toast.error(data.error ?? "Connection test failed")
    } catch {
      toast.error("Connection test failed")
    } finally {
      setTesting(false)
    }
  }

  const tokenSourceLabel =
    view?.effective.source.token === "database"
      ? "Saved in settings (encrypted)"
      : view?.effective.source.token === "env"
        ? "Using server environment variable"
        : "Not configured"

  return (
    <Card className="border-t-4 border-t-violet-600 shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-violet-600" />
          <CardTitle>AI Configuration</CardTitle>
        </div>
        <CardDescription>
          Provider used for AI shortlisting, skill assessments and quick tests. Any OpenAI-compatible endpoint or
          Google Gemini works.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-2 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
          <span>
            The API token is encrypted before it is stored and is never sent back to the browser. Leave the token field
            blank to keep the current one.
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="ai-endpoint">Endpoint</Label>
            <Input
              id="ai-endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder={view?.defaults.endpoint ?? "https://openrouter.ai/api/v1"}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Active: {view?.effective.endpoint} ({view?.effective.source.endpoint})
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-model">Model</Label>
            <Input
              id="ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={view?.defaults.model ?? "openai/gpt-oss-20b:free"}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Active: {view?.effective.model} ({view?.effective.source.model})
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ai-fallback-model">Fallback model (optional)</Label>
            <Input
              id="ai-fallback-model"
              value={fallbackModel}
              onChange={(e) => setFallbackModel(e.target.value)}
              placeholder="A lighter / cheaper model, e.g. a flash-lite variant"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Used automatically when the main model is overloaded (503/429) or unavailable.
              {view?.effective.fallbackModel ? ` Active: ${view.effective.fallbackModel}` : " Active: none"}
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ai-token">API Token</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="ai-token"
                type="password"
                className="pl-9"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={view?.hasToken ? `•••••••• ${view.tokenHint ?? ""} (saved — enter new value to replace)` : "Paste API key"}
                autoComplete="new-password"
                spellCheck={false}
              />
            </div>
            <p className="text-xs text-muted-foreground">Status: {tokenSourceLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
          {view?.hasToken && (
            <Button variant="outline" disabled={saving} onClick={() => save({ clearToken: true })}>
              Remove saved token
            </Button>
          )}
          <Button variant="outline" onClick={test} disabled={testing || saving}>
            <Zap className="mr-2 h-4 w-4" />
            {testing ? "Testing..." : "Test connection"}
          </Button>
          <Button onClick={() => save()} disabled={saving} className="min-w-[150px]">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save AI Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
