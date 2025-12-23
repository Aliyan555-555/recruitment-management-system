"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Briefcase,
  Users,
  Clock,
  TrendingUp,
  ArrowRight,
  Loader2,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Mock data for charts (replace with real data in production)
const chartData = [
  { name: 'Mon', applications: 4, interviews: 2 },
  { name: 'Tue', applications: 7, interviews: 1 },
  { name: 'Wed', applications: 5, interviews: 3 },
  { name: 'Thu', applications: 11, interviews: 5 },
  { name: 'Fri', applications: 9, interviews: 4 },
  { name: 'Sat', applications: 3, interviews: 1 },
  { name: 'Sun', applications: 2, interviews: 0 },
]

interface DashboardStats {
  totalJobs: number
  activeCandidates: number
  pendingInterviews: number
  completionRate: number
}

interface RecentPipeline {
  id: string
  candidateId: string
  candidateName: string
  candidateEmail: string
  jobTitle: string
  jobCompany: string
  status: string
  currentStep: number
  totalSteps: number
  completedSteps: number
  progressPercent: number
  startedAt: string
}

interface RecentJob {
  id: string
  title: string
  company: string
  applicationCount: number
  createdAt: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeCandidates: 0,
    pendingInterviews: 0,
    completionRate: 0,
  })
  const [recentPipelines, setRecentPipelines] = useState<RecentPipeline[]>([])
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/admin/dashboard")
      if (!response.ok) throw new Error("Failed to fetch dashboard data")
      const data = await response.json()
      setStats(data.stats)
      setRecentPipelines(data.recentPipelines || [])
      setRecentJobs(data.recentJobs || [])
    } catch (err) {
      console.error("Error fetching dashboard data:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      case "IN_PROGRESS": return "text-blue-500 bg-blue-500/10 border-blue-500/20"
      case "REJECTED": return "text-red-500 bg-red-500/10 border-red-500/20"
      case "ON_HOLD": return "text-amber-500 bg-amber-500/10 border-amber-500/20"
      default: return "text-muted-foreground bg-muted border-border"
    }
  }

  const StatCard = ({ title, value, description, icon: Icon, trend, trendUp }: any) => (
    <Card className="overflow-hidden border-border bg-card hover:bg-accent/5 transition-all shadow-sm dark:shadow-md dark:shadow-black/20 relative group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-20 h-20 text-foreground" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${trendUp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="z-10">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="flex items-center text-xs text-muted-foreground mt-1">
          {trend && (
            <span className={`flex items-center mr-1 ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
              {trendUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingUp className="w-3 h-3 mr-0.5 rotate-180" />}
              {trend}
            </span>
          )}
          {description}
        </div>
      </CardContent>
    </Card>
  )

  if (loading) return (
    <div className="flex items-center justify-center min-h-[600px]">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  )

  if (error) return (
    <div className="p-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
        <AlertCircle className="w-6 h-6 text-destructive" />
      </div>
      <h3 className="text-lg font-medium text-foreground">Something went wrong</h3>
      <p className="text-muted-foreground mb-4">{error}</p>
      <Button onClick={fetchDashboardData}>Try Again</Button>
    </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="hidden sm:flex border-border text-foreground hover:bg-accent hover:text-accent-foreground">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Last 7 Days
          </Button>
          <Link href="/admin/jobs/create">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
              <Briefcase className="mr-2 h-4 w-4" />
              Post New Job
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Jobs"
          value={stats.totalJobs}
          trend="+12%"
          trendUp={true}
          description="active postings"
          icon={Briefcase}
        />
        <StatCard
          title="Active Candidates"
          value={stats.activeCandidates}
          trend="+5%"
          trendUp={true}
          description="in pipeline"
          icon={Users}
        />
        <StatCard
          title="Interviews"
          value={stats.pendingInterviews}
          trend="+2"
          trendUp={true}
          description="scheduled today"
          icon={Clock}
        />
        <StatCard
          title="Hiring Rate"
          value={`${stats.completionRate}%`}
          trend="+1.2%"
          trendUp={true}
          description="this month"
          icon={CheckCircle2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <Card className="col-span-1 lg:col-span-4 border-border bg-card shadow-sm dark:shadow-md dark:shadow-black/20">
          <CardHeader>
            <CardTitle className="text-foreground">Application Overview</CardTitle>
            <CardDescription className="text-muted-foreground">Applications vs Interview sessions over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="applications" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorApps)" />
                  <Area type="monotone" dataKey="interviews" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInterviews)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-3 border-border bg-card shadow-sm dark:shadow-md dark:shadow-black/20">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Activity</CardTitle>
            <CardDescription className="text-muted-foreground">Latest updates from your team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[1, 2, 3, 4].map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <span className="relative flex shrink-0 overflow-hidden rounded-full w-9 h-9 border border-border">
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                      U{i}
                    </span>
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">
                      John Doe updated a candidate
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Moved Sarah Smith to <span className="text-primary font-medium">Technical Interview</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border bg-card shadow-sm dark:shadow-md dark:shadow-black/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Recent Candidates Applied</CardTitle>
              <CardDescription className="text-muted-foreground">Latest candidate applications with progress tracking</CardDescription>
            </div>
            <Link href="/admin/candidates" className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium hover:underline transition-colors">
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPipelines.slice(0, 5).map((pipeline) => (
                <Link
                  key={pipeline.id}
                  href={`/admin/candidates/${pipeline.id}`}
                  className="block"
                >
                  <div className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 group">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Avatar className="h-11 w-11 border-2 border-border group-hover:border-primary/50 transition-colors">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                            {pipeline.candidateName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-foreground truncate">{pipeline.candidateName}</p>
                            <Badge variant="outline" className={`${getStatusColor(pipeline.status)} border text-[10px] px-2 py-0 shrink-0`}>
                              {pipeline.status.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1 truncate">{pipeline.jobTitle}</p>
                          <p className="text-xs text-muted-foreground/70 truncate">{pipeline.jobCompany}</p>
                        </div>
                      </div>
                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-muted-foreground font-medium">Progress</span>
                          <span className="text-foreground font-semibold">{Math.round(pipeline.progressPercent)}%</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, pipeline.progressPercent))}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground shrink-0">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="font-medium">{pipeline.completedSteps}/{pipeline.totalSteps}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {(() => {
                              try {
                                const date = new Date(pipeline.startedAt);
                                return isNaN(date.getTime())
                                  ? 'N/A'
                                  : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                              } catch {
                                return 'N/A';
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {recentPipelines.length === 0 && (
                <div className="text-center py-12 px-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                    <Users className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">No recent candidates</h3>
                  <p className="text-xs text-muted-foreground">Candidates will appear here once they apply for jobs</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm dark:shadow-md dark:shadow-black/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Recent Job Postings</CardTitle>
              <CardDescription className="text-muted-foreground">Recently created opportunities</CardDescription>
            </div>
            <Link href="/admin/jobs" className="text-sm text-primary hover:text-primary/80 font-medium hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{job.applicationCount}</p>
                      <p className="text-xs text-muted-foreground">Applicants</p>
                    </div>
                    <Link href={`/admin/jobs/${job.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              {recentJobs.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                  No active jobs
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
