"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, FileSignature, FileText, Loader2, MoreHorizontal, Search, Send, UserX, X } from "lucide-react"
import { JobPipelineHeaderLoader } from "@/components/admin/useJobPipeline"
import { RoundSubNav } from "@/components/admin/RoundSubNav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type LetterStatus = "DRAFTED" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED"
type Letter = "loi" | "offer"

interface OfferRow {
    id: string
    name: string
    email: string
    /** this round's pipeline step status */
    status: string
    loiStatus: LetterStatus | null
    offerStatus: LetterStatus | null
}

interface WorkflowStep {
    id: string
    stepName: string
    job?: { id: string; title: string }
}

/**
 * Offer round flow, per candidate:
 *   LOI: generate -> send -> candidate accepts / declines
 *   Offer letter (needs accepted LOI): generate -> send -> candidate accepts (hired) / declines
 */
type Stage =
    | "LOI_TODO"
    | "LOI_DRAFT"
    | "LOI_SENT"
    | "LOI_DECLINED"
    | "OFFER_TODO"
    | "OFFER_DRAFT"
    | "OFFER_SENT"
    | "HIRED"
    | "OFFER_DECLINED"
    | "REJECTED"

function stageOf(r: OfferRow): Stage {
    if (r.offerStatus === "ACCEPTED") return "HIRED"
    if (r.offerStatus === "REJECTED" || r.offerStatus === "EXPIRED") return "OFFER_DECLINED"
    if (r.status === "REJECTED") return "REJECTED"
    if (r.loiStatus === "ACCEPTED") {
        if (r.offerStatus === "SENT") return "OFFER_SENT"
        if (r.offerStatus === "DRAFTED") return "OFFER_DRAFT"
        return "OFFER_TODO"
    }
    if (r.loiStatus === "REJECTED" || r.loiStatus === "EXPIRED") return "LOI_DECLINED"
    if (r.loiStatus === "SENT") return "LOI_SENT"
    if (r.loiStatus === "DRAFTED") return "LOI_DRAFT"
    return "LOI_TODO"
}

const STAGE_INFO: Record<Stage, { label: string; tone: string }> = {
    LOI_TODO: { label: "Generate the Letter of Intent", tone: "text-foreground" },
    LOI_DRAFT: { label: "LOI drafted, not sent yet", tone: "text-foreground" },
    LOI_SENT: { label: "Waiting for candidate to respond to LOI", tone: "text-sky-600" },
    LOI_DECLINED: { label: "Candidate declined the LOI", tone: "text-rose-600" },
    OFFER_TODO: { label: "LOI accepted, generate the offer letter", tone: "text-foreground" },
    OFFER_DRAFT: { label: "Offer drafted, not sent yet", tone: "text-foreground" },
    OFFER_SENT: { label: "Waiting for candidate to respond to offer", tone: "text-sky-600" },
    HIRED: { label: "Offer accepted, hired", tone: "text-emerald-600" },
    OFFER_DECLINED: { label: "Candidate declined the offer", tone: "text-rose-600" },
    REJECTED: { label: "Rejected", tone: "text-muted-foreground" },
}

const FILTERS: Array<{ key: string; label: string; stages: Stage[] | null }> = [
    { key: "ALL", label: "All", stages: null },
    { key: "ACTION", label: "Needs action", stages: ["LOI_TODO", "LOI_DRAFT", "LOI_DECLINED", "OFFER_TODO", "OFFER_DRAFT"] },
    { key: "WAITING", label: "Waiting on candidate", stages: ["LOI_SENT", "OFFER_SENT"] },
    { key: "HIRED", label: "Hired", stages: ["HIRED"] },
    { key: "CLOSED", label: "Declined / rejected", stages: ["OFFER_DECLINED", "REJECTED"] },
]

const STATUS_TONE: Record<LetterStatus, string> = {
    DRAFTED: "bg-muted text-muted-foreground",
    SENT: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    ACCEPTED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    REJECTED: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    EXPIRED: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
}

const STATUS_LABEL: Record<LetterStatus, string> = {
    DRAFTED: "Draft",
    SENT: "Sent",
    ACCEPTED: "Accepted",
    REJECTED: "Declined",
    EXPIRED: "Expired",
}

type Confirm =
    | { kind: "SEND"; letter: Letter; row: OfferRow }
    | { kind: "RESPONSE"; letter: Letter; status: "ACCEPTED" | "REJECTED"; row: OfferRow }
    | { kind: "REJECT_CANDIDATE"; row: OfferRow }

