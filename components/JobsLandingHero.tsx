"use client"

import { useState } from "react"
import { Search, MapPin, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface JobsLandingHeroProps {
    onSearch: (filters: {
        search: string
        department: string
        location: string
    }) => void
    totalJobs: number
}

const departments = [
    "Information Technology",
    "Human Resources",
    "Finance",
    "Accounting",
    "Marketing",
    "Sales",
    "Operations",
    "Customer Support",
    "Engineering",
    "Research & Development",
    "Quality Assurance",
    "Administration"
]

const locations = [
    "Karachi",
    "Lahore",
    "Islamabad",
    "Rawalpindi",
    "Peshawar",
    "Quetta",
    "Multan",
    "Faisalabad",
    "Hyderabad"
]

export function JobsLandingHero({ onSearch, totalJobs }: JobsLandingHeroProps) {
    const [search, setSearch] = useState("")
    const [department, setDepartment] = useState("all")
    const [location, setLocation] = useState("all")

    const handleSearch = () => {
        onSearch({ search, department, location })
    }

    return (
        <div className="relative bg-gradient-to-b from-muted/50 to-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
                        Find Your Dream Job
                    </h1>
                    <p className="text-lg lg:text-xl text-muted-foreground mb-2 max-w-2xl mx-auto">
                        Discover exciting career opportunities with leading companies
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        <span className="font-medium">{totalJobs} active job openings</span>
                    </div>
                </div>

                {/* Modern Single Search Bar */}
                <div className="max-w-5xl mx-auto">
                    <div className="bg-background rounded-full shadow-2xl border border-border/50 p-2 flex flex-col lg:flex-row gap-2">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Search jobs, companies, or keywords..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-12 h-12 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base rounded-full"
                            />
                        </div>

                        {/* Department Dropdown */}
                        <div className="relative min-w-[200px]">
                            <Briefcase className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                            <Select value={department} onValueChange={setDepartment}>
                                <SelectTrigger className="h-12 border-0 bg-transparent focus:ring-0 focus:ring-offset-0 pl-11 rounded-full">
                                    <SelectValue placeholder="Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept} value={dept}>
                                            {dept}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Location Dropdown */}
                        <div className="relative min-w-[180px]">
                            <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                            <Select value={location} onValueChange={setLocation}>
                                <SelectTrigger className="h-12 border-0 bg-transparent focus:ring-0 focus:ring-offset-0 pl-11 rounded-full">
                                    <SelectValue placeholder="Location" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Locations</SelectItem>
                                    {locations.map((loc) => (
                                        <SelectItem key={loc} value={loc}>
                                            {loc}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search Button */}
                        <Button
                            onClick={handleSearch}
                            size="lg"
                            className="h-12 px-8 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
                        >
                            <Search className="h-4 w-4 mr-2" />
                            Search Jobs
                        </Button>
                    </div>

                    {/* Active Filters */}
                    {(search || department !== "all" || location !== "all") && (
                        <div className="flex flex-wrap items-center gap-2 mt-4 justify-center">
                            <span className="text-sm text-muted-foreground">Filters:</span>
                            {search && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                    &quot;{search}&quot;
                                    <button
                                        onClick={() => setSearch("")}
                                        className="ml-1 hover:bg-primary/20 rounded-full w-4 h-4 flex items-center justify-center"
                                    >
                                        ×
                                    </button>
                                </span>
                            )}
                            {department !== "all" && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                    {department}
                                    <button
                                        onClick={() => setDepartment("all")}
                                        className="ml-1 hover:bg-primary/20 rounded-full w-4 h-4 flex items-center justify-center"
                                    >
                                        ×
                                    </button>
                                </span>
                            )}
                            {location !== "all" && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                    {location}
                                    <button
                                        onClick={() => setLocation("all")}
                                        className="ml-1 hover:bg-primary/20 rounded-full w-4 h-4 flex items-center justify-center"
                                    >
                                        ×
                                    </button>
                                </span>
                            )}
                            <Button
                                onClick={() => {
                                    setSearch("")
                                    setDepartment("all")
                                    setLocation("all")
                                    onSearch({ search: "", department: "all", location: "all" })
                                }}
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7"
                            >
                                Clear all
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
