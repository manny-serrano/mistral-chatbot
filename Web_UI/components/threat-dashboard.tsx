"use client"

import type React from "react"
import { useState, useMemo } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  AlertTriangle,
  Shield,
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  Eye,
  X,
  CheckCircle,
  AlertCircle,
  Zap,
  Globe,
  Users,
  Database,
  Filter,
  Search,
  RotateCcw,
  Calendar,
} from "lucide-react"

// Alert data with more detailed information
const alertsData = [
  {
    id: 1,
    severity: "critical" as const,
    type: "malware",
    title: "Malware Detection",
    description: "Trojan.Win32.Agent detected on endpoint DESKTOP-ABC123",
    timestamp: "2 minutes ago",
    source: "192.168.1.105",
    timeValue: 2,
  },
  {
    id: 2,
    severity: "high" as const,
    type: "network",
    title: "Suspicious Network Activity",
    description: "Unusual outbound traffic to known C&C server",
    timestamp: "8 minutes ago",
    source: "10.0.0.45",
    timeValue: 8,
  },
  {
    id: 3,
    severity: "high" as const,
    type: "authentication",
    title: "Failed Login Attempts",
    description: "Multiple failed SSH login attempts from external IP",
    timestamp: "15 minutes ago",
    source: "203.0.113.42",
    timeValue: 15,
  },
  {
    id: 4,
    severity: "medium" as const,
    type: "network",
    title: "Port Scan Detected",
    description: "Systematic port scanning activity detected",
    timestamp: "23 minutes ago",
    source: "198.51.100.15",
    timeValue: 23,
  },
  {
    id: 5,
    severity: "medium" as const,
    type: "network",
    title: "DNS Tunneling",
    description: "Potential DNS tunneling activity observed",
    timestamp: "35 minutes ago",
    source: "172.16.0.88",
    timeValue: 35,
  },
  {
    id: 6,
    severity: "low" as const,
    type: "system",
    title: "Certificate Expiry Warning",
    description: "SSL certificate expires in 7 days",
    timestamp: "1 hour ago",
    source: "web-server-01",
    timeValue: 60,
  },
  {
    id: 7,
    severity: "critical" as const,
    type: "malware",
    title: "Ransomware Activity",
    description: "Potential ransomware encryption detected",
    timestamp: "45 minutes ago",
    source: "192.168.1.87",
    timeValue: 45,
  },
  {
    id: 8,
    severity: "high" as const,
    type: "data",
    title: "Data Exfiltration Attempt",
    description: "Large data transfer to external server detected",
    timestamp: "1.5 hours ago",
    source: "10.0.0.123",
    timeValue: 90,
  },
  {
    id: 9,
    severity: "medium" as const,
    type: "authentication",
    title: "Privilege Escalation",
    description: "Unauthorized privilege escalation attempt",
    timestamp: "2 hours ago",
    source: "192.168.1.200",
    timeValue: 120,
  },
  {
    id: 10,
    severity: "low" as const,
    type: "system",
    title: "System Update Available",
    description: "Security patches available for installation",
    timestamp: "3 hours ago",
    source: "update-server",
    timeValue: 180,
  },
]

