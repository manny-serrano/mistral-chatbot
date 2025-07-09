"use client"

import Link from "next/link"
import { ShieldCheck, Bell, Activity, ArrowLeft, Clock, Grid3X3, TrendingUp, Wifi, Shield } from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"

interface HeatmapDataPoint {
  day?: string
  day_index?: number
  hour?: number
  ip?: string
  port?: number
  region?: string
  x?: number
  y?: number
  value: number
  bytes?: number
  threat_score?: number
}

interface HeatmapData {
  data: HeatmapDataPoint[]
  heatmap_type: string
  success: boolean
  timestamp: string
  error?: string
  debug?: {
    totalFlows: number
    dataRange: any
    dataPoints: number
  }
}

export default function HeatmapVisualizationPage() {
  const [data, setData] = useState<HeatmapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedHeatmapType, setSelectedHeatmapType] = useState("hourly_activity")

  const heatmapTypes = [
    { 
      id: "hourly_activity", 
      name: "Hourly Activity", 
      description: "Network activity patterns by hour and day",
      icon: Clock,
      color: "#3b82f6"
    },
    { 
      id: "ip_port_matrix", 
      name: "IP-Port Matrix", 
      description: "Traffic patterns between IPs and ports",
      icon: Grid3X3,
      color: "#10b981"
    },
    { 
      id: "threat_intensity", 
      name: "Threat Intensity", 
      description: "Security threat levels by network region",
      icon: Shield,
      color: "#ef4444"
    },
    { 
      id: "bandwidth_matrix", 
      name: "Bandwidth Usage", 
      description: "Data transfer patterns by IP and time",
      icon: Wifi,
      color: "#f59e0b"
    },
    { 
      id: "ip_activity", 
      name: "IP Activity", 
      description: "Source IP activity patterns by hour",
      icon: TrendingUp,
      color: "#8b5cf6"
    }
  ]

  const fetchData = async (heatmapType: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/visualization/heatmap?heatmap_type=${heatmapType}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching heatmap data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load heatmap data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(selectedHeatmapType)
  }, [selectedHeatmapType])

  const selectedHeatmapInfo = heatmapTypes.find(h => h.id === selectedHeatmapType)

  const getIntensityColor = (value: number, maxValue: number, type: string = "default") => {
    const intensity = value / maxValue
    if (intensity === 0) return "bg-gray-800"
    
    if (type === "threat") {
      // Red scale for threats
      if (intensity < 0.2) return "bg-green-900"
      if (intensity < 0.4) return "bg-yellow-600"
      if (intensity < 0.6) return "bg-orange-500"
      if (intensity < 0.8) return "bg-red-600"
      return "bg-red-500"
    } else if (type === "bandwidth") {
      // Blue scale for bandwidth
      if (intensity < 0.2) return "bg-blue-900"
      if (intensity < 0.4) return "bg-blue-700"
      if (intensity < 0.6) return "bg-blue-600"
      if (intensity < 0.8) return "bg-blue-500"
      return "bg-blue-400"
    } else {
      // Default green-to-red scale
      if (intensity < 0.2) return "bg-green-900"
      if (intensity < 0.4) return "bg-green-700"
      if (intensity < 0.6) return "bg-yellow-600"
      if (intensity < 0.8) return "bg-orange-500"
      return "bg-red-500"
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const renderHourlyActivityHeatmap = () => {
    if (!data?.data) return null

    // API returns: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const maxValue = Math.max(...data.data.map(d => d.value))

    // Create a matrix for easier lookup
    const dataMatrix: { [key: string]: number } = {}
    data.data.forEach(d => {
      if (d.day_index !== undefined && d.hour !== undefined) {
        dataMatrix[`${d.day_index}-${d.hour}`] = d.value
      }
    })

    return (
      <div className="p-4">
        <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${hours.length}, 25px)` }}>
          {/* Header with hours */}
          <div></div>
          {hours.map(hour => (
            <div key={hour} className="text-xs text-gray-400 text-center">
              {hour.toString().padStart(2, '0')}
            </div>
          ))}
          
          {/* Days and data */}
          {days.map((day, dayIndex) => (
            <div key={day} className="contents">
              <div className="text-xs text-gray-400 pr-2 flex items-center justify-end">
                {day.slice(0, 3)}
              </div>
              {hours.map(hour => {
                const value = dataMatrix[`${dayIndex}-${hour}`] || 0
                return (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className={`w-6 h-6 rounded-sm ${getIntensityColor(value, maxValue)} border border-gray-700 cursor-pointer hover:border-white transition-all`}
                    title={`${day} ${hour}:00 - Flows: ${value.toLocaleString()}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs text-gray-400">Less Active</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-800 border border-gray-600"></div>
            <div className="w-3 h-3 bg-green-900 border border-gray-600"></div>
            <div className="w-3 h-3 bg-green-700 border border-gray-600"></div>
            <div className="w-3 h-3 bg-yellow-600 border border-gray-600"></div>
            <div className="w-3 h-3 bg-orange-500 border border-gray-600"></div>
            <div className="w-3 h-3 bg-red-500 border border-gray-600"></div>
          </div>
          <span className="text-xs text-gray-400">More Active</span>
        </div>
      </div>
    )
  }

  const renderIPActivityHeatmap = () => {
    if (!data?.data) return null

    // Get unique IPs and sort by total activity
    const ipActivity: { [ip: string]: number } = {}
    data.data.forEach(d => {
      if (d.ip) {
        ipActivity[d.ip] = (ipActivity[d.ip] || 0) + d.value
      }
    })

    const topIPs = Object.entries(ipActivity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([ip]) => ip)

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const maxValue = Math.max(...data.data.map(d => d.value))

    // Create matrix for lookup
    const dataMatrix: { [key: string]: number } = {}
    data.data.forEach(d => {
      if (d.ip && d.hour !== undefined) {
        dataMatrix[`${d.ip}-${d.hour}`] = d.value
      }
    })

    return (
      <div className="p-4 overflow-auto">
        <div className="grid gap-1" style={{ gridTemplateColumns: `150px repeat(${hours.length}, 30px)` }}>
          {/* Header with hours */}
          <div></div>
          {hours.map(hour => (
            <div key={hour} className="text-xs text-gray-400 text-center">
              {hour.toString().padStart(2, '0')}
            </div>
          ))}
          
          {/* IPs and data */}
          {topIPs.map(ip => (
            <div key={ip} className="contents">
              <div className="text-xs text-gray-400 pr-2 flex items-center justify-end truncate">
                {ip}
              </div>
              {hours.map(hour => {
                const value = dataMatrix[`${ip}-${hour}`] || 0
                return (
                  <div
                    key={`${ip}-${hour}`}
                    className={`w-7 h-7 rounded-sm ${getIntensityColor(value, maxValue)} border border-gray-700 cursor-pointer hover:border-white transition-all`}
                    title={`${ip} at ${hour}:00 - Flows: ${value.toLocaleString()}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs text-gray-400">Less Active</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-800 border border-gray-600"></div>
            <div className="w-3 h-3 bg-green-900 border border-gray-600"></div>
            <div className="w-3 h-3 bg-green-700 border border-gray-600"></div>
            <div className="w-3 h-3 bg-yellow-600 border border-gray-600"></div>
            <div className="w-3 h-3 bg-orange-500 border border-gray-600"></div>
            <div className="w-3 h-3 bg-red-500 border border-gray-600"></div>
          </div>
          <span className="text-xs text-gray-400">More Active</span>
        </div>
      </div>
    )
  }

  const renderIPPortMatrix = () => {
    if (!data?.data) return null

    // Get unique IPs and ports
    const ips = [...new Set(data.data.map(d => d.ip).filter(Boolean))]
    const ports = [...new Set(data.data.map(d => d.port).filter(Boolean))].sort((a, b) => (a || 0) - (b || 0))
    const maxValue = Math.max(...data.data.map(d => d.value))

    // Create a matrix for easier lookup
    const dataMatrix: { [key: string]: number } = {}
    data.data.forEach(d => {
      if (d.ip && d.port) {
        dataMatrix[`${d.ip}-${d.port}`] = d.value
      }
    })

    return (
      <div className="p-4 overflow-auto">
        <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${Math.min(ports.length, 15)}, 40px)` }}>
          {/* Header with ports */}
          <div></div>
          {ports.slice(0, 15).map(port => (
            <div key={port} className="text-xs text-gray-400 text-center transform -rotate-45 origin-center">
              {port}
            </div>
          ))}
          
          {/* IPs and data */}
          {ips.slice(0, 10).map(ip => (
            <div key={ip} className="contents">
              <div className="text-xs text-gray-400 pr-2 flex items-center justify-end truncate">
                {ip}
              </div>
              {ports.slice(0, 15).map(port => {
                const value = dataMatrix[`${ip}-${port}`] || 0
                return (
                  <div
                    key={`${ip}-${port}`}
                    className={`w-8 h-8 rounded-sm ${getIntensityColor(value, maxValue)} border border-gray-700 cursor-pointer hover:border-white transition-all`}
                    title={`${ip}:${port} - Flows: ${value.toLocaleString()}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs text-gray-400">Less Traffic</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-800 border border-gray-600"></div>
            <div className="w-3 h-3 bg-green-900 border border-gray-600"></div>
            <div className="w-3 h-3 bg-green-700 border border-gray-600"></div>
            <div className="w-3 h-3 bg-yellow-600 border border-gray-600"></div>
            <div className="w-3 h-3 bg-orange-500 border border-gray-600"></div>
            <div className="w-3 h-3 bg-red-500 border border-gray-600"></div>
          </div>
          <span className="text-xs text-gray-400">More Traffic</span>
        </div>
      </div>
    )
  }

  const renderBandwidthMatrix = () => {
    if (!data?.data) return null

    // Get unique IPs and sort by bandwidth
    const ipBandwidth: { [ip: string]: number } = {}
    data.data.forEach(d => {
      if (d.ip) {
        ipBandwidth[d.ip] = (ipBandwidth[d.ip] || 0) + d.value
      }
    })

    const topIPs = Object.entries(ipBandwidth)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([ip]) => ip)

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const maxValue = Math.max(...data.data.map(d => d.value))

    // Create matrix for lookup
    const dataMatrix: { [key: string]: HeatmapDataPoint } = {}
    data.data.forEach(d => {
      if (d.ip && d.hour !== undefined) {
        dataMatrix[`${d.ip}-${d.hour}`] = d
      }
    })

    return (
      <div className="p-4 overflow-auto">
        <div className="grid gap-1" style={{ gridTemplateColumns: `150px repeat(${hours.length}, 35px)` }}>
          {/* Header with hours */}
          <div></div>
          {hours.map(hour => (
            <div key={hour} className="text-xs text-gray-400 text-center">
              {hour.toString().padStart(2, '0')}
            </div>
          ))}
          
          {/* IPs and data */}
          {topIPs.map(ip => (
            <div key={ip} className="contents">
              <div className="text-xs text-gray-400 pr-2 flex items-center justify-end truncate">
                {ip}
              </div>
              {hours.map(hour => {
                const dataPoint = dataMatrix[`${ip}-${hour}`]
                const value = dataPoint?.value || 0
                const bytes = dataPoint?.bytes || 0
                return (
                  <div
                    key={`${ip}-${hour}`}
                    className={`w-8 h-8 rounded-sm ${getIntensityColor(value, maxValue, "bandwidth")} border border-gray-700 cursor-pointer hover:border-white transition-all`}
                    title={`${ip} at ${hour}:00\nBandwidth: ${value} MB\nBytes: ${formatBytes(bytes)}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs text-gray-400">Low Bandwidth</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-800 border border-gray-600"></div>
            <div className="w-3 h-3 bg-blue-900 border border-gray-600"></div>
            <div className="w-3 h-3 bg-blue-700 border border-gray-600"></div>
            <div className="w-3 h-3 bg-blue-600 border border-gray-600"></div>
            <div className="w-3 h-3 bg-blue-500 border border-gray-600"></div>
            <div className="w-3 h-3 bg-blue-400 border border-gray-600"></div>
          </div>
          <span className="text-xs text-gray-400">High Bandwidth</span>
        </div>
      </div>
    )
  }

  const renderThreatIntensityHeatmap = () => {
    if (!data?.data) return null

    const maxValue = Math.max(...data.data.map(d => d.value))
    const regions = data.data.filter(d => d.region)

    return (
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {regions.map(region => (
            <div
              key={region.region}
              className={`p-6 rounded-lg ${getIntensityColor(region.value, maxValue, "threat")} border-2 border-gray-600 cursor-pointer hover:border-white transition-all text-center`}
              title={`${region.region}\nThreat Level: ${region.value}%\nThreat Score: ${(region.threat_score || 0).toFixed(3)}`}
            >
              <div className="text-white font-medium text-sm mb-2">{region.region}</div>
              <div className="text-white text-2xl font-bold">{region.value}%</div>
              <div className="text-white/70 text-xs mt-1">
                Risk: {region.threat_score ? (region.threat_score * 100).toFixed(1) : '0.0'}%
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="text-xs text-gray-400">Low Threat</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-gray-800 border border-gray-600"></div>
            <div className="w-3 h-3 bg-green-900 border border-gray-600"></div>
            <div className="w-3 h-3 bg-yellow-600 border border-gray-600"></div>
            <div className="w-3 h-3 bg-orange-500 border border-gray-600"></div>
            <div className="w-3 h-3 bg-red-600 border border-gray-600"></div>
            <div className="w-3 h-3 bg-red-500 border border-gray-600"></div>
          </div>
          <span className="text-xs text-gray-400">High Threat</span>
        </div>
      </div>
    )
  }

  const renderHeatmap = () => {
    switch (selectedHeatmapType) {
      case "hourly_activity":
        return renderHourlyActivityHeatmap()
      case "ip_activity":
        return renderIPActivityHeatmap()
      case "ip_port_matrix":
        return renderIPPortMatrix()
      case "threat_intensity":
        return renderThreatIntensityHeatmap()
      case "bandwidth_matrix":
        return renderBandwidthMatrix()
      default:
        return <div className="p-4 text-center text-gray-400">Select a heatmap type</div>
    }
  }

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
                LEVANT AI
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
              <div className="rounded-lg bg-amber-500/20 p-3 border border-amber-400/30 backdrop-blur-sm">
                <Activity className="h-6 w-6 text-amber-300" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Heatmap</h1>
                <p className="text-lg text-zinc-200 mt-1">Intensity-based visualizations for pattern recognition</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mb-6">
            <Card className="bg-gray-900/80 border-amber-400/40 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5 text-amber-400" />
                  Heatmap Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {heatmapTypes.map((heatmap) => {
                    const IconComponent = heatmap.icon
                    return (
                      <button
                        key={heatmap.id}
                        onClick={() => setSelectedHeatmapType(heatmap.id)}
                        className={`flex items-start gap-3 p-4 rounded-lg transition-colors text-left ${
                          selectedHeatmapType === heatmap.id
                            ? 'bg-amber-500/20 border border-amber-400/30'
                            : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30'
                        }`}
                      >
                        <IconComponent className="h-5 w-5 mt-0.5" style={{ color: heatmap.color }} />
                        <div>
                          <div className="text-white font-medium">{heatmap.name}</div>
                          <div className="text-zinc-400 text-sm">{heatmap.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Heatmap */}
          <Card className="bg-gray-900/80 border-amber-400/40 backdrop-blur-xl mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-amber-400" />
                    {selectedHeatmapInfo?.name} Heatmap
                  </CardTitle>
                  <CardDescription>
                    {selectedHeatmapInfo?.description} • {data?.data.length || 0} data points
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    {loading ? "Loading..." : "Live Data"}
                  </Badge>
                  <button
                    onClick={() => fetchData(selectedHeatmapType)}
                    disabled={loading}
                    className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 px-3 py-1 rounded border border-amber-500 hover:border-amber-400 transition-colors flex items-center gap-1 text-sm"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="min-h-[400px]">
                {loading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-2"></div>
                      <p className="text-zinc-400">Loading heatmap data...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <p className="text-red-400 mb-2">⚠️ {error}</p>
                      <p className="text-zinc-500 text-sm">Showing fallback data</p>
                    </div>
                  </div>
                ) : data?.data && data.data.length > 0 ? (
                  renderHeatmap()
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <p className="text-zinc-400">No data available for the selected heatmap type</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          {data?.data && data.data.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gray-900/80 border-blue-400/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Data Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{data.data.length}</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-green-400/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Max Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {Math.max(...data.data.map(d => d.value))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Average</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {(data.data.reduce((sum, d) => sum + d.value, 0) / data.data.length).toFixed(1)}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-amber-400/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Intensity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {Math.max(...data.data.map(d => d.value)) > 50 ? "🔥" : "📊"}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 bg-gray-950/90 backdrop-blur-xl py-12 relative mt-16">
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