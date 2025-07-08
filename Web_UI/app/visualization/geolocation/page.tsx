"use client"

import Link from "next/link"
import { ShieldCheck, Bell, MapPin, ArrowLeft, Globe, AlertTriangle, Activity, Search, Filter, RefreshCw, Eye, Copy, ExternalLink, Shield, Wifi, Server, Clock, DollarSign, Languages } from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

// Dynamically import the map to prevent SSR issues
const GeolocationMap = dynamic(() => import("@/components/geolocation-map"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96 bg-zinc-900 rounded-lg border border-zinc-800"><p className="text-zinc-400">Loading world map...</p></div>
})

interface Alert {
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

interface LocationData {
  ip: string
  country: string
  city: string
  lat: number
  lon: number
  threats: number
  flows: number
  severity?: "critical" | "high" | "medium" | "low"
  alertCount?: number
  lastSeen?: string
  region?: string
  timezone?: string
  isp?: string
  org?: string
  security?: {
    anonymous: boolean
    proxy: boolean
    vpn: boolean
    tor: boolean
    hosting: boolean
  }
}

interface GeolocationData {
  locations: LocationData[]
  total_ips: number
  total_threats: number
  total_flows: number
  success: boolean
  timestamp: string
  error?: string
}

export default function GeolocationVisualizationPage() {
  const [data, setData] = useState<GeolocationData | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [filteredLocations, setFilteredLocations] = useState<LocationData[]>([])
  const [privateIPCount, setPrivateIPCount] = useState<number>(0)
  const [totalSuspiciousIPs, setTotalSuspiciousIPs] = useState<number>(0)
  const [isSearchingIP, setIsSearchingIP] = useState<boolean>(false)

  // State for detailed view
  const [showDetailedView, setShowDetailedView] = useState<boolean>(false)
  const [detailedIPData, setDetailedIPData] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false)

