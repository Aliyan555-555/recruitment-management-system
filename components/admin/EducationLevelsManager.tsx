"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GraduationCap, Pencil, Trash2, Plus, X, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog"

interface EducationLevel {
    id: string
    name: string
    rank: number
}

const byRank = (a: EducationLevel, b: EducationLevel) => a.rank - b.rank || a.name.localeCompare(b.name)

export function EducationLevelsManager() {
    const [levels, setLevels] = useState<EducationLevel[]>([])
    const [loading, setLoading] = useState(false)
    const [newLevelName, setNewLevelName] = useState("")
    const [adding, setAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [newLevelRank, setNewLevelRank] = useState("")
    const [editRank, setEditRank] = useState("")

    useEffect(() => {
        fetchLevels()
    }, [])

    const fetchLevels = async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/admin/education-levels")
            if (res.ok) {
                const data = await res.json()
                setLevels(data.levels || [])
            }
        } catch (error) {
            console.error("Error fetching levels:", error)
            toast.error("Failed to load education levels")
        } finally {
            setLoading(false)
        }
    }

    const handleAdd = async () => {
        if (!newLevelName.trim()) return

        try {
            setAdding(true)
            const res = await fetch("/api/admin/education-levels", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newLevelName, rank: newLevelRank })
            })

            if (res.ok) {
                const data = await res.json()
                setLevels([...levels, data.level].sort(byRank))
                setNewLevelName("")
                setNewLevelRank("")
                toast.success("Education level added")
            } else {
                const data = await res.json()
                toast.error(data.error || "Failed to add level")
            }
        } catch (error) {
            console.error("Error adding level:", error)
            toast.error("Error adding level")
        } finally {
            setAdding(false)
        }
    }

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return

        try {
            const res = await fetch(`/api/admin/education-levels/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName, rank: editRank })
            })

            if (res.ok) {
                const data = await res.json()
                setLevels(levels.map(l => l.id === id ? data.level : l).sort(byRank))
                setEditingId(null)
                setEditName("")
                toast.success("Education level updated")
            } else {
                const data = await res.json()
                toast.error(data.error || "Failed to update level")
            }
        } catch (error) {
            console.error("Error updating level:", error)
            toast.error("Error updating level")
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/education-levels/${id}`, {
                method: "DELETE"
            })

            if (res.ok) {
                setLevels(levels.filter(l => l.id !== id))
                toast.success("Education level deleted")
            } else {
                const data = await res.json()
                toast.error(data.error || "Failed to delete level")
            }
        } catch (error) {
            console.error("Error deleting level:", error)
            toast.error("Error deleting level")
        }
    }

    return (
        <Card className="border-t-4 border-t-purple-600 shadow-md">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GraduationCap className="h-6 w-6 text-purple-600" />
                    <CardTitle>Education Levels</CardTitle>
                </div>
                <CardDescription>
                    Manage the education levels available for job requirements and candidate profiles. "Order" ranks levels from lowest to highest and is used for a job's minimum education.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex gap-4">
                    <Input
                        placeholder="Add new education level (e.g. Master's Degree)"
                        value={newLevelName}
                        onChange={(e) => setNewLevelName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        disabled={adding}
                    />
                    <Input
                        type="number"
                        min={0}
                        placeholder="Order"
                        title="Order: higher number = higher education. Used for 'minimum education' on jobs."
                        value={newLevelRank}
                        onChange={(e) => setNewLevelRank(e.target.value)}
                        className="w-24"
                        disabled={adding}
                    />
                    <Button onClick={handleAdd} disabled={adding || !newLevelName.trim()}>
                        {adding ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="h-4 w-4" />}
                        <span className="ml-2">Add</span>
                    </Button>
                </div>

                <div className="border rounded-lg divide-y bg-background">
                    {loading ? (
                        <div className="p-8 text-center text-muted-foreground flex justify-center">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : levels.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">No education levels defined yet.</div>
                    ) : (
                        levels.map(level => (
                            <div key={level.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                                {editingId === level.id ? (
                                    <div className="flex gap-2 flex-1 items-center animate-in fade-in duration-200">
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="h-9"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleUpdate(level.id);
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                        />
                                        <Input
                                            type="number"
                                            min={0}
                                            value={editRank}
                                            onChange={(e) => setEditRank(e.target.value)}
                                            className="h-9 w-24"
                                            title="Order: higher number = higher education"
                                        />
                                        <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleUpdate(level.id)}>
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setEditingId(null)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <span className="font-medium text-sm px-2">
                                        {level.name}
                                        <span className="ml-2 text-xs text-muted-foreground font-normal">order {level.rank}</span>
                                    </span>
                                )}

                                {editingId !== level.id && (
                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            onClick={() => {
                                                setEditingId(level.id)
                                                setEditName(level.name)
                                                setEditRank(String(level.rank))
                                            }}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>

                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Delete Education Level</DialogTitle>
                                                    <DialogDescription>
                                                        Are you sure you want to delete <span className="font-semibold text-foreground">"{level.name}"</span>?
                                                        <br /><br />
                                                        This action cannot be undone. If this level is used by active user profiles or job postings, the deletion will be prevented.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <DialogFooter className="gap-2 sm:gap-0">
                                                    <DialogClose asChild>
                                                        <Button variant="outline">Cancel</Button>
                                                    </DialogClose>
                                                    <Button variant="destructive" onClick={() => handleDelete(level.id)}>Delete</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
