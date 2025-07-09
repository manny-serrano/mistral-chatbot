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
  MapPin,
  Shield,
  Wifi,
  Server,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
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
  target_ports: number[]
  target_ips: string[]
}

// UI Alert type with geolocation
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
  p_value: number
  target_ports: number[]
  target_ips: string[]
  // New geolocation fields
  geolocation?: {
    country: string
    city: string
    region?: string
    lat?: number
    lon?: number
    isp?: string
    org?: string
    timezone?: string
  }
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1)
  const alertsPerPage = 10

  // Function to fetch geolocation data for IPs
  const getGeolocationsForIPs = async (ips: string[]) => {
    try {
      const response = await fetch('/api/geolocation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ips })
      })

      if (!response.ok) {
        throw new Error(`Geolocation API error: ${response.status}`)
      }

      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Error fetching geolocations:', error)
      return []
    }
  }

  // Alert action handlers
  const handleResolveAlert = async (alertId: string) => {
    try {
      // Update alert status to resolved
      setAlertsData(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'resolved', assignee: 'System' }
          : alert
      ))
      // TODO: Add API call to persist status change
      console.log(`Alert ${alertId} marked as resolved`)
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  const handleEscalateAlert = async (alertId: string) => {
    try {
      // Update alert status to escalated
      setAlertsData(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'escalated', assignee: 'Security Team' }
          : alert
      ))
      // TODO: Add API call to persist status change
      console.log(`Alert ${alertId} escalated`)
    } catch (error) {
      console.error('Error escalating alert:', error)
    }
  }

  const handleInvestigateAlert = async (alertId: string) => {
    try {
      // Update alert status to investigating
      setAlertsData(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'investigating', assignee: 'Analyst' }
          : alert
      ))
      // TODO: Add API call to persist status change
      console.log(`Alert ${alertId} under investigation`)
    } catch (error) {
      console.error('Error investigating alert:', error)
    }
  }

  // Fetch alerts on mount
  useEffect(() => {
    const fetchAlertsWithGeolocation = async () => {
      setLoading(true)
      try {
        // Fetch alerts from API
        const response = await fetch("/api/alerts")
        if (!response.ok) throw new Error("Failed to fetch alerts")
        const data = await response.json()
        
        // Get unique IPs for geolocation lookup
        const uniqueIPs = [...new Set((data.alerts || []).map((a: ApiAlert) => a.ip))]
        
        // Fetch geolocation data for all IPs
        const geolocations = await getGeolocationsForIPs(uniqueIPs)
        
        // Create IP to geolocation mapping
        const geoMap = new Map()
        geolocations.forEach((geo: any) => {
          // Handle timezone properly - it might be an object or string
          let timezoneString = 'Unknown'
          if (geo.timezone) {
            if (typeof geo.timezone === 'string') {
              timezoneString = geo.timezone
            } else if (typeof geo.timezone === 'object') {
              // Extract meaningful string from timezone object
              timezoneString = geo.timezone.id || geo.timezone.utc || geo.timezone.abbr || 'Unknown'
            }
          }
          
          // Ensure all fields are properly converted to strings/numbers
          const safeGeo = {
            country: String(geo.country || 'Unknown'),
            city: String(geo.city || 'Unknown'), 
            region: geo.region ? String(geo.region) : undefined,
            lat: geo.latitude && !isNaN(Number(geo.latitude)) ? Number(geo.latitude) : undefined,
            lon: geo.longitude && !isNaN(Number(geo.longitude)) ? Number(geo.longitude) : undefined,
            isp: geo.isp ? String(geo.isp) : undefined,
            org: geo.org ? String(geo.org) : undefined,
            timezone: timezoneString
          }
          
          geoMap.set(geo.ip, safeGeo)
        })

        // Map API alerts to UI alerts with geolocation
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
          
          // Get geolocation data for this IP
          const geo = geoMap.get(a.ip)
          const locationString = geo ? `${geo.city}, ${geo.country}` : "Unknown Location"
          
          // Create meaningful target description from ports and IPs
          let targetString = "Unknown"
          if (a.target_ports && a.target_ports.length > 0 && a.target_ips && a.target_ips.length > 0) {
            // Show target IPs first, then ports
            const ipPart = a.target_ips.length <= 2 
              ? `${a.target_ips.join(', ')}`
              : `${a.target_ips.slice(0, 2).join(', ')} (+${a.target_ips.length - 2} more)`
            
            const portPart = a.target_ports.length <= 3 
              ? `ports ${a.target_ports.join(', ')}`
              : `ports ${a.target_ports.slice(0, 3).join(', ')} (+${a.target_ports.length - 3} more)`
            
            targetString = `${ipPart} on ${portPart}`
          } else if (a.target_ports && a.target_ports.length > 0) {
            // Fallback to just ports if no IPs
            targetString = a.target_ports.length <= 3 
              ? `Ports: ${a.target_ports.join(', ')}`
              : `Ports: ${a.target_ports.slice(0, 3).join(', ')} (+${a.target_ports.length - 3} more)`
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
            destination: targetString, // Use actual target ports instead of "Multiple Targets"
            status: "active",
            assignee: "Unassigned",
            tags: [a.type],
            affectedAssets: a.unique_ports,
            confidence: Math.round(a.p_value * 100),
            location: locationString,
            firstSeen: a.date,
            lastSeen: a.date,
            riskScore: Math.round(a.p_value * 10 * 10) / 10, // Keep original risk score
            p_value: a.p_value,
            target_ports: a.target_ports,
            target_ips: a.target_ips,
            geolocation: geo
          }
        })
        setAlertsData(mapped)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch alerts')
        setLoading(false)
      }
    }

    fetchAlertsWithGeolocation()
  }, [])

  // Alert statistics
  const alertStats = useMemo(() => {
    const stats = {
      total: alertsData.length,
      critical: alertsData.filter(alert => alert.severity === "critical").length,
      high: alertsData.filter(alert => alert.severity === "high").length,
      medium: alertsData.filter(alert => alert.severity === "medium").length,
      low: alertsData.filter(alert => alert.severity === "low").length,
      resolved: alertsData.filter(alert => alert.status === "resolved").length,
      investigating: alertsData.filter(alert => alert.status === "investigating").length,
      escalated: alertsData.filter(alert => alert.status === "escalated").length,
    }
    return stats
  }, [alertsData])

  // Alert severity distribution
  const severityDistribution = useMemo(() => {
    const total = alertsData.length
    if (total === 0) return { critical: 0, high: 0, medium: 0, low: 0 }

    return {
      critical: (alertsData.filter(alert => alert.severity === 'critical').length / total) * 100,
      high: (alertsData.filter(alert => alert.severity === 'high').length / total) * 100,
      medium: (alertsData.filter(alert => alert.severity === 'medium').length / total) * 100,
      low: (alertsData.filter(alert => alert.severity === 'low').length / total) * 100
    }
  }, [alertsData])

  // Alert status distribution
  const statusDistribution = useMemo(() => {
    const total = alertsData.length
    if (total === 0) return { open: 0, investigating: 0, resolved: 0, escalated: 0 }

    return {
      open: (alertsData.filter(alert => alert.status === 'open').length / total) * 100,
      investigating: (alertsData.filter(alert => alert.status === 'investigating').length / total) * 100,
      resolved: (alertsData.filter(alert => alert.status === 'resolved').length / total) * 100,
      escalated: (alertsData.filter(alert => alert.status === 'escalated').length / total) * 100
    }
  }, [alertsData])

  // Filter alerts based on current filters
  const filteredAlerts = useMemo(() => {
    return alertsData.filter(alert => {
      const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter
      const matchesType = typeFilter === "all" || alert.type === typeFilter
      const matchesStatus = statusFilter === "all" || alert.status === statusFilter
      const matchesSearch = !searchQuery || 
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.destination.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesSeverity && matchesType && matchesStatus && matchesSearch
    })
  }, [alertsData, severityFilter, typeFilter, statusFilter, searchQuery])

  // Get current page alerts
  const currentPageAlerts = useMemo(() => {
    const startIndex = (currentPage - 1) * alertsPerPage
    return filteredAlerts.slice(startIndex, startIndex + alertsPerPage)
  }, [filteredAlerts, currentPage])

  // Calculate total pages
  const totalPages = Math.ceil(filteredAlerts.length / alertsPerPage)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [severityFilter, typeFilter, statusFilter, searchQuery])

  // Pagination navigation
  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setSeverityFilter("all")
    setTypeFilter("all")
    setStatusFilter("all")
    setTimeRangeFilter("all")
    setSearchQuery("")
    setCurrentPage(1)
  }

  // Check if any filters are active
  const hasActiveFilters = severityFilter !== "all" || typeFilter !== "all" || statusFilter !== "all" || timeRangeFilter !== "all" || searchQuery !== ""

  // Alert selection handlers
  const toggleAlertSelection = (alertId: string) => {
    setSelectedAlerts((prev: string[]) => 
      prev.includes(alertId) 
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    )
  }

  const selectAllAlerts = () => {
    const currentPageAlertIds = currentPageAlerts.map(alert => alert.id)
    setSelectedAlerts(currentPageAlertIds)
  }

  const clearSelection = () => {
    setSelectedAlerts([])
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-black via-purple-950/40 to-gray-950 text-zinc-100 relative">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      <header className="border-b border-purple-500/20 bg-black/80 backdrop-blur-xl px-3 sm:px-6 py-4 relative z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              LEVANT AI
            </h1>
          </Link>
          
          {/* Centered Navigation */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <nav className="flex items-center gap-2 sm:gap-4 md:gap-6">
              <Link
                href="/dashboard"
                className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/chat"
                className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
              >
                Chat
              </Link>
              <span className="text-xs sm:text-sm font-medium text-purple-300">Alerts</span>
              <Link href="/reports" className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                Reports
              </Link>
              <Link
                href="/visualization"
                className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors"
              >
                <span className="hidden sm:inline">Visualization</span>
                <span className="sm:hidden">Visual</span>
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <ProfileDropdown />
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
                <div className="text-xl sm:text-2xl font-bold text-red-400">{alertStats.critical}</div>
                <p className="text-xs text-red-300 mt-1">p_value ≥ 0.8</p>
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
                <div className="text-xl sm:text-2xl font-bold text-amber-400">{alertStats.high}</div>
                <p className="text-xs text-amber-300 mt-1">p_value ≥ 0.6</p>
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
                <div className="text-xl sm:text-2xl font-bold text-yellow-400">{alertStats.medium}</div>
                <p className="text-xs text-yellow-300 mt-1">p_value ≥ 0.4</p>
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
                <div className="text-xl sm:text-2xl font-bold text-blue-400">{alertStats.low}</div>
                <p className="text-xs text-blue-300 mt-1">p_value ≥ 0.1</p>
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
                <div className="text-xl sm:text-2xl font-bold text-white">{alertStats.total}</div>
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
                      {sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllAlerts}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent text-xs"
                  >
                    Select All on Page
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
                  Showing {currentPageAlerts.length} of {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? "s" : ""}
                  {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-800">
                {loading ? (
                  <div className="p-8 text-center text-zinc-400">Loading alerts...</div>
                ) : error ? (
                  <div className="p-8 text-center text-red-400">Error: {error}</div>
                ) : currentPageAlerts.length > 0 ? (
                  currentPageAlerts.map((alert) => (
                    <AlertItem
                      key={alert.id}
                      alert={alert}
                      isSelected={selectedAlerts.includes(alert.id)}
                      onToggleSelection={toggleAlertSelection}
                      onResolve={handleResolveAlert}
                      onEscalate={handleEscalateAlert}
                      onInvestigate={handleInvestigateAlert}
                    />
                  ))
                ) : filteredAlerts.length === 0 ? (
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
                ) : (
                  <div className="p-8 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-full bg-zinc-800 p-3">
                        <Search className="h-6 w-6 text-zinc-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-white">No alerts on this page</h3>
                        <p className="text-sm text-zinc-400 mt-1">Navigate to a different page or adjust your filters</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent"
                      >
                        Go to first page
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-400">
                    Showing {currentPageAlerts.length} of {filteredAlerts.length} results
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                            className={`w-8 h-8 p-0 text-xs ${
                              currentPage === pageNum
                                ? "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
                                : "border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent"
                            }`}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
                LEVANT AI
              </span>
            </div>
            <p className="text-sm text-zinc-400">© 2025 LEVANT AI. Built for cybersecurity professionals.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}

// Alert Item Component
interface AlertItemProps {
  alert: AlertUI
  isSelected: boolean
  onToggleSelection: (alertId: string) => void
  onResolve: (alertId: string) => void
  onEscalate: (alertId: string) => void
  onInvestigate: (alertId: string) => void
}

function AlertItem({ alert, isSelected, onToggleSelection, onResolve, onEscalate, onInvestigate }: AlertItemProps) {
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
                <DialogContent className="bg-gray-900 border-purple-400/40 max-w-2xl max-h-[80vh] overflow-hidden">
                  <DialogHeader className="pb-4">
                    <DialogTitle className="text-white">{alert.title}</DialogTitle>
                    <DialogDescription className="text-zinc-300">{alert.description}</DialogDescription>
                  </DialogHeader>
                  <div className="overflow-y-auto max-h-[60vh] pr-2">
                    <AlertDetailsModal 
                      alert={alert} 
                      onResolve={onResolve}
                      onEscalate={onEscalate}
                      onInvestigate={onInvestigate}
                    />
                  </div>
                </DialogContent>
              </Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border-purple-400/30">
                  <DropdownMenuItem 
                    className="text-zinc-200 hover:bg-purple-900/40"
                    onClick={() => onResolve(alert.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve Alert
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-zinc-200 hover:bg-purple-900/40"
                    onClick={() => onEscalate(alert.id)}
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Escalate
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-zinc-200 hover:bg-purple-900/40"
                    onClick={() => onInvestigate(alert.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Investigate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-purple-500/20" />
                  <DropdownMenuItem className="text-zinc-200 hover:bg-purple-900/40">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add Comment
                  </DropdownMenuItem>
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
              <span>{String(alert.timestamp)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              <span>Source: {String(alert.source)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Server className="h-3 w-3" />
              <span>Target: {String(alert.destination)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{String(alert.location)}</span>
            </div>
            {/* Additional geolocation details */}
            {alert.geolocation?.isp && (
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <span>ISP: {String(alert.geolocation.isp)}</span>
              </div>
            )}
            {alert.geolocation?.timezone && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>TZ: {String(alert.geolocation.timezone)}</span>
              </div>
            )}
            {alert.geolocation?.lat && alert.geolocation.lon && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>Coords: {Number(alert.geolocation.lat).toFixed(2)}, {Number(alert.geolocation.lon).toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span>Unique Ports: {alert.affectedAssets}</span>
            </div>
          </div>
          {/* Risk Score and Confidence */}
          <div className="flex items-center gap-6 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">P-Value:</span>
              <Badge
                className={`text-xs ${alert.p_value >= 0.8 ? "bg-red-500/20 text-red-400 border-red-500/30" : alert.p_value >= 0.6 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : alert.p_value >= 0.4 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : alert.p_value >= 0.1 ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}
              >
                {Number(alert.p_value).toFixed(3)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Risk Score:</span>
              <Badge
                className={`text-xs ${alert.riskScore >= 8 ? "bg-red-500/20 text-red-400 border-red-500/30" : alert.riskScore >= 6 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}`}
              >
                {Number(alert.riskScore)}/10
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Confidence:</span>
              <span className="text-xs text-white">{Number(alert.confidence)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Affected Assets:</span>
              <span className="text-xs text-white">{Number(alert.affectedAssets)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Assignee:</span>
              <span className="text-xs text-white">{String(alert.assignee)}</span>
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
function AlertDetailsModal({ alert, onResolve, onEscalate, onInvestigate }: { alert: AlertUI, onResolve: (alertId: string) => void, onEscalate: (alertId: string) => void, onInvestigate: (alertId: string) => void }) {
  return (
    <div className="space-y-6">
      {/* Timeline */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Timeline</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">First Seen:</span>
            <span className="text-white">{String(alert.firstSeen)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Last Seen:</span>
            <span className="text-white">{String(alert.lastSeen)}</span>
          </div>
        </div>
      </div>
      {/* Technical Details */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Technical Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-zinc-400">Source IP:</span>
            <p className="text-white font-mono">{String(alert.source)}</p>
          </div>
          <div>
            <span className="text-zinc-400">Target:</span>
            <p className="text-white font-mono">{String(alert.destination)}</p>
          </div>
          <div>
            <span className="text-zinc-400">P-Value:</span>
            <p className="text-white font-bold">{Number(alert.p_value).toFixed(3)}</p>
          </div>
          <div>
            <span className="text-zinc-400">Unique Ports:</span>
            <p className="text-white">{Number(alert.affectedAssets)}</p>
          </div>
          <div>
            <span className="text-zinc-400">Risk Score:</span>
            <p className="text-white">{Number(alert.riskScore)}/10</p>
          </div>
          <div>
            <span className="text-zinc-400">Confidence:</span>
            <p className="text-white">{Number(alert.confidence)}%</p>
          </div>
          <div>
            <span className="text-zinc-400">Status:</span>
            <p className="text-white capitalize">{String(alert.status)}</p>
          </div>
        </div>
      </div>
      
      {/* Target Ports Details */}
      {alert.target_ports && alert.target_ports.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-white mb-3">Scanned Ports</h3>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex flex-wrap gap-2">
              {alert.target_ports.map((port, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs border-purple-500/30 text-purple-300 bg-purple-900/20"
                >
                  {port}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              Total of {alert.target_ports.length} unique ports accessed
            </p>
          </div>
        </div>
      )}
      
      {/* Target IPs Details */}
      {alert.target_ips && alert.target_ips.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-white mb-3">Target IP Addresses</h3>
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex flex-wrap gap-2">
              {alert.target_ips.map((ip, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs border-blue-500/30 text-blue-300 bg-blue-900/20 font-mono"
                >
                  {ip}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              Total of {alert.target_ips.length} unique IP addresses targeted
            </p>
          </div>
        </div>
      )}
      
      {/* Geolocation Details */}
      {alert.geolocation && (
        <div>
          <h3 className="text-lg font-medium text-white mb-3">Geolocation Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-400">Country:</span>
              <p className="text-white">{String(alert.geolocation.country)}</p>
            </div>
            <div>
              <span className="text-zinc-400">City:</span>
              <p className="text-white">{String(alert.geolocation.city)}</p>
            </div>
            {alert.geolocation.region && (
              <div>
                <span className="text-zinc-400">Region:</span>
                <p className="text-white">{String(alert.geolocation.region)}</p>
              </div>
            )}
            {alert.geolocation.lat && alert.geolocation.lon && (
              <div>
                <span className="text-zinc-400">Coordinates:</span>
                <p className="text-white font-mono">{Number(alert.geolocation.lat).toFixed(4)}, {Number(alert.geolocation.lon).toFixed(4)}</p>
              </div>
            )}
            {alert.geolocation.isp && (
              <div>
                <span className="text-zinc-400">ISP:</span>
                <p className="text-white">{String(alert.geolocation.isp)}</p>
              </div>
            )}
            {alert.geolocation.org && (
              <div>
                <span className="text-zinc-400">Organization:</span>
                <p className="text-white">{String(alert.geolocation.org)}</p>
              </div>
            )}
            {alert.geolocation.timezone && (
              <div>
                <span className="text-zinc-400">Timezone:</span>
                <p className="text-white">{String(alert.geolocation.timezone)}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Actions */}
      <div className="flex gap-3">
        <Button className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700" onClick={() => onResolve(alert.id)}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Resolve Alert
        </Button>
        <Button variant="outline" className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent" onClick={() => onEscalate(alert.id)}>
          <Flag className="h-4 w-4 mr-2" />
          Escalate
        </Button>
        <Button variant="outline" className="border-purple-400/40 text-zinc-200 hover:bg-purple-900/40 bg-transparent" onClick={() => onInvestigate(alert.id)}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Investigate
        </Button>
      </div>
    </div>
  )
}
