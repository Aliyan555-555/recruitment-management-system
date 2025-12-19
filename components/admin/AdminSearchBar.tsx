"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Briefcase, User, MapPin, Mail, Phone, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import Link from "next/link"

interface Job {
    id: string
    title: string
    company: string
    employmentType: string
    status: string
    applicationCount: number
}

interface Candidate {
    id: string
    name: string
    email: string
    phone: string | null
    professionalGrade: string | null
    applicationCount: number
}

interface SearchResults {
    jobs: Job[]
    candidates: Candidate[]
}

export function AdminSearchBar() {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<SearchResults>({ jobs: [], candidates: [] })
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        const searchData = async () => {
            if (query.trim().length < 2) {
                setResults({ jobs: [], candidates: [] })
                setIsOpen(false)
                return
            }

            setIsLoading(true)
            try {
                const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`)
                if (!response.ok) {
                    throw new Error(`Search failed: ${response.statusText}`)
                }
                const data = await response.json()
                // Ensure data has the expected structure
                setResults({
                    jobs: Array.isArray(data?.jobs) ? data.jobs : [],
                    candidates: Array.isArray(data?.candidates) ? data.candidates : []
                })
                setIsOpen(true)
            } catch (error) {
                console.error("Search failed:", error)
                setResults({ jobs: [], candidates: [] })
                setIsOpen(false)
            } finally {
                setIsLoading(false)
            }
        }

        const debounceTimer = setTimeout(searchData, 300)
        return () => clearTimeout(debounceTimer)
    }, [query])

    const clearSearch = () => {
        setQuery("")
        setResults({ jobs: [], candidates: [] })
        setIsOpen(false)
    }

    const hasResults = (results?.jobs?.length ?? 0) > 0 || (results?.candidates?.length ?? 0) > 0

    return (
        <div ref={searchRef} className="relative w-full max-w-2xl">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search jobs, candidates..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-background border-border focus-visible:ring-2 focus-visible:ring-primary/20"
                />
                {query && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Search Results Dropdown */}
            {isOpen && query.trim().length >= 2 && (
                <Card className="absolute top-full mt-2 w-full max-h-[70vh] overflow-y-auto z-50 border-border shadow-xl">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <p className="mt-2 text-sm text-muted-foreground">Searching...</p>
                        </div>
                    ) : hasResults ? (
                        <div className="p-2">
                            {/* Jobs Section */}
                            {results.jobs.length > 0 && (
                                <div className="mb-4">
                                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Jobs ({results.jobs.length})
                                    </div>
                                    <div className="space-y-1">
                                        {results.jobs.map((job) => (
                                            <Link
                                                key={job.id}
                                                href={`/admin/jobs/${job.id}`}
                                                onClick={() => setIsOpen(false)}
                                                className="block"
                                            >
                                                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors group">
                                                    <div className="mt-0.5 p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20 transition-colors">
                                                        <Briefcase className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-semibold text-sm text-foreground truncate">
                                                                {job.title}
                                                            </h4>
                                                            <Badge
                                                                variant={job.status === "ACTIVE" ? "default" : "secondary"}
                                                                className="text-[10px] h-5"
                                                            >
                                                                {job.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                            <span className="font-medium">{job.company}</span>
                                                            <span>•</span>
                                                            <span>{job.employmentType.replace("_", " ")}</span>
                                                            <span>•</span>
                                                            <span>{job.applicationCount} applications</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Candidates Section */}
                            {results.candidates.length > 0 && (
                                <div>
                                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Candidates ({results.candidates.length})
                                    </div>
                                    <div className="space-y-1">
                                        {results.candidates.map((candidate) => (
                                            <Link
                                                key={candidate.id}
                                                href={`/admin/candidates/${candidate.id}`}
                                                onClick={() => setIsOpen(false)}
                                                className="block"
                                            >
                                                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors group">
                                                    <div className="mt-0.5 p-2 rounded-lg bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/20 transition-colors">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-semibold text-sm text-foreground">
                                                                {candidate.name}
                                                            </h4>
                                                            {candidate.professionalGrade && (
                                                                <Badge variant="outline" className="text-[10px] h-5">
                                                                    {candidate.professionalGrade}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="space-y-0.5 text-xs text-muted-foreground">
                                                            <div className="flex items-center gap-1.5">
                                                                <Mail className="h-3 w-3" />
                                                                <span className="truncate">{candidate.email}</span>
                                                            </div>
                                                            {candidate.phone && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <User className="h-3 w-3" />
                                                                    <span>@{candidate.phone}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                                <Search className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No results found</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Try searching with different keywords
                            </p>
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}
