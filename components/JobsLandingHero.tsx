"use client"

import { useState } from "react"
import { Search, MapPin, Briefcase, Filter } from "lucide-react"
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

  const handleReset = () => {
    setSearch("")
    setDepartment("all")
    setLocation("all")
    onSearch({ search: "", department: "all", location: "all" })
  }

  return (
    <div className="relative bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
            Find Your Dream Job
          </h1>
          <p className="text-xl lg:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto">
            Discover exciting career opportunities with leading companies.
            Join thousands of professionals who found their perfect match.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            <span>{totalJobs} active job openings</span>
          </div>
        </div>

        {/* Search Section */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-background/95 backdrop-blur-md rounded-3xl border-2 shadow-2xl p-8 lg:p-10">
            {/* Main Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search jobs, companies, keywords..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-14 h-14 text-base border-2 focus:border-primary transition-colors"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Department Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Department
                </label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="h-12 border-2 focus:border-primary transition-colors">
                    <SelectValue placeholder="All Departments" />
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

              {/* Location Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Location
                </label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="h-12 border-2 focus:border-primary transition-colors">
                    <SelectValue placeholder="All Locations" />
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

              {/* Action Buttons */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground opacity-0 pointer-events-none">
                  Actions
                </label>
                <div className="flex gap-3 h-12">
                  <Button
                    onClick={handleSearch}
                    className="flex-1 h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="h-12 px-6 border-2 hover:bg-muted transition-colors"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Active Filters Display */}
            {(search || department !== "all" || location !== "all") && (
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
                <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
                {search && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    &quot;{search}&quot;
                    <button
                      onClick={() => setSearch("")}
                      className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
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
                      className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
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
                      className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                    >
                      ×
                    </button>
                  </span>
                )}
                <Button
                  onClick={handleReset}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
