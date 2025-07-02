"use client"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  ShieldCheck,
  AlertTriangle,
  Search,
  Filter,
  RotateCcw,
  Clock,
  Eye,
  CheckCircle,
  AlertCircle,
  Zap,
  Globe,
  Users,
  Database,
  Activity,
  MoreHorizontal,
  Archive,
  Flag,
  MessageSquare,
  ExternalLink,
  Download,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  MapPin,
  Shield,
  Wifi,
  Server,
} from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"

// API Alert type
interface ApiAlert {
  type: string
  ip: string
  date: string
  unique_ports: number
  pcr: number
  por: number
  p_value: number
  severity: "critical" | "high" | "medium" | "low"
  message: string
}

// UI Alert type
interface AlertUI {
  id: string
  severity: "critical" | "high" | "medium" | "low"
  type: string
  title: string
  description: string
  timestamp: string
  timeValue: number
  source: string
  destination: string
  status: string
  assignee: string
  tags: string[]
  affectedAssets: number
  confidence: number
  location: string
  firstSeen: string
  lastSeen: string
  riskScore: number
}

export default function AlertsPage() {
  // Fetch alerts from API
  const [alertsData, setAlertsData] = useState<AlertUI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters and sort states
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [timeRangeFilter, setTimeRangeFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<string>("timestamp")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Fetch alerts on mount
  useEffect(() => {
    setLoading(true)
    fetch("/api/alerts")
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch alerts")
        return res.json()
      })
      .then(data => {
        // Map API alerts to UI alerts
        const now = Date.now()
        const mapped: AlertUI[] = (data.alerts || []).map((a: ApiAlert, idx: number) => {
          // Calculate timeValue (minutes ago)
          let timeValue = 0
          let timestamp = a.date
          try {
            const alertDate = new Date(a.date)
            if (!isNaN(alertDate.getTime())) {
              timeValue = Math.floor((now - alertDate.getTime()) / 60000)
              if (timeValue < 1) timestamp = "just now"
              else if (timeValue < 60) timestamp = `${timeValue} minutes ago`
              else if (timeValue < 120) timestamp = `${(timeValue/60).toFixed(1)} hours ago`
              else timestamp = a.date
            }
          } catch {
            timestamp = a.date
          }
          return {
            id: `ALERT-${idx}-${a.ip}-${a.date}`,
            severity: a.severity,
            type: a.type,
            title: a.message.split(" (")[0],
            description: a.message,
            timestamp,
            timeValue,
            source: a.ip,
            destination: "N/A",
            status: "active",
            assignee: "Unassigned",
            tags: [a.type],
            affectedAssets: a.unique_ports,
            confidence: Math.round(a.p_value * 100),
            location: "-",
            firstSeen: a.date,
            lastSeen: a.date,
            riskScore: Math.round(a.p_value * 10 * 10) / 10 // 0-10, 1 decimal
          }
        })
        setAlertsData(mapped)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Filter alerts based on current filters
  const filteredAlerts = useMemo(() => {
    const filtered = alertsData.filter((alert) => {
      // Severity filter
      if (severityFilter !== "all" && alert.severity !== severityFilter) {
        return false
      }
      // Type filter
      if (typeFilter !== "all" && alert.type !== typeFilter) {
        return false
      }
      // Status filter
      if (statusFilter !== "all" && alert.status !== statusFilter) {
        return false
      }
      // Time range filter
      if (timeRangeFilter !== "all") {
        const timeLimit = Number.parseInt(timeRangeFilter)
        if (alert.timeValue > timeLimit) {
          return false
        }
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          alert.title.toLowerCase().includes(query) ||
          alert.description.toLowerCase().includes(query) ||
          alert.source.toLowerCase().includes(query) ||
          alert.id.toLowerCase().includes(query) ||
          alert.tags.some((tag) => tag.toLowerCase().includes(query))
        )
      }
      return true
    })
    // Sort alerts
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a]
      let bValue: any = b[sortBy as keyof typeof b]
      if (sortBy === "timestamp") {
        aValue = a.timeValue
        bValue = b.timeValue
      }
      if (sortBy === "severity") {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        aValue = severityOrder[a.severity]
        bValue = severityOrder[b.severity]
      }
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
    return filtered
  }, [alertsData, severityFilter, typeFilter, statusFilter, timeRangeFilter, searchQuery, sortBy, sortOrder])

  // Calculate filtered alert counts by severity
  const filteredAlertCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, total: 0 }
    filteredAlerts.forEach((alert) => {
      counts[alert.severity]++
      counts.total++
    })
    return counts
  }, [filteredAlerts])

  // Clear all filters
  const clearFilters = () => {
    setSeverityFilter("all")
    setTypeFilter("all")
    setStatusFilter("all")
    setTimeRangeFilter("all")
    setSearchQuery("")
    setSelectedAlerts([])
  }

  // Check if any filters are active
  const hasActiveFilters =
    severityFilter !== "all" ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    timeRangeFilter !== "all" ||
    searchQuery

  // Handle alert selection
  const toggleAlertSelection = (alertId: string) => {
    setSelectedAlerts((prev) => (prev.includes(alertId) ? prev.filter((id) => id !== alertId) : [...prev, alertId]))
  }

  const selectAllAlerts = () => {
    setSelectedAlerts(filteredAlerts.map((alert) => alert.id))
  }

  const clearSelection = () => {
    setSelectedAlerts([])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-900 text-zinc-100 relative overflow-hidden">
      {/* Animated background elements - Responsive sizes */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-32 sm:w-72 h-32 sm:h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-48 sm:w-96 h-48 sm:h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-40 sm:w-80 h-40 sm:h-80 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      {/* Header - Responsive */}
      <header className="border-b border-purple-500/20 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50 relative">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                CyberSense AI
              </h1>
            </Link>
            
            {/* Responsive Navigation - Always visible with smaller text on mobile */}
            <nav className="flex items-center gap-2 sm:gap-4 md:gap-6">
              <Link
                href="/dashboard"
                className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
              >
                Dashboard
              </Link>
              <span className="text-xs sm:text-sm font-medium text-purple-300">Alerts</span>
              <Link
                href="/reports"
                className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
              >
                Reports
              </Link>
              <Link
                href="/visualization"
                className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
              >
                <span className="hidden sm:inline">Visualization</span>
                <span className="sm:hidden">Visual</span>
              </Link>
              <ProfileDropdown />
            </nav>
          </div>
        </div>
      </header>
      
      {/* Main Content - Responsive */}
      <main className="relative py-6 sm:py-8">
        {/* Enhanced background for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-purple-950/50 to-gray-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-transparent to-transparent" />
        
        <div className="relative mx-auto max-w-7xl px-3 sm:px-6">
          {/* Page Header - Responsive */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-500/20 p-2 sm:p-3 border border-red-400/30 backdrop-blur-sm">
                  <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-300" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white">Security Alerts</h1>
                  <p className="text-base sm:text-lg text-zinc-200 mt-1">Monitor and respond to security threats in real-time</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent backdrop-blur-sm text-xs sm:text-sm"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Refresh
                </Button>
                <Button size="sm" className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-xs sm:text-sm">
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Alert Summary Cards - Responsive Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <Card className="bg-gray-900/80 border-red-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm font-medium text-zinc-300">Critical</CardTitle>
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-red-400">{filteredAlertCounts.critical}</div>
                <p className="text-xs text-red-300 mt-1">Immediate action required</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/80 border-amber-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm font-medium text-zinc-300">High</CardTitle>
                  <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-400" />
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-amber-400">{filteredAlertCounts.high}</div>
                <p className="text-xs text-amber-300 mt-1">Action needed soon</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/80 border-yellow-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm font-medium text-zinc-300">Medium</CardTitle>
                  <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400" />
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-yellow-400">{filteredAlertCounts.medium}</div>
                <p className="text-xs text-yellow-300 mt-1">Monitor closely</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/80 border-blue-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm font-medium text-zinc-300">Low</CardTitle>
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-blue-400">{filteredAlertCounts.low}</div>
                <p className="text-xs text-blue-300 mt-1">Informational</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl col-span-2 sm:col-span-1">
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs sm:text-sm font-medium text-zinc-300">Total</CardTitle>
                  <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold text-white">{filteredAlertCounts.total}</div>
                <p className="text-xs text-zinc-300 mt-1">{hasActiveFilters ? "Filtered" : "All"} alerts</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Controls - Responsive */}
          <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl mb-4 sm:mb-6">
            <CardHeader className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-purple-400" />
                  <CardTitle className="text-base sm:text-lg text-white">Filter & Search Alerts</CardTitle>
                  {hasActiveFilters && (
                    <Badge variant="outline" className="text-xs border-purple-400/30 text-purple-300">
                      {filteredAlerts.length} of {alertsData.length} alerts
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedAlerts.length > 0 && (
                    <>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                        {selectedAlerts.length} selected
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={clearSelection}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent text-xs"
                      >
                        Clear
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-xs"
                          >
                            Bulk Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-800 border-purple-400/30">
                          <DropdownMenuItem className="text-zinc-200 hover:bg-purple-900/40 text-xs">
                            <CheckCircle className="h-3 w-3 mr-2" />
                            Mark as Resolved
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-zinc-200 hover:bg-purple-900/40 text-xs">
                            <Archive className="h-3 w-3 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-zinc-200 hover:bg-purple-900/40 text-xs">
                            <Flag className="h-3 w-3 mr-2" />
                            Escalate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-purple-500/20" />
                          <DropdownMenuItem className="text-red-400 hover:bg-red-900/40 text-xs">
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {/* Responsive Filter Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
                {/* Search */}
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-xs font-medium text-zinc-400">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-zinc-400" />
                    <Input
                      placeholder="Search alerts, IDs, tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 sm:pl-10 bg-zinc-800 border-zinc-700 text-white focus:border-purple-400 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                {/* Severity Filter */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-zinc-400">Severity</Label>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-xs sm:text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all" className="text-white">All Severities</SelectItem>
                      <SelectItem value="critical" className="text-white">Critical</SelectItem>
                      <SelectItem value="high" className="text-white">High</SelectItem>
                      <SelectItem value="medium" className="text-white">Medium</SelectItem>
                      <SelectItem value="low" className="text-white">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Type Filter */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-zinc-400">Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-xs sm:text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all" className="text-white">All Types</SelectItem>
                      <SelectItem value="unique_ports_logistic" className="text-white">Unique Ports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-zinc-400">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-xs sm:text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all" className="text-white">All Status</SelectItem>
                      <SelectItem value="active" className="text-white">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Time Range Filter */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-zinc-400">Time Range</Label>
                  <Select value={timeRangeFilter} onValueChange={setTimeRangeFilter}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white text-xs sm:text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="all" className="text-white">All Time</SelectItem>
                      <SelectItem value="5" className="text-white">Last 5 minutes</SelectItem>
                      <SelectItem value="30" className="text-white">Last 30 minutes</SelectItem>
                      <SelectItem value="60" className="text-white">Last hour</SelectItem>
                      <SelectItem value="1440" className="text-white">Last 24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Sort and Clear Filters */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium text-zinc-400">Sort by:</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 text-white text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="timestamp" className="text-white">Time</SelectItem>
                        <SelectItem value="severity" className="text-white">Severity</SelectItem>
                        <SelectItem value="riskScore" className="text-white">Risk Score</SelectItem>
                        <SelectItem value="title" className="text-white">Title</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent text-xs"
                    >
                      {sortOrder === "asc" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllAlerts}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent text-xs"
                  >
                    Select All
                  </Button>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Alerts List */}
          <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white">
                  {hasActiveFilters ? "Filtered Alerts" : "All Alerts"}
                </CardTitle>
                <span className="text-sm text-zinc-400">
                  Showing {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? "s" : ""}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-800">
                {loading ? (
                  <div className="p-8 text-center text-zinc-400">Loading alerts...</div>
                ) : error ? (
                  <div className="p-8 text-center text-red-400">Error: {error}</div>
                ) : filteredAlerts.length > 0 ? (
                  filteredAlerts.map((alert) => (
                    <AlertItem
                      key={alert.id}
                      alert={alert}
                      isSelected={selectedAlerts.includes(alert.id)}
                      onToggleSelection={toggleAlertSelection}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-full bg-zinc-800 p-3">
                        <Search className="h-6 w-6 text-zinc-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-white">No alerts found</h3>
                        <p className="text-sm text-zinc-400 mt-1">Try adjusting your filters or search criteria</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent"
                      >
                        Clear all filters
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-gray-950/90 backdrop-blur-xl py-12 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                CyberSense AI
              </span>
            </div>
            <p className="text-sm text-zinc-400">© 2025 CyberSense AI. Built for cybersecurity professionals.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Alert Item Component
interface AlertItemProps {
  alert: AlertUI
  isSelected: boolean
  onToggleSelection: (alertId: string) => void
}

function AlertItem({ alert, isSelected, onToggleSelection }: AlertItemProps) {
  const severityConfig = {
    critical: { color: "red", bgColor: "bg-red-900/20", borderColor: "border-red-500/30", textColor: "text-red-400" },
    high: {
      color: "amber",
      bgColor: "bg-amber-900/20",
      borderColor: "border-amber-500/30",
      textColor: "text-amber-400",
    },
    medium: {
      color: "yellow",
      bgColor: "bg-yellow-900/20",
      borderColor: "border-yellow-500/30",
      textColor: "text-yellow-400",
    },
    low: { color: "blue", bgColor: "bg-blue-900/20", borderColor: "border-blue-500/30", textColor: "text-blue-400" },
  }
  const statusConfig = {
    active: { color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30" },
    investigating: { color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30" },
    resolved: { color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/30" },
    escalated: { color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30" },
    acknowledged: { color: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/30" },
    mitigated: { color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30" },
  }
  const typeIcons = {
    malware: <Zap className="h-4 w-4" />, network: <Globe className="h-4 w-4" />, authentication: <Users className="h-4 w-4" />, data: <Database className="h-4 w-4" />, system: <Activity className="h-4 w-4" />, unique_ports_logistic: <Globe className="h-4 w-4" />
  }
  const severityConf = severityConfig[alert.severity]
  const statusConf = statusConfig[alert.status as keyof typeof statusConfig] || statusConfig.active
  return (
    <div
      className={`p-4 hover:bg-zinc-800/50 transition-colors ${isSelected ? "bg-purple-900/20 border-l-4 border-l-purple-500" : ""}`}
    >
      <div className="flex items-start gap-4">
        {/* Selection Checkbox */}
        <div className="flex items-center pt-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(alert.id)}
            className="border-purple-400/30 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
          />
        </div>
        {/* Alert Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                className={`${severityConf.bgColor} ${severityConf.textColor} ${severityConf.borderColor} text-xs`}
              >
                {alert.severity.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
                <div className="flex items-center gap-1">
                  {typeIcons[alert.type as keyof typeof typeIcons]}
                  {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                </div>
              </Badge>
              <Badge className={`${statusConf.bg} ${statusConf.color} ${statusConf.border} text-xs`}>
                {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
              </Badge>
              <span className="text-xs font-mono text-zinc-500">{alert.id}</span>
            </div>
            <div className="flex items-center gap-1">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-purple-400/40 max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-white">{alert.title}</DialogTitle>
                    <DialogDescription className="text-zinc-300">{alert.description}</DialogDescription>
                  </DialogHeader>
                  <AlertDetailsModal alert={alert} />
                </DialogContent>
              </Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-purple-400/30">
                  <DropdownMenuItem className="text-zinc-200 hover:bg-purple-900/40">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Resolved
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-zinc-200 hover:bg-purple-900/40">
                    <Flag className="h-4 w-4 mr-2" />
                    Escalate
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-zinc-200 hover:bg-purple-900/40">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add Comment
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-purple-500/20" />
                  <DropdownMenuItem className="text-zinc-200 hover:bg-purple-900/40">
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <h4 className="font-medium text-white mb-2 text-lg">{alert.title}</h4>
          <p className="text-sm text-zinc-300 mb-3">{alert.description}</p>
          {/* Alert Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-zinc-400 mb-3">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{alert.timestamp}</span>
            </div>
            <div className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              <span>Source: {alert.source}</span>
            </div>
            <div className="flex items-center gap-1">
              <Server className="h-3 w-3" />
              <span>Target: {alert.destination}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{alert.location}</span>
            </div>
          </div>
          {/* Risk Score and Confidence */}
          <div className="flex items-center gap-6 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Risk Score:</span>
              <Badge
                className={`text-xs ${alert.riskScore >= 8 ? "bg-red-500/20 text-red-400 border-red-500/30" : alert.riskScore >= 6 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}`}
              >
                {alert.riskScore}/10
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Confidence:</span>
              <span className="text-xs text-white">{alert.confidence}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Affected Assets:</span>
              <span className="text-xs text-white">{alert.affectedAssets}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Assignee:</span>
              <span className="text-xs text-white">{alert.assignee}</span>
            </div>
          </div>
          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {alert.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs border-zinc-600 text-zinc-400 bg-zinc-800/50">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Alert Details Modal Component
function AlertDetailsModal({ alert }: { alert: AlertUI }) {
  return (
    <div className="space-y-6">
      {/* Timeline */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Timeline</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">First Seen:</span>
            <span className="text-white">{alert.firstSeen}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Last Seen:</span>
            <span className="text-white">{alert.lastSeen}</span>
          </div>
        </div>
      </div>
      {/* Technical Details */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Technical Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-zinc-400">Source IP:</span>
            <p className="text-white font-mono">{alert.source}</p>
          </div>
          <div>
            <span className="text-zinc-400">Destination:</span>
            <p className="text-white font-mono">{alert.destination}</p>
          </div>
          <div>
            <span className="text-zinc-400">Risk Score:</span>
            <p className="text-white">{alert.riskScore}/10</p>
          </div>
          <div>
            <span className="text-zinc-400">Confidence:</span>
            <p className="text-white">{alert.confidence}%</p>
          </div>
        </div>
      </div>
      {/* Actions */}
      <div className="flex gap-3">
        <Button className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700">
          <CheckCircle className="h-4 w-4 mr-2" />
          Resolve Alert
        </Button>
        <Button variant="outline" className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent">
          <Flag className="h-4 w-4 mr-2" />
          Escalate
        </Button>
        <Button variant="outline" className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent">
          <ExternalLink className="h-4 w-4 mr-2" />
          Investigate
        </Button>
      </div>
    </div>
  )
}