  // Function to validate IP address format
  const isValidIP = (ip: string): boolean => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    return ipv4Regex.test(ip) || ipv6Regex.test(ip)
  }

  // Function to search for specific IP using IPWHOIS.io
  const searchSpecificIP = async (ip: string): Promise<LocationData | null> => {
    setIsSearchingIP(true)
    try {
      // Use IPWHOIS.io API via our backend to avoid CORS issues
      const response = await fetch(`/api/ip-lookup?ip=${encodeURIComponent(ip)}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get IP location')
      }

      // Convert IPWHOIS.io response to our LocationData format
      const locationData: LocationData = {
        ip: ip,
        country: data.country || 'Unknown',
        city: data.city || 'Unknown',
        lat: data.latitude || 0,
        lon: data.longitude || 0,
        threats: 1, // Default for searched IPs
        flows: 1, // Default for searched IPs
        severity: 'medium' as const,
        alertCount: 1,
        lastSeen: new Date().toISOString(),
        region: data.region || undefined,
        timezone: typeof data.timezone === 'string' ? data.timezone : data.timezone?.id || data.timezone?.utc || undefined,
        isp: data.connection?.isp || undefined,
        org: data.connection?.org || undefined,
        security: {
          anonymous: data.security?.anonymous || false,
          proxy: data.security?.proxy || false,
          vpn: data.security?.vpn || false,
          tor: data.security?.tor || false,
          hosting: data.security?.hosting || false
        }
      }

      return locationData
    } catch (error) {
      console.error('Error fetching IP location:', error)
      return null
    } finally {
      setIsSearchingIP(false)
    }
  }

  // Function to fetch detailed IP information
  const fetchDetailedIPInfo = async (ip: string) => {
    setLoadingDetails(true)
    try {
      const response = await fetch(`/api/ip-lookup?ip=${encodeURIComponent(ip)}&detailed=true`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setDetailedIPData(data)
        setShowDetailedView(true)
      } else {
        console.error('Failed to fetch detailed IP info:', data.message)
      }
    } catch (error) {
      console.error('Error fetching detailed IP info:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  // Function to show detailed view for an IP
  const showIPDetails = (location: LocationData) => {
    fetchDetailedIPInfo(location.ip)
  }

  // Fetch real geolocation data using IPWHOIS.io API
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

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      return result.alerts || []
    } catch (err) {
      console.error('Error fetching alerts:', err)
      return []
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch alerts from database
      const alertsData = await fetchAlerts()
      setAlerts(alertsData)

      // Group alerts by IP and create location data
      const ipGroups: Record<string, {
        alerts: Alert[]
        maxSeverity: "critical" | "high" | "medium" | "low"
        totalThreats: number
        lastSeen: string
      }> = {}

      alertsData.forEach((alert: Alert) => {
        if (!ipGroups[alert.ip]) {
          ipGroups[alert.ip] = {
            alerts: [],
            maxSeverity: "low",
            totalThreats: 0,
            lastSeen: alert.date
          }
        }
        
        ipGroups[alert.ip].alerts.push(alert)
        ipGroups[alert.ip].totalThreats += 1
        
        // Update max severity
        const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 }
        if (severityOrder[alert.severity] > severityOrder[ipGroups[alert.ip].maxSeverity]) {
          ipGroups[alert.ip].maxSeverity = alert.severity
        }

        // Update last seen
        if (alert.date > ipGroups[alert.ip].lastSeen) {
          ipGroups[alert.ip].lastSeen = alert.date
        }
      })

      // Get all unique IPs for geolocation lookup
      const uniqueIPs = Object.keys(ipGroups)
      const totalIPs = uniqueIPs.length
      
      // Count private IPs
      const privateIPs = uniqueIPs.filter(ip => {
        return ip.startsWith('192.168.') || 
               ip.startsWith('10.') || 
               /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
               ip.startsWith('127.')
      })
      
      setTotalSuspiciousIPs(totalIPs)
      setPrivateIPCount(privateIPs.length)
      
      // Fetch real geolocation data for all IPs
      const geolocations = await getGeolocationsForIPs(uniqueIPs)
      
      // Create IP to geolocation mapping
      const geoMap = new Map()
      geolocations.forEach((geo: any) => {
        geoMap.set(geo.ip, geo)
      })

      // Convert to location data
      const locations: LocationData[] = Object.entries(ipGroups).map(([ip, group]) => {
        const geoData = geoMap.get(ip) || {
          country: 'Unknown',
          city: 'Unknown',
          latitude: 0,
          longitude: 0
        }
        
        return {
          ip,
          country: geoData.country,
          city: geoData.city,
          lat: geoData.latitude,
          lon: geoData.longitude,
          threats: group.totalThreats,
          flows: group.alerts.reduce((sum, alert) => sum + alert.unique_ports, 0),
          severity: group.maxSeverity,
          alertCount: group.alerts.length,
          lastSeen: group.lastSeen,
          region: geoData.region,
          timezone: geoData.timezone,
          isp: geoData.isp,
          org: geoData.org,
          security: geoData.security
        }
      }).filter(loc => {
        // Only filter out private networks and truly unknown locations
        return loc.country !== 'Private Network' && !(loc.lat === 0 && loc.lon === 0 && loc.country === 'Unknown')
      })

      const geolocationData: GeolocationData = {
        locations,
        total_ips: locations.length,
        total_threats: locations.reduce((sum, loc) => sum + loc.threats, 0),
        total_flows: locations.reduce((sum, loc) => sum + loc.flows, 0),
        success: true,
        timestamp: new Date().toISOString()
      }

      setData(geolocationData)
    } catch (err) {
      console.error('Error fetching geolocation data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load geolocation data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter locations based on search and severity
  useEffect(() => {
    if (!data?.locations) return

    const handleFiltering = async () => {
      let filtered = [...data.locations]
      
      // Check if search query is a valid IP address
      if (searchQuery.trim() && isValidIP(searchQuery.trim())) {
        // Search for specific IP using IPWHOIS.io
        const ipLocation = await searchSpecificIP(searchQuery.trim())
        if (ipLocation) {
          // Check if IP already exists in our data
          const existingIndex = filtered.findIndex(loc => loc.ip === ipLocation.ip)
          if (existingIndex >= 0) {
            // Update existing entry with fresh data
            filtered[existingIndex] = { ...filtered[existingIndex], ...ipLocation }
          } else {
            // Add new IP to the beginning of the list
            filtered = [ipLocation, ...filtered]
          }
          // Show only the searched IP
          filtered = filtered.filter(loc => loc.ip === ipLocation.ip)
        }
      } else if (searchQuery.trim()) {
        // Regular text search for country, city, or IP
        filtered = filtered.filter(location => 
          location.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
          location.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
          location.city.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      // Apply severity filter
      if (severityFilter !== "all") {
        filtered = filtered.filter(location => location.severity === severityFilter)
      }

      setFilteredLocations(filtered)
    }

    handleFiltering()
  }, [searchQuery, severityFilter, data?.locations])

  const getThreatLevel = (threats: number) => {
    if (threats >= 10) return { level: "High", color: "text-red-400", bgColor: "bg-red-500/20", borderColor: "border-red-500/30" }
    if (threats >= 5) return { level: "Medium", color: "text-orange-400", bgColor: "bg-orange-500/20", borderColor: "border-orange-500/30" }
    if (threats > 0) return { level: "Low", color: "text-yellow-400", bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500/30" }
    return { level: "Clean", color: "text-green-400", bgColor: "bg-green-500/20", borderColor: "border-green-500/30" }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-red-500 bg-red-500/20 border-red-500/30"
      case "high": return "text-orange-500 bg-orange-500/20 border-orange-500/30"
      case "medium": return "text-yellow-500 bg-yellow-500/20 border-yellow-500/30"
      case "low": return "text-blue-500 bg-blue-500/20 border-blue-500/30"
      default: return "text-gray-500 bg-gray-500/20 border-gray-500/30"
    }
  }

  const topThreatCountries = filteredLocations
    .reduce((acc, location) => {
      const existing = acc.find(item => item.country === location.country)
      if (existing) {
        existing.threats += location.threats
        existing.flows += location.flows
        existing.ips += 1
      } else {
        acc.push({
          country: location.country,
          threats: location.threats,
          flows: location.flows,
          ips: 1
        })
      }
      return acc
    }, [] as Array<{country: string, threats: number, flows: number, ips: number}>)
    .sort((a, b) => b.threats - a.threats)
    .slice(0, 5)

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-black via-purple-950/40 to-gray-950 text-zinc-100 relative">
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      <header className="border-b border-purple-500/20 bg-black/80 backdrop-blur-xl sticky top-0 z-50 relative">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="rounded-md bg-gradient-to-r from-purple-500 to-violet-500 p-1.5 shadow-lg shadow-purple-500/25">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                CyberSense AI
              </h1>
            </Link>

            {/* Centered Navigation */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <nav className="flex items-center gap-6">
                <Link href="/dashboard" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                  Dashboard
                </Link>
                <Link href="/chat" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                  Chat
                </Link>
                <Link href="/alerts" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                  Alerts
                </Link>
                <Link href="/reports" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                  Reports
                </Link>
                <Link href="/visualization" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                  Visualization
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <button className="rounded-full bg-gray-800/50 backdrop-blur-sm p-2 text-zinc-400 hover:bg-gray-700/50 hover:text-zinc-100 border border-purple-500/20">
                <Bell className="h-5 w-5" />
              </button>
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative py-8">
        <div className="relative mx-auto max-w-7xl px-6">
          {/* Breadcrumb Navigation */}
          <div className="mb-6">
            <Link 
              href="/visualization" 
              className="inline-flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Visualizations
            </Link>
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-500/20 p-3 border border-red-400/30 backdrop-blur-sm">
                <MapPin className="h-6 w-6 text-red-300" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Suspicious IP Geolocation</h1>
                <p className="text-lg text-zinc-200 mt-1">Geographic visualization of suspicious IPs from security alerts</p>
              </div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search & Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Search IP or Location</label>
                  <div className="relative">
                    {isSearchingIP ? (
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-purple-400"></div>
                    ) : (
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    )}
                    <Input
                      placeholder="Search by IP address (any IP), country, or city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`pl-10 bg-zinc-800 border-zinc-700 text-white focus:border-purple-400 ${isSearchingIP ? 'opacity-75' : ''}`}
                      disabled={isSearchingIP}
                    />
                  </div>
                  {searchQuery && isValidIP(searchQuery.trim()) && (
                    <p className="text-xs text-purple-400">
                      🌐 IP lookup via IPWHOIS.io
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Severity Filter</label>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="All Severities" />
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
                <div className="flex items-end">
                  <Button
                    onClick={fetchData}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 w-full flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="bg-gray-900/80 border-blue-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Geolocatable IPs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <span className="text-2xl font-bold text-white">{filteredLocations.length}</span>
                  <span className="text-sm text-zinc-400">of {totalSuspiciousIPs}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Public IPs only</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 border-red-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Total Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-2xl font-bold text-white">{filteredLocations.reduce((sum, loc) => sum + (loc.alertCount || 0), 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 border-green-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Unique Ports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-400" />
                  <span className="text-2xl font-bold text-white">{filteredLocations.reduce((sum, loc) => sum + loc.flows, 0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Critical IPs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {filteredLocations.filter(loc => loc.severity === 'critical').length}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Main Map */}
            <div className="xl:col-span-2">
              <Card className="bg-gray-900/80 border-red-400/40 backdrop-blur-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-red-400" />
                        Suspicious IP Global Map
                      </CardTitle>
                      <CardDescription>
                        Real-time geolocation of IPs flagged in security alerts. Click on any point for detailed analysis.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        {loading ? "Loading..." : `${filteredLocations.length} IPs`}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 h-[600px] relative">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400 mx-auto mb-2"></div>
                        <p className="text-zinc-400">Loading suspicious IP locations...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-red-400 mb-2">⚠️ {error}</p>
                        <Button onClick={fetchData} variant="outline" size="sm">
                          Retry
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <GeolocationMap 
                      locations={filteredLocations} 
                      onLocationSelect={(location) => {
                        setSelectedLocation(location)
                        // Automatically show detailed view when clicking on map
                        showIPDetails(location)
                      }}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Map Legend */}
              <Card className="bg-gray-900/80 border-gray-400/40 backdrop-blur-xl mt-4">
                <CardContent className="p-4">
                  <div className="text-sm">
                    <div className="font-medium mb-3 text-gray-300">Severity Legend:</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-white">Critical</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-white">High</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-white">Medium</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-white">Low</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Selected Location Details */}
              {selectedLocation && (
                <Card className="bg-gray-900/80 border-yellow-400/40 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">IP Details</CardTitle>
                    <CardDescription>Selected suspicious IP information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-zinc-400">IP Address</div>
                        <div className="text-white font-mono font-medium">{selectedLocation.ip}</div>
                      </div>
                      <div>
                        <div className="text-sm text-zinc-400">Location</div>
                        <div className="text-white">{selectedLocation.city}, {selectedLocation.country}</div>
                      </div>
                      <div>
                        <div className="text-sm text-zinc-400">Coordinates</div>
                        <div className="text-white font-mono">{selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-sm text-zinc-400">Alerts</div>
                          <div className="text-red-400 font-bold">{selectedLocation.alertCount}</div>
                        </div>
                        <div>
                          <div className="text-sm text-zinc-400">Unique Ports</div>
                          <div className="text-blue-400 font-bold">{selectedLocation.flows}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-zinc-400">Severity Level</div>
                        <Badge className={getSeverityColor(selectedLocation.severity || 'low')}>
                          {selectedLocation.severity?.toUpperCase()}
                        </Badge>
                      </div>
                      {selectedLocation.lastSeen && (
                        <div>
                          <div className="text-sm text-zinc-400">Last Seen</div>
                          <div className="text-white text-sm">{selectedLocation.lastSeen}</div>
                        </div>
                      )}
                      {selectedLocation.region && (
                        <div>
                          <div className="text-sm text-zinc-400">Region</div>
                          <div className="text-white text-sm">{selectedLocation.region}</div>
                        </div>
                      )}
                      {selectedLocation.isp && (
                        <div>
                          <div className="text-sm text-zinc-400">ISP</div>
                          <div className="text-white text-sm">{selectedLocation.isp}</div>
                        </div>
                      )}
                      {selectedLocation.org && (
                        <div>
                          <div className="text-sm text-zinc-400">Organization</div>
                          <div className="text-white text-sm">{selectedLocation.org}</div>
                        </div>
                      )}
                      {selectedLocation.timezone && (
                        <div>
                          <div className="text-sm text-zinc-400">Timezone</div>
                          <div className="text-white text-sm">
                            {typeof selectedLocation.timezone === 'string' 
                              ? selectedLocation.timezone 
                              : selectedLocation.timezone?.id || selectedLocation.timezone?.utc || 'N/A'}
                          </div>
                        </div>
                      )}
                      {selectedLocation.security && (
                        <div>
                          <div className="text-sm text-zinc-400">Security Flags</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedLocation.security.proxy && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Proxy</Badge>
                            )}
                            {selectedLocation.security.vpn && (
                              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">VPN</Badge>
                            )}
                            {selectedLocation.security.tor && (
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">Tor</Badge>
                            )}
                            {selectedLocation.security.hosting && (
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Hosting</Badge>
                            )}
                            {selectedLocation.security.anonymous && (
                              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">Anonymous</Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* View More Details Button */}
                    <div className="mt-4 pt-3 border-t border-zinc-700">
                      <Button
                        onClick={() => showIPDetails(selectedLocation)}
                        disabled={loadingDetails}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 flex items-center gap-2"
                      >
                        {loadingDetails ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Loading Details...
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" />
                            View More Details
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Threat Countries */}
              <Card className="bg-gray-900/80 border-orange-400/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Top Threat Countries</CardTitle>
                  <CardDescription>Countries with highest suspicious activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topThreatCountries.map((country, index) => (
                      <div key={country.country} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50">
                        <div>
                          <div className="text-white font-medium">{country.country}</div>
                          <div className="text-zinc-400 text-sm">{country.ips} IPs</div>
                        </div>
                        <div className="text-right">
                          <div className="text-red-400 font-bold">{country.threats}</div>
                          <div className="text-zinc-400 text-sm">{country.flows} ports</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Severity Distribution */}
              <Card className="bg-gray-900/80 border-violet-400/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Severity Distribution</CardTitle>
                  <CardDescription>Breakdown by threat severity level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Critical Threats</span>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        {filteredLocations.filter(l => l.severity === 'critical').length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">High Threats</span>
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                        {filteredLocations.filter(l => l.severity === 'high').length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Medium Threats</span>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        {filteredLocations.filter(l => l.severity === 'medium').length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Low Threats</span>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {filteredLocations.filter(l => l.severity === 'low').length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Disclaimer */}
      {totalSuspiciousIPs > 0 && (
        <div className="mx-auto max-w-7xl px-6 mb-8">
          <div className="p-3 bg-amber-500/10 border border-amber-400/20 rounded-lg">
            <div className="flex items-center gap-2 text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Total Suspicious IPs Detected: <span className="font-bold">{totalSuspiciousIPs}</span>
              </span>
            </div>
            <p className="text-xs text-amber-300 mt-1">
              • <span className="font-medium">{data?.total_ips || 0}</span> public IPs shown on map (geolocatable)
              • <span className="font-medium">{privateIPCount}</span> private IPs filtered out (192.168.x.x, 10.x.x.x, etc.)
            </p>
          </div>
        </div>
      )}

      {/* Detailed IP Information Modal */}
      <Dialog open={showDetailedView} onOpenChange={setShowDetailedView}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <Globe className="h-6 w-6 text-purple-400" />
              Detailed IP Analysis
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Comprehensive information for {detailedIPData?.ip}
            </DialogDescription>
          </DialogHeader>

          {detailedIPData && (
            <div className="space-y-6 mt-4">
              {/* Basic Information */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-400" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-zinc-400">IP Address</label>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono">{detailedIPData.ip}</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => navigator.clipboard.writeText(detailedIPData.ip)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400">Location</label>
                      <p className="text-white">{detailedIPData.city}, {detailedIPData.region}, {detailedIPData.country}</p>
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400">Coordinates</label>
                      <p className="text-white font-mono">{detailedIPData.latitude}, {detailedIPData.longitude}</p>
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400">Country Code</label>
                      <p className="text-white">{detailedIPData.country_code}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Geographic Details */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Globe className="h-5 w-5 text-green-400" />
                    Geographic Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-zinc-400">Continent</label>
                      <p className="text-white">{detailedIPData.continent} ({detailedIPData.continent_code})</p>
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400">Capital</label>
                      <p className="text-white">{detailedIPData.country_capital}</p>
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400">Phone Code</label>
                      <p className="text-white">{detailedIPData.country_phone}</p>
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400">Timezone</label>
                      <p className="text-white">
                        {typeof detailedIPData.timezone === 'string' 
                          ? detailedIPData.timezone 
                          : detailedIPData.timezone?.id || detailedIPData.timezone?.utc || 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Network Information */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Wifi className="h-5 w-5 text-cyan-400" />
                    Network Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-zinc-400">ISP</label>
                      <p className="text-white">{detailedIPData.isp || detailedIPData.connection?.isp || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400">Organization</label>
                      <p className="text-white">{detailedIPData.org || detailedIPData.connection?.org || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400">ASN</label>
                      <p className="text-white">{detailedIPData.asn || detailedIPData.connection?.asn || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400">Domain</label>
                      <p className="text-white">{detailedIPData.connection?.domain || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Analysis */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-400" />
                    Security Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                      <span className="text-sm text-zinc-400">Proxy</span>
                      <Badge className={detailedIPData.security?.proxy ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"}>
                        {detailedIPData.security?.proxy ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                      <span className="text-sm text-zinc-400">VPN</span>
                      <Badge className={detailedIPData.security?.vpn ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"}>
                        {detailedIPData.security?.vpn ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                      <span className="text-sm text-zinc-400">Tor</span>
                      <Badge className={detailedIPData.security?.tor ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"}>
                        {detailedIPData.security?.tor ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                      <span className="text-sm text-zinc-400">Hosting</span>
                      <Badge className={detailedIPData.security?.hosting ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"}>
                        {detailedIPData.security?.hosting ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                      <span className="text-sm text-zinc-400">Anonymous</span>
                      <Badge className={detailedIPData.security?.anonymous ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"}>
                        {detailedIPData.security?.anonymous ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                      <span className="text-sm text-zinc-400">Bogon</span>
                      <Badge className={detailedIPData.security?.bogon ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"}>
                        {detailedIPData.security?.bogon ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Currency & Language */}
              {(detailedIPData.currency || detailedIPData.languages) && (
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-yellow-400" />
                      Currency & Language
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {detailedIPData.currency && (
                        <div>
                          <label className="text-sm text-zinc-400">Currency</label>
                          <p className="text-white">
                            {typeof detailedIPData.currency === 'string' 
                              ? detailedIPData.currency 
                              : `${detailedIPData.currency?.name || 'N/A'} (${detailedIPData.currency?.code || 'N/A'}) ${detailedIPData.currency?.symbol || ''}`}
                          </p>
                        </div>
                      )}
                      {detailedIPData.languages && (
                        <div>
                          <label className="text-sm text-zinc-400">Languages</label>
                          <p className="text-white">{detailedIPData.languages}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* External Links */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-purple-400" />
                    External Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                      onClick={() => window.open(`https://whatismyipaddress.com/ip/${detailedIPData.ip}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      What Is My IP
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700 text-white border-green-500"
                      onClick={() => window.open(`https://www.virustotal.com/gui/ip-address/${detailedIPData.ip}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      VirusTotal
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
                      onClick={() => window.open(`https://ipwhois.io/ip/${detailedIPData.ip}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      IPWHOIS.io
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-gray-950/90 backdrop-blur-xl py-12 relative mt-16">
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
    </main>
  )
} 