const LETTER_NAME: Record<Letter, string> = { loi: "Letter of Intent", offer: "offer letter" }

async function readError(res: Response, fallback: string) {
    const body = await res.json().catch(() => null)
    return body?.error || fallback
}

function StatusPill({ status }: { status: LetterStatus | null }) {
    if (!status) return <span className="text-xs text-muted-foreground/60">Not created</span>
    return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_TONE[status])}>{STATUS_LABEL[status]}</span>
}

export default function OffersPage() {
    const params = useParams()
    const router = useRouter()
    const jobId = params.id as string
    const roundId = params.roundId as string
    const base = `/admin/jobs/${jobId}/rounds/${roundId}/candidates`

    const [rows, setRows] = useState<OfferRow[] | null>(null)
    const [workflowStep, setWorkflowStep] = useState<WorkflowStep | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [filter, setFilter] = useState("ALL")
    const [query, setQuery] = useState("")
    const [confirm, setConfirm] = useState<Confirm | null>(null)
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        try {
            const stepRes = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}`)
            if (stepRes.status === 404 || stepRes.status === 400) return router.replace(`/admin/jobs/${jobId}`)
            if (stepRes.ok) setWorkflowStep((await stepRes.json()).workflowStep)

            const res = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}/candidates`)
            if (!res.ok) throw new Error(await readError(res, "Failed to load candidates"))
            const data = await res.json()
            // PENDING = not admitted to this round yet
            const admitted: Array<{ id: string; name: string; email: string; status: string }> = (data.candidates || []).filter(
                (c: { status: string }) => c.status !== "PENDING"
            )

            const withLetters = await Promise.all(
                admitted.map(async (c): Promise<OfferRow> => {
                    const row: OfferRow = { id: c.id, name: c.name, email: c.email, status: c.status, loiStatus: null, offerStatus: null }
                    const loiRes = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}/candidates/${c.id}/loi`)
                    if (loiRes.ok) row.loiStatus = (await loiRes.json()).loi?.status ?? null
                    // the offer endpoint answers 400 until the LOI is accepted
                    if (row.loiStatus === "ACCEPTED") {
                        const offerRes = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}/candidates/${c.id}/offer`)
                        if (offerRes.ok) row.offerStatus = (await offerRes.json()).offerLetter?.status ?? null
                    }
                    return row
                })
            )
            setRows(withLetters)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load candidates")
        }
    }, [jobId, roundId, router])

    useEffect(() => {
        load()
    }, [load])

    const counts = useMemo(() => {
        const c: Record<string, number> = {}
        for (const f of FILTERS) c[f.key] = (rows ?? []).filter((r) => !f.stages || f.stages.includes(stageOf(r))).length
        return c
    }, [rows])

    const visible = useMemo(() => {
        const stages = FILTERS.find((f) => f.key === filter)?.stages
        const q = query.trim().toLowerCase()
        return (rows ?? []).filter(
            (r) => (!stages || stages.includes(stageOf(r))) && (!q || `${r.name} ${r.email}`.toLowerCase().includes(q))
        )
    }, [rows, filter, query])

    const runConfirm = async () => {
        if (!confirm) return
        setBusy(true)
        try {
            const { row } = confirm
            if (confirm.kind === "REJECT_CANDIDATE") {
                const res = await fetch(`/api/admin/jobs/${jobId}/rounds/${roundId}/candidates`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "reject", candidateIds: [row.id] }),
                })
                if (!res.ok) throw new Error(await readError(res, "Could not reject"))
                toast.success(`${row.name} rejected`)
            } else {
                const status = confirm.kind === "SEND" ? "SENT" : confirm.status
                const res = await fetch(`/api${base}/${row.id}/${confirm.letter}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status }),
                })
                if (!res.ok) throw new Error(await readError(res, "Could not update"))
                const name = LETTER_NAME[confirm.letter]
                toast.success(
                    status === "SENT"
                        ? `${name[0].toUpperCase()}${name.slice(1)} sent to ${row.name}`
                        : `Recorded: ${row.name} ${status === "ACCEPTED" ? "accepted" : "declined"} the ${name}`
                )
            }
            setConfirm(null)
            await load()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Action failed")
        } finally {
            setBusy(false)
        }
    }

    const rowButtons = (r: OfferRow) => {
        const stage = stageOf(r)
        type B = { key: string; label: string; icon: typeof Check; href?: string; onClick?: () => void; variant?: "default" | "outline" }
        const primary: B[] = []
        const more: B[] = []
        const loiHref = `${base}/${r.id}/loi`
        const offerHref = `${base}/${r.id}/offer`

        switch (stage) {
            case "LOI_TODO":
                primary.push({ key: "gen-loi", label: "Generate LOI", icon: FileSignature, href: loiHref })
                break
            case "LOI_DRAFT":
                primary.push({ key: "edit-loi", label: "Edit LOI", icon: FileText, href: loiHref, variant: "outline" })
                primary.push({ key: "send-loi", label: "Send LOI", icon: Send, onClick: () => setConfirm({ kind: "SEND", letter: "loi", row: r }) })
                break
            case "LOI_SENT":
                primary.push({ key: "view-loi", label: "View LOI", icon: FileText, href: loiHref, variant: "outline" })
                more.push({ key: "loi-yes", label: "Mark LOI accepted", icon: Check, onClick: () => setConfirm({ kind: "RESPONSE", letter: "loi", status: "ACCEPTED", row: r }) })
                more.push({ key: "loi-no", label: "Mark LOI declined", icon: X, onClick: () => setConfirm({ kind: "RESPONSE", letter: "loi", status: "REJECTED", row: r }) })
                break
            case "LOI_DECLINED":
                primary.push({ key: "view-loi", label: "View LOI", icon: FileText, href: loiHref, variant: "outline" })
                break
            case "OFFER_TODO":
                primary.push({ key: "view-loi", label: "View LOI", icon: FileText, href: loiHref, variant: "outline" })
                primary.push({ key: "gen-offer", label: "Generate Offer", icon: FileSignature, href: offerHref })
                break
            case "OFFER_DRAFT":
                primary.push({ key: "edit-offer", label: "Edit Offer", icon: FileText, href: offerHref, variant: "outline" })
                primary.push({ key: "send-offer", label: "Send Offer", icon: Send, onClick: () => setConfirm({ kind: "SEND", letter: "offer", row: r }) })
                more.push({ key: "view-loi", label: "View LOI", icon: FileText, href: loiHref })
                break
            case "OFFER_SENT":
                primary.push({ key: "view-offer", label: "View Offer", icon: FileText, href: offerHref, variant: "outline" })
                more.push({ key: "offer-yes", label: "Mark offer accepted", icon: Check, onClick: () => setConfirm({ kind: "RESPONSE", letter: "offer", status: "ACCEPTED", row: r }) })
                more.push({ key: "offer-no", label: "Mark offer declined", icon: X, onClick: () => setConfirm({ kind: "RESPONSE", letter: "offer", status: "REJECTED", row: r }) })
                more.push({ key: "view-loi", label: "View LOI", icon: FileText, href: loiHref })
                break
            case "HIRED":
            case "OFFER_DECLINED":
                primary.push({ key: "view-offer", label: "View Offer", icon: FileText, href: offerHref, variant: "outline" })
                more.push({ key: "view-loi", label: "View LOI", icon: FileText, href: loiHref })
                break
            case "REJECTED":
                if (r.loiStatus) primary.push({ key: "view-loi", label: "View LOI", icon: FileText, href: loiHref, variant: "outline" })
                break
        }

        if (!["HIRED", "OFFER_DECLINED", "REJECTED"].includes(stage)) {
            more.push({ key: "reject", label: "Reject candidate", icon: UserX, onClick: () => setConfirm({ kind: "REJECT_CANDIDATE", row: r }) })
        }

        return (
            <div className="flex flex-wrap items-center justify-end gap-2">
                {primary.map((b) =>
                    b.href ? (
                        <Button key={b.key} size="sm" variant={b.variant ?? "default"} asChild>
                            <Link href={b.href}>
                                <b.icon className="mr-1 h-3.5 w-3.5" />
                                {b.label}
                            </Link>
                        </Button>
                    ) : (
                        <Button key={b.key} size="sm" variant={b.variant ?? "default"} onClick={b.onClick}>
                            <b.icon className="mr-1 h-3.5 w-3.5" />
                            {b.label}
                        </Button>
                    )
                )}
                {more.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label="More actions">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {more.map((b) =>
                                b.href ? (
                                    <DropdownMenuItem key={b.key} asChild className="cursor-pointer">
                                        <Link href={b.href}>
                                            <b.icon className="mr-2 h-4 w-4" />
                                            {b.label}
                                        </Link>
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem key={b.key} onSelect={b.onClick} className="cursor-pointer">
                                        <b.icon className="mr-2 h-4 w-4" />
                                        {b.label}
                                    </DropdownMenuItem>
                                )
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        )
    }

    const confirmText = (c: Confirm) => {
        if (c.kind === "REJECT_CANDIDATE") {
            return {
                title: `Reject ${c.row.name}?`,
                body: "Their application will be closed. This cannot be undone from this page.",
                action: "Reject",
                destructive: true,
            }
        }
        const name = LETTER_NAME[c.letter]
        if (c.kind === "SEND") {
            return {
                title: `Send the ${name}?`,
                body: `${c.row.name} will be emailed and can accept or decline it from their application page.`,
                action: "Send",
                destructive: false,
            }
        }
        const accepted = c.status === "ACCEPTED"
        return {
            title: `Mark ${name} as ${accepted ? "accepted" : "declined"}?`,
            body:
                `Use this when ${c.row.name} replied outside the portal.` +
                (c.letter === "offer"
                    ? accepted
                        ? " They will be marked as hired."
                        : " Their application will be closed."
                    : accepted
                        ? " You can then generate the offer letter."
                        : ""),
            action: accepted ? "Mark accepted" : "Mark declined",
            destructive: !accepted,
        }
    }

    if (error) {
        return (
            <div className="space-y-4 p-6">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" onClick={load}>
                    Try again
                </Button>
            </div>
        )
    }
    if (!rows) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const c = confirm ? confirmText(confirm) : null

    return (
        <div className="space-y-6 p-6">
            <JobPipelineHeaderLoader jobId={jobId} currentStageId={roundId} />
            <RoundSubNav jobId={jobId} roundId={roundId} stepType="OFFER" activeView="offers" />

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/admin/jobs" className="transition-colors hover:text-foreground">
                    Jobs
                </Link>
                <span>/</span>
                <Link href={`/admin/jobs/${jobId}`} className="transition-colors hover:text-foreground">
                    {workflowStep?.job?.title || "Job"}
                </Link>
                <span>/</span>
                <span className="font-medium text-foreground">{workflowStep?.stepName || "Offer"}</span>
            </div>

            <ol className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {[
                    "Generate and send the Letter of Intent",
                    "Candidate accepts or declines the LOI",
                    "Generate and send the offer letter",
                    "Candidate accepts the offer and is hired",
                ].map((text, i) => (
                    <li key={text} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                            {i + 1}
                        </span>
                        <span className="text-muted-foreground">{text}</span>
                    </li>
                ))}
            </ol>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by stage">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            role="tab"
                            aria-selected={filter === f.key}
                            onClick={() => setFilter(f.key)}
                            className={cn(
                                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                                filter === f.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                            )}
                        >
                            {f.label}
                            <span className="ml-1.5 opacity-80">{counts[f.key] ?? 0}</span>
                        </button>
                    ))}
                </div>
                <div className="relative w-full lg:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
                </div>
            </div>

            {visible.length === 0 ? (
                <Card>
                    <CardContent className="p-10 text-center text-sm text-muted-foreground">
                        {rows.length === 0
                            ? "No one has reached the offer stage yet. Candidates appear here when they pass the previous round."
                            : "No candidates match this filter."}
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="divide-y p-0">
                        <div className="hidden gap-3 px-4 py-2 text-xs text-muted-foreground md:flex">
                            <span className="flex-1">Candidate</span>
                            <span className="md:w-24">LOI</span>
                            <span className="md:w-24">Offer</span>
                            <span className="md:w-64">Next step</span>
                            <span className="text-right md:w-80">Actions</span>
                        </div>
                        {visible.map((r) => {
                            const info = STAGE_INFO[stageOf(r)]
                            return (
                                <div key={r.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{r.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2 md:w-24">
                                        <span className="text-xs text-muted-foreground md:hidden">LOI</span>
                                        <StatusPill status={r.loiStatus} />
                                    </div>
                                    <div className="flex items-center gap-2 md:w-24">
                                        <span className="text-xs text-muted-foreground md:hidden">Offer</span>
                                        <StatusPill status={r.offerStatus} />
                                    </div>
                                    <p className={cn("text-sm md:w-64", info.tone)}>{info.label}</p>
                                    <div className="md:w-80">{rowButtons(r)}</div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            )}

            <div className="flex">
                <Button variant="outline" asChild>
                    <Link href={`/admin/jobs/${jobId}`}>Back to job</Link>
                </Button>
            </div>

            <Dialog open={!!confirm} onOpenChange={(o) => !busy && !o && setConfirm(null)}>
                <DialogContent>
                    {c && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{c.title}</DialogTitle>
                                <DialogDescription>{c.body}</DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>
                                    Back
                                </Button>
                                <Button variant={c.destructive ? "destructive" : "default"} disabled={busy} onClick={runConfirm}>
                                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {c.action}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