export function ThreatDashboard() {
  // Filter states
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [timeRangeFilter, setTimeRangeFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Filter alerts based on current filters
  const filteredAlerts = useMemo(() => {
    return alertsData.filter((alert) => {
      // Severity filter
      if (severityFilter !== "all" && alert.severity !== severityFilter) {
        return false
      }

      // Type filter
      if (typeFilter !== "all" && alert.type !== typeFilter) {
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
          alert.source.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [severityFilter, typeFilter, timeRangeFilter, searchQuery])

  // Calculate filtered alert counts by severity
  const filteredAlertCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 }
    filteredAlerts.forEach((alert) => {
      counts[alert.severity]++
    })
    return counts
  }, [filteredAlerts])

  // Clear all filters
  const clearFilters = () => {
    setSeverityFilter("all")
    setTypeFilter("all")
    setTimeRangeFilter("all")
    setSearchQuery("")
  }

  // Check if any filters are active
  const hasActiveFilters = severityFilter !== "all" || typeFilter !== "all" || timeRangeFilter !== "all" || searchQuery

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg font-medium">Threat Intelligence Dashboard</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-900 rounded-none border-b border-zinc-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">
              Overview
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-purple-600">
              Alerts
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-purple-600">
              Trends
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="p-4 m-0">
            <div className="grid grid-cols-4 gap-4 mb-4">
              <MetricCard
                title="Active Threats"
                value="7"
                trend="+2"
                trendDirection="up"
                icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
              />
              <MetricCard
                title="Protected Assets"
                value="142"
                trend="+3"
                trendDirection="up"
                icon={<Shield className="h-5 w-5 text-emerald-500" />}
              />
              <MetricCard
                title="Traffic Anomalies"
                value="12"
                trend="-5"
                trendDirection="down"
                icon={<Activity className="h-5 w-5 text-amber-500" />}
              />
              <MetricCard
                title="Avg. Response Time"
                value="1.2s"
                trend="-0.3s"
                trendDirection="down"
                icon={<Clock className="h-5 w-5 text-blue-500" />}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ThreatTable
                title="Recent Malicious IPs"
                data={[
                  { id: 1, ip: "185.143.223.12", country: "RU", confidence: "High", timestamp: "10:42:15" },
                  { id: 2, ip: "103.35.74.74", country: "CN", confidence: "Medium", timestamp: "09:37:22" },
                  { id: 3, ip: "91.243.85.45", country: "UA", confidence: "High", timestamp: "08:15:03" },
                  { id: 4, ip: "45.227.255.206", country: "BR", confidence: "Medium", timestamp: "07:52:41" },
                ]}
              />
              <ThreatTable
                title="Suspicious Domains"
                data={[
                  { id: 1, ip: "malicious-site.com", country: "US", confidence: "High", timestamp: "10:15:33" },
                  { id: 2, ip: "download-free-stuff.net", country: "NL", confidence: "Medium", timestamp: "09:22:17" },
                  { id: 3, ip: "crypto-mining-pool.io", country: "RU", confidence: "High", timestamp: "08:45:09" },
                  { id: 4, ip: "fake-login-portal.com", country: "CN", confidence: "High", timestamp: "07:30:55" },
                ]}
              />
            </div>
          </TabsContent>

          {/* Alerts Tab with Filtering */}
          <TabsContent value="alerts" className="p-4 m-0">
            <div className="space-y-4">
              {/* Filter Controls */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-4 w-4 text-purple-400" />
                  <h3 className="text-sm font-medium text-white">Filter Alerts</h3>
                  {hasActiveFilters && (
                    <Badge variant="outline" className="text-xs border-purple-400/30 text-purple-300">
                      {filteredAlerts.length} of {alertsData.length} alerts
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Search */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input
                        placeholder="Search alerts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-zinc-800 border-zinc-700 text-white focus:border-purple-400"
                      />
                    </div>
                  </div>

                  {/* Severity Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400">Severity</label>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue placeholder="All Severities" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="critical">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            Critical
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                            High
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            Medium
                          </div>
                        </SelectItem>
                        <SelectItem value="low">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Low
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Type Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400">Type</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="malware">
                          <div className="flex items-center gap-2">
                            <Zap className="h-3 w-3 text-red-400" />
                            Malware
                          </div>
                        </SelectItem>
                        <SelectItem value="network">
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3 text-orange-400" />
                            Network
                          </div>
                        </SelectItem>
                        <SelectItem value="authentication">
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-yellow-400" />
                            Authentication
                          </div>
                        </SelectItem>
                        <SelectItem value="data">
                          <div className="flex items-center gap-2">
                            <Database className="h-3 w-3 text-purple-400" />
                            Data
                          </div>
                        </SelectItem>
                        <SelectItem value="system">
                          <div className="flex items-center gap-2">
                            <Activity className="h-3 w-3 text-blue-400" />
                            System
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Time Range Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400">Time Range</label>
                    <Select value={timeRangeFilter} onValueChange={setTimeRangeFilter}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue placeholder="All Time" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="5">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-green-400" />
                            Last 5 minutes
                          </div>
                        </SelectItem>
                        <SelectItem value="30">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-blue-400" />
                            Last 30 minutes
                          </div>
                        </SelectItem>
                        <SelectItem value="60">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-purple-400" />
                            Last hour
                          </div>
                        </SelectItem>
                        <SelectItem value="1440">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-orange-400" />
                            Last 24 hours
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent"
                    >
                      <RotateCcw className="h-3 w-3 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>

              {/* Filtered Alert Summary */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-red-300">Critical</h3>
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-semibold text-white">{filteredAlertCounts.critical}</p>
                    <p className="text-xs text-red-300">Requires immediate action</p>
                  </div>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-amber-300">High</h3>
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-semibold text-white">{filteredAlertCounts.high}</p>
                    <p className="text-xs text-amber-300">Action needed soon</p>
                  </div>
                </div>
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-yellow-300">Medium</h3>
                    <Activity className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-semibold text-white">{filteredAlertCounts.medium}</p>
                    <p className="text-xs text-yellow-300">Monitor closely</p>
                  </div>
                </div>
                <div className="rounded-lg border border-blue-500/30 bg-blue-900/20 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-blue-300">Low</h3>
                    <CheckCircle className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="mt-2">
                    <p className="text-2xl font-semibold text-white">{filteredAlertCounts.low}</p>
                    <p className="text-xs text-blue-300">Informational</p>
                  </div>
                </div>
              </div>

              {/* Filtered Alerts List */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900">
                <div className="p-4 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white">
                      {hasActiveFilters ? "Filtered Alerts" : "Recent Alerts"}
                    </h3>
                    <span className="text-sm text-zinc-400">
                      Showing {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-zinc-800">
                  {filteredAlerts.length > 0 ? (
                    filteredAlerts.map((alert) => (
                      <AlertItem
                        key={alert.id}
                        severity={alert.severity}
                        type={alert.type}
                        title={alert.title}
                        description={alert.description}
                        timestamp={alert.timestamp}
                        source={alert.source}
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
              </div>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="p-4 m-0">
            <div className="space-y-6">
              {/* Trend Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-zinc-400">24h Threat Volume</h3>
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-semibold text-white">+23%</div>
                    <div className="text-xs text-green-400">↗ 156 new threats detected</div>
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-zinc-400">Response Time</h3>
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-semibold text-white">-15%</div>
                    <div className="text-xs text-green-400">↗ Faster incident response</div>
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-zinc-400">False Positives</h3>
                    <TrendingDown className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-semibold text-white">-8%</div>
                    <div className="text-xs text-green-400">↗ Improved accuracy</div>
                  </div>
                </div>
              </div>

              {/* Threat Categories Trends */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <h3 className="text-lg font-medium text-white mb-4">Threat Categories (Last 7 Days)</h3>
                <div className="space-y-4">
                  <TrendItem
                    category="Malware"
                    count={89}
                    change={+12}
                    percentage={34}
                    color="red"
                    icon={<Zap className="h-4 w-4" />}
                  />
                  <TrendItem
                    category="Phishing"
                    count={67}
                    change={-5}
                    percentage={26}
                    color="orange"
                    icon={<Globe className="h-4 w-4" />}
                  />
                  <TrendItem
                    category="Intrusion Attempts"
                    count={45}
                    change={+8}
                    percentage={17}
                    color="yellow"
                    icon={<Users className="h-4 w-4" />}
                  />
                  <TrendItem
                    category="Data Exfiltration"
                    count={32}
                    change={-3}
                    percentage={12}
                    color="purple"
                    icon={<Database className="h-4 w-4" />}
                  />
                  <TrendItem
                    category="DDoS Attacks"
                    count={28}
                    change={+15}
                    percentage={11}
                    color="blue"
                    icon={<Activity className="h-4 w-4" />}
                  />
                </div>
              </div>

              {/* Geographic Trends */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <h3 className="text-lg font-medium text-white mb-4">Top Source Countries</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-zinc-300">Russia</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">28%</span>
                        <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="w-7 h-full bg-red-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-sm text-zinc-300">China</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">22%</span>
                        <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="w-5 h-full bg-orange-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm text-zinc-300">North Korea</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">18%</span>
                        <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="w-4 h-full bg-yellow-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm text-zinc-300">Iran</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">15%</span>
                        <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="w-3 h-full bg-purple-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-zinc-300">Others</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">17%</span>
                        <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="w-3 h-full bg-blue-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <h3 className="text-lg font-medium text-white mb-4">Attack Timing Patterns</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">Peak Hours</span>
                      <span className="text-sm text-white">2-6 AM UTC</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">Busiest Day</span>
                      <span className="text-sm text-white">Tuesday</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">Weekend Activity</span>
                      <span className="text-sm text-white">-35%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">Holiday Spikes</span>
                      <span className="text-sm text-white">+67%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

interface MetricCardProps {
  title: string
  value: string
  trend: string
  trendDirection: "up" | "down"
  icon: React.ReactNode
}

function MetricCard({ title, value, trend, trendDirection, icon }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
        {icon}
      </div>
      <div className="mt-2 flex items-baseline">
        <p className="text-2xl font-semibold text-white">{value}</p>
        <span className={`ml-2 text-xs font-medium ${trendDirection === "up" ? "text-red-500" : "text-emerald-500"}`}>
          {trend}
        </span>
      </div>
    </div>
  )
}

interface ThreatTableProps {
  title: string
  data: {
    id: number
    ip: string
    country: string
    confidence: string
    timestamp: string
  }[]
}

function ThreatTable({ title, data }: ThreatTableProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="pb-2 text-left font-medium text-zinc-400">IP/Domain</th>
              <th className="pb-2 text-left font-medium text-zinc-400">Origin</th>
              <th className="pb-2 text-left font-medium text-zinc-400">Confidence</th>
              <th className="pb-2 text-right font-medium text-zinc-400">Time</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-b border-zinc-800 last:border-0">
                <td className="py-2 text-left font-medium text-white">{item.ip}</td>
                <td className="py-2 text-left text-zinc-300">{item.country}</td>
                <td className="py-2 text-left">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.confidence === "High" ? "bg-red-500/20 text-red-500" : "bg-amber-500/20 text-amber-500"
                    }`}
                  >
                    {item.confidence}
                  </span>
                </td>
                <td className="py-2 text-right text-zinc-400">{item.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface AlertItemProps {
  severity: "critical" | "high" | "medium" | "low"
  type: string
  title: string
  description: string
  timestamp: string
  source: string
}

function AlertItem({ severity, type, title, description, timestamp, source }: AlertItemProps) {
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

  const typeIcons = {
    malware: <Zap className="h-3 w-3" />,
    network: <Globe className="h-3 w-3" />,
    authentication: <Users className="h-3 w-3" />,
    data: <Database className="h-3 w-3" />,
    system: <Activity className="h-3 w-3" />,
  }

  const config = severityConfig[severity]

  return (
    <div className="p-4 hover:bg-zinc-800/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Badge className={`${config.bgColor} ${config.textColor} border-${config.color}-500/30 text-xs`}>
              {severity.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400">
              <div className="flex items-center gap-1">
                {typeIcons[type as keyof typeof typeIcons]}
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </div>
            </Badge>
            <h4 className="font-medium text-white">{title}</h4>
          </div>
          <p className="text-sm text-zinc-300 mb-2">{description}</p>
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <span>Source: {source}</span>
            <span>{timestamp}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface TrendItemProps {
  category: string
  count: number
  change: number
  percentage: number
  color: string
  icon: React.ReactNode
}

function TrendItem({ category, count, change, percentage, color, icon }: TrendItemProps) {
  const isPositive = change > 0

  return (
    <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-500/20 border border-${color}-500/30`}>
          <div className={`text-${color}-400`}>{icon}</div>
        </div>
        <div>
          <h4 className="font-medium text-white">{category}</h4>
          <p className="text-sm text-zinc-300">{count} incidents</p>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white">{percentage}%</span>
          <div className="w-16 h-2 bg-zinc-700 rounded-full overflow-hidden">
            <div className={`h-full bg-${color}-500 rounded-full`} style={{ width: `${percentage}%` }}></div>
          </div>
        </div>
        <div className={`text-xs ${isPositive ? "text-red-400" : "text-green-400"} flex items-center gap-1`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isPositive ? "+" : ""}
          {change}
        </div>
      </div>
    </div>
  )
}
