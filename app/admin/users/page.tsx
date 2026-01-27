"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users,
  Search,
  Filter,
  Loader2,
  User as UserIcon,
  Briefcase,
  Mail,
  Phone
} from "lucide-react"

interface User {
  id: string
  username: string
  email: string
  firstname: string
  lastname: string
  role: string
  phone1: string | null
  phone2: string | null
  institution: string | null
  department: string | null
  city: string | null
  country: string | null
  stats: {
    pipelines: number
    assignedSteps: number
    activeAssignments: number
  }
  createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchQuery, roleFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/admin/users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || `Failed to fetch users: ${response.statusText}`
        )
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch users"
      console.error("Error fetching users:", err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]

    // Filter by role
    if (roleFilter !== "all") {
      filtered = filtered.filter(u => u.role === roleFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(u =>
        (u.username?.toLowerCase() || "").includes(query) ||
        (u.email?.toLowerCase() || "").includes(query) ||
        `${u.firstname || ""} ${u.lastname || ""}`.toLowerCase().includes(query) ||
        (u.institution?.toLowerCase() || "").includes(query) ||
        (u.department?.toLowerCase() || "").includes(query)
      )
    }

    setFilteredUsers(filtered)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
      case "INTERVIEWER":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      case "CANDIDATE":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-destructive mb-2">
          Error Loading Users
        </h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchUsers} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === "ADMIN").length,
    interviewers: users.filter(u => u.role === "INTERVIEWER").length,
    candidates: users.filter(u => u.role === "CANDIDATE").length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <p className="text-muted-foreground mt-2">
          Manage all system users and their roles
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
            <p className="text-xs text-muted-foreground mt-1">Administrators</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interviewers</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.interviewers}</div>
            <p className="text-xs text-muted-foreground mt-1">Interviewers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidates</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.candidates}</div>
            <p className="text-xs text-muted-foreground mt-1">Candidates</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Filter and search through users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or institution..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="INTERVIEWER">Interviewer</SelectItem>
                <SelectItem value="CANDIDATE">Candidate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredUsers.length > 0 ? (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        {user.firstname} {user.lastname}
                      </p>
                      <Badge className={getRoleColor(user.role)}>
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      <Mail className="h-3 w-3 inline mr-1" />
                      {user.email}
                    </p>
                    {user.phone1 && (
                      <p className="text-xs text-muted-foreground mb-1">
                        <Phone className="h-3 w-3 inline mr-1" />
                        {user.phone1}
                      </p>
                    )}
                    {(user.institution || user.department) && (
                      <p className="text-xs text-muted-foreground">
                        <Briefcase className="h-3 w-3 inline mr-1" />
                        {user.institution} {user.department && `• ${user.department}`}
                      </p>
                    )}
                    {user.role === "INTERVIEWER" && (
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Assignments: {user.stats.activeAssignments}</span>
                        <span>Steps: {user.stats.assignedSteps}</span>
                      </div>
                    )}
                    {user.role === "CANDIDATE" && (
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Applications: {user.stats.pipelines}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {searchQuery || roleFilter !== "all"
                  ? "No users match your filters"
                  : "No users yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

