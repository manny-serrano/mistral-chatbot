"use client"

import Link from "next/link"
import { ShieldCheck, Bell, LineChart, ArrowLeft, Clock, TrendingUp, Activity, BarChart3, Network, AlertTriangle } from "lucide-react"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'

interface TimeSeriesDataPoint {
  timestamp: string
  value: number
  metric: string
  flows?: number
  alert_probability?: number
  unique_ports?: number
  unique_ips?: number
}

interface TimeSeriesData {
  data: TimeSeriesDataPoint[]
  metric: string
  period: string
  granularity: string
  total_points: number
  success: boolean
  timestamp: string
  error?: string
}

export default function TimeSeriesVisualizationPage() {
  const [data, setData] = useState<TimeSeriesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState("bandwidth")
  const [selectedPeriod, setSelectedPeriod] = useState("24h")
  const [selectedGranularity, setSelectedGranularity] = useState("1h")

  const metrics = [
    { id: "bandwidth", name: "Bandwidth Usage", color: "#10b981", icon: Network, description: "Total data transfer between IP addresses" },
    { id: "bandwidth_with_alerts", name: "Bandwidth + Security Alerts", color: "#f59e0b", icon: AlertTriangle, description: "Bandwidth with real-time alert correlation" },
    { id: "alerts", name: "Security Alerts", color: "#ef4444", icon: Activity, description: "Security alerts over time" },
    { id: "flows", name: "Network Flows", color: "#3b82f6", icon: BarChart3, description: "Network flow count over time" },
    { id: "bytes", name: "Bytes Transferred", color: "#06b6d4", icon: LineChart, description: "Total bytes transferred over time" }
  ]

  const periods = [
    { id: "24h", name: "Last 24 Hours", granularities: ["30m", "1h"] },
    { id: "7d", name: "Last 7 Days", granularities: ["1h", "6h", "1d"] },
    { id: "30d", name: "Last 30 Days", granularities: ["1d"] }
  ]

  const fetchData = async (metric: string, period: string, granularity: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        metric,
        period,
        granularity
      })
      
      const response = await fetch(`/api/visualization/time-series?${params}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching time-series data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load time-series data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(selectedMetric, selectedPeriod, selectedGranularity)
  }, [selectedMetric, selectedPeriod, selectedGranularity])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    if (selectedPeriod === "24h") {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } else if (selectedPeriod === "7d") {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`
  }

  const selectedMetricInfo = metrics.find(m => m.id === selectedMetric)
  const selectedPeriodInfo = periods.find(p => p.id === selectedPeriod)
  const isBandwidthMetric = selectedMetric.includes('bandwidth')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/40 to-gray-900 text-zinc-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-purple-500/20 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50 relative">
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
            <nav className="flex items-center gap-6">
              <Link href="/dashboard" className="text-sm font-medium text-zinc-300 hover:text-purple-300 transition-colors">
                Dashboard
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
              <div className="rounded-lg bg-blue-500/20 p-3 border border-blue-400/30 backdrop-blur-sm">
                <LineChart className="h-6 w-6 text-blue-300" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Time-Series Line Chart</h1>
                <p className="text-lg text-zinc-200 mt-1">Network analysis with bandwidth monitoring and security alert correlation</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Metric Selection */}
            <Card className="bg-gray-900/80 border-blue-400/40 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-400" />
                  Metric
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.map((metric) => {
                    const IconComponent = metric.icon
                    return (
                      <button
                        key={metric.id}
                        onClick={() => setSelectedMetric(metric.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors ${
                          selectedMetric === metric.id
                            ? 'bg-blue-500/20 border border-blue-400/30'
                            : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30'
                        }`}
                      >
                        <IconComponent className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: metric.color }} />
                        <div className="text-left">
                          <div className="text-white font-medium">{metric.name}</div>
                          <div className="text-xs text-zinc-400 mt-1">{metric.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Period Selection */}
            <Card className="bg-gray-900/80 border-blue-400/40 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-400" />
                  Time Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {periods.map((period) => (
                    <button
                      key={period.id}
                      onClick={() => {
                        setSelectedPeriod(period.id)
                        setSelectedGranularity(period.granularities[0])
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        selectedPeriod === period.id
                          ? 'bg-blue-500/20 border border-blue-400/30'
                          : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30'
                      }`}
                    >
                      <span className="text-white font-medium">{period.name}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Granularity Selection */}
            <Card className="bg-gray-900/80 border-blue-400/40 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  Granularity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedPeriodInfo?.granularities.map((granularity) => (
                    <button
                      key={granularity}
                      onClick={() => setSelectedGranularity(granularity)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        selectedGranularity === granularity
                          ? 'bg-blue-500/20 border border-blue-400/30'
                          : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30'
                      }`}
                    >
                      <span className="text-white font-medium">{granularity}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chart */}
          <Card className="bg-gray-900/80 border-blue-400/40 backdrop-blur-xl mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-blue-400" />
                    {selectedMetricInfo?.name} Over Time
                  </CardTitle>
                  <CardDescription>
                    {selectedPeriodInfo?.name} • {selectedGranularity} intervals • {data?.total_points || 0} data points
                    {selectedMetric === 'bandwidth_with_alerts' && (
                      <span className="ml-2 text-amber-400">• Real-time threat correlation</span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {loading ? "Loading..." : "Live Data"}
                  </Badge>
                  <button
                    onClick={() => fetchData(selectedMetric, selectedPeriod, selectedGranularity)}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-3 py-1 rounded border border-blue-500 hover:border-blue-400 transition-colors flex items-center gap-1 text-sm"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-96 p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
                      <p className="text-zinc-400">Loading {isBandwidthMetric ? 'bandwidth' : 'time-series'} data...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-red-400 mb-2">⚠️ {error}</p>
                      <p className="text-zinc-500 text-sm">Showing fallback data</p>
                    </div>
                  </div>
                ) : data?.data && data.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {selectedMetric === 'bandwidth_with_alerts' ? (
                      <AreaChart data={data.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="timestamp" 
                          stroke="#9ca3af"
                          fontSize={12}
                          tickFormatter={formatTimestamp}
                        />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1f2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#f9fafb'
                          }}
                          labelFormatter={(label) => `Time: ${formatTimestamp(label)}`}
                          formatter={(value: any, name: string) => {
                            if (name === 'Bandwidth') return [formatBytes(value), 'Bandwidth']
                            if (name === 'Alert Probability') return [`${(value * 100).toFixed(2)}%`, 'Alert Risk']
                            return [value, name]
                          }}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#10b981"
                          fill="rgba(16, 185, 129, 0.1)"
                          strokeWidth={2}
                          name="Bandwidth"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="alert_probability" 
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ fill: "#f59e0b", strokeWidth: 2, r: 3 }}
                          name="Alert Probability"
                        />
                      </AreaChart>
                    ) : (
                      <RechartsLineChart data={data.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="timestamp" 
                          stroke="#9ca3af"
                          fontSize={12}
                          tickFormatter={formatTimestamp}
                        />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1f2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#f9fafb'
                          }}
                          labelFormatter={(label) => `Time: ${formatTimestamp(label)}`}
                          formatter={(value: any, name: string) => {
                            if (isBandwidthMetric && name === selectedMetricInfo?.name) {
                              return [formatBytes(value), selectedMetricInfo?.name]
                            }
                            return [value, selectedMetricInfo?.name]
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={selectedMetricInfo?.color || "#3b82f6"}
                          strokeWidth={2}
                          dot={{ fill: selectedMetricInfo?.color || "#3b82f6", strokeWidth: 2, r: 4 }}
                          name={selectedMetricInfo?.name}
                        />
                      </RechartsLineChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-zinc-400">No data available for the selected period</p>
                      <p className="text-zinc-500 text-sm mt-2">Try adjusting the time period or metric selection</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          {data?.data && data.data.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gray-900/80 border-green-400/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Total Data Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{data.total_points}</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-blue-400/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">
                    {isBandwidthMetric ? 'Average Bandwidth' : 'Average Value'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {isBandwidthMetric ? 
                      formatBytes(data.data.reduce((sum, d) => sum + d.value, 0) / data.data.length) :
                      (data.data.reduce((sum, d) => sum + d.value, 0) / data.data.length).toFixed(1)
                    }
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-purple-400/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">
                    {isBandwidthMetric ? 'Peak Bandwidth' : 'Peak Value'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {isBandwidthMetric ? 
                      formatBytes(Math.max(...data.data.map(d => d.value))) :
                      Math.max(...data.data.map(d => d.value))
                    }
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/80 border-amber-400/40 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">
                    {selectedMetric === 'bandwidth_with_alerts' ? 'Max Alert Risk' : 'Trend'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {selectedMetric === 'bandwidth_with_alerts' ? 
                      `${(Math.max(...data.data.map(d => d.alert_probability || 0)) * 100).toFixed(1)}%` :
                      (data.data.length > 1 && data.data[data.data.length - 1].value > data.data[0].value ? "📈" : "📉")
                    }
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